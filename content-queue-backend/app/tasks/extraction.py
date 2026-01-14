from celery import Task
from sqlalchemy.orm import Session
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.content import ContentItem
from app.tasks.embedding import generate_embedding
from uuid import UUID
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import logging
import trafilatura
from datetime import datetime

logger = logging.getLogger(__name__)

class DatabaseTask(Task):
    """
    Base task that provides a database session.
    Automatically closes session after task completes.
    """
    _db: Session = None

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()

    @property
    def db(self) -> Session:
        if self._db is None:
            self._db = SessionLocal()
        return self._db


@celery_app.task(base=DatabaseTask, bind=True, max_retries=3)
def extract_metadata(self, content_item_id: str):
    """
    Extract metadata from a URL.

    - Fetches the URL
    - Parses HTML to extract title, description, thumbnail
    - Updates content item in database
    """
    try:
        # Get content item from database
        item = self.db.query(ContentItem).filter(ContentItem.id == UUID(content_item_id)).first()
        if not item:
            logger.error(f"Content item {content_item_id} not found")
            return

        # Update status to processing
        item.processing_status = "processing"
        self.db.commit()

        logger.info(f"Extracting metadata for {item.original_url}")

        # Fetch the URL
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(item.original_url, headers=headers, timeout=10)
        response.raise_for_status()

        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')

        # Extract metadata
        metadata = extract_page_metadata(soup, item.original_url)

        # Update item
        item.title = metadata.get('title')
        item.description = metadata.get('description')
        item.thumbnail_url = metadata.get('thumbnail')
        item.content_type = metadata.get('content_type', 'article')
        item.processing_status = "completed"
        item.processing_error = None

        self.db.commit()
        logger.info(f"Successfully extracted metadata for {item.original_url}")

        # Trigger full-text extraction for articles
        if item.content_type == 'article':
            extract_full_content.delay(content_item_id)

        return {
            "content_item_id": content_item_id,
            "title": item.title,
            "status": "completed"
        }

    except requests.RequestException as e:
        # Network error - retry
        logger.warning(f"Request failed for {content_item_id}: {str(e)}")
        item.processing_status = "failed"
        item.processing_error = f"Request error: {str(e)}"
        self.db.commit()

        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))

    except Exception as e:
        # Other error - mark as failed
        logger.error(f"Failed to extract metadata for {content_item_id}: {str(e)}")
        item.processing_status = "failed"
        item.processing_error = str(e)
        self.db.commit()
        return {"content_item_id": content_item_id, "status": "failed", "error": str(e)}


@celery_app.task(base=DatabaseTask, bind=True, max_retries=2)
def extract_full_content(self, content_item_id: str):
    """
    Extract full article text from a URL with HTML formatting.

    - Uses trafilatura to extract HTML with formatting preserved
    - Calculates word count and reading time
    - Includes timeout and error handling
    - Updates content item in database
    """
    # TODO: Update content extraction to return HTML instead of plain text
    # - Use newspaper3k's .article_html or trafilatura's output_format='html'
    # - This will preserve formatting, links, and structure
    # - Frontend currently uses formatTextToHtml() as a workaround

    try:
        # Get content item from database
        item = self.db.query(ContentItem).filter(ContentItem.id == UUID(content_item_id)).first()
        if not item:
            logger.error(f"Content item {content_item_id} not found")
            return

        # Set fallback title if metadata extraction failed
        if not item.title:
            item.title = extract_domain_from_url(item.original_url)

        logger.info(f"Extracting full content for {item.original_url}")

        # Fetch the URL (again, but cached by browser/CDN usually)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        try:
            response = requests.get(item.original_url, headers=headers, timeout=30)
            response.raise_for_status()
        except requests.Timeout:
            logger.warning(f"Timeout fetching {item.original_url}")
            item.processing_error = "Request timed out"
            self.db.commit()
            return {"content_item_id": content_item_id, "status": "timeout"}
        except requests.RequestException as e:
            logger.warning(f"Request failed for {content_item_id}: {str(e)}")
            item.processing_error = f"Request error: {str(e)[:200]}"
            self.db.commit()
            return {"content_item_id": content_item_id, "status": "failed", "error": str(e)}

        # Extract article HTML using trafilatura (preserves formatting)
        downloaded = response.content

        # First try: Extract as HTML with formatting
        xml_content = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=True,
            include_images=True,
            include_links=True,
            output_format='xml',  # XML preserves structure better than plain HTML
            no_fallback=False
        )

        # Convert XML to clean HTML
        if xml_content:
            logger.debug(f"Extracted XML, length: {len(xml_content)}")
            html_text = xml_to_html(xml_content)
            logger.debug(f"Converted to HTML, length: {len(html_text) if html_text else 0}")
        else:
            html_text = None

        # If XML extraction produced nothing or very little, try plain text
        if not html_text or len(html_text.strip()) < 100:
            logger.info(f"XML extraction insufficient, falling back to plain text for {item.original_url}")
            plain_text = trafilatura.extract(
                downloaded,
                include_comments=False,
                no_fallback=False
            )
            if plain_text:
                # Convert plain text to HTML paragraphs
                logger.debug(f"Plain text extracted: {len(plain_text)} chars")
                html_text = text_to_html_paragraphs(plain_text)

        if html_text and len(html_text.strip()) > 100:  # Only save if we got substantial text
            item.full_text = html_text

            # Calculate word count (strip HTML tags for accurate count)
            from bs4 import BeautifulSoup as BS
            plain_text = BS(html_text, "html.parser").get_text()
            words = plain_text.split()
            item.word_count = len(words)

            # Calculate reading time (average 200 words per minute)
            item.reading_time_minutes = max(1, round(len(words) / 200))

            # Clear any previous errors
            item.processing_error = None

            self.db.commit()
            logger.info(f"Successfully extracted {item.word_count} words from {item.original_url}")

            # Trigger embedding generation
            generate_embedding.delay(content_item_id)

            return {
                "content_item_id": content_item_id,
                "word_count": item.word_count,
                "reading_time": item.reading_time_minutes,
                "status": "completed"
            }
        else:
            logger.warning(f"No substantial text extracted from {item.original_url}")
            item.processing_error = "Could not extract article text"
            self.db.commit()
            return {
                "content_item_id": content_item_id,
                "status": "no_text",
                "message": "Could not extract article text"
            }

    except Exception as e:
        logger.warning(f"Failed to extract full content for {content_item_id}: {str(e)}")
        # Graceful degradation: keep the item, mark error
        if item:
            item.processing_error = f"Extraction error: {str(e)[:200]}"
            self.db.commit()
        # Don't retry errors for full content extraction (metadata already succeeded)
        return {"content_item_id": content_item_id, "status": "failed", "error": str(e)}


def xml_to_html(xml_content: str) -> str:
    """Convert trafilatura XML output to clean HTML"""
    from bs4 import BeautifulSoup as BS

    try:
        soup = BS(xml_content, 'xml')

        # Find the main content node
        main = soup.find('main') or soup

        # Convert XML tags to HTML
        html_parts = []

        for elem in main.find_all(recursive=False):
            if elem.name == 'p':
                text = elem.get_text(strip=True)
                if text:
                    html_parts.append(f"<p>{text}</p>")
            elif elem.name == 'head':
                text = elem.get_text(strip=True)
                if text:
                    # Determine heading level based on attributes or default to h2
                    html_parts.append(f"<h2>{text}</h2>")
            elif elem.name == 'list':
                items = elem.find_all('item')
                if items:
                    html_parts.append("<ul>")
                    for item in items:
                        text = item.get_text(strip=True)
                        if text:
                            html_parts.append(f"<li>{text}</li>")
                    html_parts.append("</ul>")
            elif elem.name == 'quote':
                text = elem.get_text(strip=True)
                if text:
                    html_parts.append(f"<blockquote>{text}</blockquote>")
            elif elem.name == 'graphic':
                src = elem.get('src')
                alt = elem.get('alt', '')
                if src:
                    html_parts.append(f'<img src="{src}" alt="{alt}" style="max-width:100%; height:auto;"/>')
                # TODO: Improve Image Handling

        if html_parts:
            return '\n'.join(html_parts)
        else:
            # If no elements found, just get all text and convert to paragraphs
            logger.warning("No structured elements found in XML, converting all text")
            text = soup.get_text(strip=False)
            return text_to_html_paragraphs(text)

    except Exception as e:
        logger.warning(f"XML to HTML conversion failed: {str(e)}")
        # Fallback: try to extract any text and convert to paragraphs
        try:
            soup = BS(xml_content, 'xml')
            text = soup.get_text(strip=False)
            if text:
                return text_to_html_paragraphs(text)
        except:
            pass
        return text_to_html_paragraphs(xml_content)


def text_to_html_paragraphs(text: str) -> str:
    """Convert plain text to HTML with paragraph breaks"""
    paragraphs = text.split('\n\n')
    html_parts = []

    for para in paragraphs:
        para = para.strip()
        if para:
            # Replace single line breaks with <br>
            para = para.replace('\n', '<br>')
            html_parts.append(f"<p>{para}</p>")

    return '\n'.join(html_parts)


def extract_domain_from_url(url: str) -> str:
    """Extract domain name for fallback title"""
    domain = urlparse(url).netloc
    return domain.replace('www.', '').capitalize()


def extract_page_metadata(soup: BeautifulSoup, url: str) -> dict:
    """
    Extract metadata from HTML using Open Graph tags and fallbacks.
    """
    metadata = {}

    # Title
    # Priority: og:title > twitter:title > <title> tag
    og_title = soup.find('meta', property='og:title')
    twitter_title = soup.find('meta', attrs={'name': 'twitter:title'})
    title_tag = soup.find('title')

    if og_title and og_title.get('content'):
        metadata['title'] = og_title['content']
    elif twitter_title and twitter_title.get('content'):
        metadata['title'] = twitter_title['content']
    elif title_tag and title_tag.string:
        metadata['title'] = title_tag.string.strip()
    else:
        metadata['title'] = url  # Fallback to URL

    # Description
    og_desc = soup.find('meta', property='og:description')
    twitter_desc = soup.find('meta', attrs={'name': 'twitter:description'})
    meta_desc = soup.find('meta', attrs={'name': 'description'})

    if og_desc and og_desc.get('content'):
        metadata['description'] = og_desc['content']
    elif twitter_desc and twitter_desc.get('content'):
        metadata['description'] = twitter_desc['content']
    elif meta_desc and meta_desc.get('content'):
        metadata['description'] = meta_desc['content']

    # Thumbnail/Image
    og_image = soup.find('meta', property='og:image')
    twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})

    if og_image and og_image.get('content'):
        metadata['thumbnail'] = og_image['content']
    elif twitter_image and twitter_image.get('content'):
        metadata['thumbnail'] = twitter_image['content']

    # Content type (basic detection)
    domain = urlparse(url).netloc.lower()
    if 'youtube.com' in domain or 'youtu.be' in domain:
        metadata['content_type'] = 'video'
    elif url.endswith('.pdf'):
        metadata['content_type'] = 'pdf'
    else:
        metadata['content_type'] = 'article'

    return metadata
