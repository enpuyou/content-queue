from celery import Task
from sqlalchemy.orm import Session
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.content import ContentItem
from app.tasks.embedding import generate_embedding
from app.tasks.tagging import generate_tags
from uuid import UUID
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import logging
import trafilatura

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
        item = (
            self.db.query(ContentItem)
            .filter(ContentItem.id == UUID(content_item_id))
            .first()
        )
        if not item:
            logger.error(f"Content item {content_item_id} not found")
            return

        # Update status to processing
        item.processing_status = "processing"
        self.db.commit()

        logger.info(f"Extracting metadata for {item.original_url}")

        # Fetch the URL
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(item.original_url, headers=headers, timeout=10)
        response.raise_for_status()

        # Parse HTML
        soup = BeautifulSoup(response.content, "html.parser")

        # Extract metadata
        metadata = extract_page_metadata(soup, item.original_url)

        # Update item
        item.title = metadata.get("title")
        item.description = metadata.get("description")
        item.thumbnail_url = metadata.get("thumbnail")
        item.content_type = metadata.get("content_type", "article")
        item.processing_status = "completed"
        item.processing_error = None

        self.db.commit()
        logger.info(f"Successfully extracted metadata for {item.original_url}")

        # Trigger full-text extraction for articles
        if item.content_type == "article":
            extract_full_content.delay(content_item_id)

        return {
            "content_item_id": content_item_id,
            "title": item.title,
            "status": "completed",
        }

    except requests.RequestException as e:
        # Network error - retry
        logger.warning(f"Request failed for {content_item_id}: {str(e)}")
        item.processing_status = "failed"
        item.processing_error = f"Request error: {str(e)}"
        self.db.commit()

        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2**self.request.retries))

    except Exception as e:
        # Other error - mark as failed
        logger.error(f"Failed to extract metadata for {content_item_id}: {str(e)}")
        item.processing_status = "failed"
        item.processing_error = str(e)
        self.db.commit()
        return {"content_item_id": content_item_id, "status": "failed", "error": str(e)}


def clean_html_tree(soup: BeautifulSoup):
    """
    Clean the HTML tree before passing to Trafilatura.
    Removes noise, comments, and fixes structure that might confuse specific extractors.
    """
    if not soup:
        return

    # 1. Remove Comments
    comment_selectors = [
        "#comments",
        ".comments-area",
        "div[class*='comments-area']",
        ".comment-list",
        "[data-test-id='comment-list']",
        ".comments-section",
        "div[id^='comments']",
    ]
    for selector in comment_selectors:
        for match in soup.select(selector):
            match.decompose()

    # 2. Remove Specific Noise Phrases (Sidebars, CTAs)
    noise_phrases = [
        "Reading Progress",
        "On This Page",
        "Schedule a Mock Interview",
        "Mark as read",
        "Your account is free and you can post anonymously",
    ]

    for phrase in noise_phrases:
        # Find identifying strings
        matches = list(soup.find_all(string=lambda t: t and phrase in t))
        for text_node in matches:
            if not text_node.parent:
                continue  # Already removed

            # Walk up to find the container to remove
            curr = text_node.parent
            depth = 0
            while curr and depth < 5:
                if curr.name in ["body", "html", "main", "article"]:
                    break

                # If we hit a block level container, remove it
                if curr.name in ["div", "section", "aside", "nav"]:
                    # Safely remove
                    curr.decompose()
                    break

                curr = curr.parent
                depth += 1

    # 3. Convert Material UI Typography to <p>
    # Trafilatura handles <p> tags better than <div> for link-heavy content
    for div in soup.select("div.MuiTypography-body1"):
        div.name = "p"


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
        item = (
            self.db.query(ContentItem)
            .filter(ContentItem.id == UUID(content_item_id))
            .first()
        )
        if not item:
            logger.error(f"Content item {content_item_id} not found")
            return

        # Set fallback title if metadata extraction failed
        if not item.title:
            item.title = extract_domain_from_url(item.original_url)

        logger.info(f"Extracting full content for {item.original_url}")

        # Fetch the URL (again, but cached by browser/CDN usually)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
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
            return {
                "content_item_id": content_item_id,
                "status": "failed",
                "error": str(e),
            }

        # Extract article HTML using trafilatura (preserves formatting)
        downloaded = response.content

        # PRE-PROCESSING: Clean HTML tree
        # Parse with BS to remove noise before extraction
        try:
            # Trafilatura handles bytes/string. BS handles bytes best.
            soup = BeautifulSoup(downloaded, "html.parser")
            clean_html_tree(soup)
            cleaned_html = str(soup)
            downloaded = cleaned_html  # Use cleaned HTML for extraction
        except Exception as e:
            logger.warning(f"Error during HTML pre-cleaning: {e}")
            # If cleaning fails, proceed with original content

        # First try: Extract as HTML with formatting
        xml_content = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=True,
            include_images=True,
            include_links=True,
            output_format="xml",  # XML preserves structure better than plain HTML
            no_fallback=False,
        )

        # Convert XML to clean HTML, passing original HTML to preserve header hierarchy
        if xml_content:
            logger.debug(f"Extracted XML, length: {len(xml_content)}")
            html_text = xml_to_html(xml_content, original_html=downloaded)
            logger.debug(
                f"Converted to HTML, length: {len(html_text) if html_text else 0}"
            )
        else:
            html_text = None

        # If XML extraction produced nothing or very little, try plain text
        if not html_text or len(html_text.strip()) < 100:
            logger.info(
                f"XML extraction insufficient, falling back to plain text for {item.original_url}"
            )
            plain_text = trafilatura.extract(
                downloaded, include_comments=False, no_fallback=False
            )
            if plain_text:
                # Convert plain text to HTML paragraphs
                logger.debug(f"Plain text extracted: {len(plain_text)} chars")
                html_text = text_to_html_paragraphs(plain_text)

        if (
            html_text and len(html_text.strip()) > 100
        ):  # Only save if we got substantial text
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
            logger.info(
                f"Successfully extracted {item.word_count} words from {item.original_url}"
            )

            # Trigger embedding generation
            generate_embedding.delay(content_item_id)

            # Chain tagging after embedding is generated
            # (tagging task will be triggered after embedding completes)
            generate_tags.delay(content_item_id)

            return {
                "content_item_id": content_item_id,
                "word_count": item.word_count,
                "reading_time": item.reading_time_minutes,
                "status": "completed",
            }
        else:
            logger.warning(f"No substantial text extracted from {item.original_url}")
            item.processing_error = "Could not extract article text"
            self.db.commit()
            return {
                "content_item_id": content_item_id,
                "status": "no_text",
                "message": "Could not extract article text",
            }

    except Exception as e:
        logger.warning(
            f"Failed to extract full content for {content_item_id}: {str(e)}"
        )
        # Graceful degradation: keep the item, mark error
        if item:
            item.processing_error = f"Extraction error: {str(e)[:200]}"
            self.db.commit()
        # Don't retry errors for full content extraction (metadata already succeeded)
        return {"content_item_id": content_item_id, "status": "failed", "error": str(e)}


def xml_to_html(xml_content: str, original_html: bytes = None) -> str:
    """
    Convert trafilatura XML output to clean HTML, preserving original header hierarchy.

    EXTRACTION PRINCIPLES:
    1. IGNORE: Navigation, headers, footers, sidebars - anything NOT in main content
    2. PRESERVE: All main content including:
       - Full paragraphs with inline links, emphasis, and formatting
       - Images with captions
       - Lists (ordered and unordered)
       - Code blocks and quotes
    3. FILTER DUPLICATES:
       - Skip page title if it appears as a header in content
       - Skip meta description if it appears as first paragraph
    4. NORMALIZE HEADERS:
       - Remove title-matching headers
       - Map remaining headers to H2-H4 range (max 3 levels)
       - Preserve relative hierarchy
    5. SKIP NAVIGATION:
       - Filter keywords: search, menu, sign in, login, get premium, subscribe, toggle, ⌘
       - Skip very short headers (<3 chars)
       - Skip headers before first substantial paragraph (100+ chars)
    """
    from bs4 import BeautifulSoup as BS

    try:
        soup = BS(xml_content, "xml")

        # Find the main content node
        main = soup.find("main") or soup

        # Extract original header hierarchy and images from source HTML if available
        original_header_map = {}
        original_images = []
        if original_html:
            try:
                original_soup = BS(original_html, "html.parser")

                # Extract headers
                for h in original_soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
                    text = h.get_text(strip=True).lower()
                    level = int(h.name[1])  # Extract number from h1, h2, etc.
                    # Store normalized text -> original level mapping
                    # Use first occurrence if duplicates exist
                    if text and len(text) > 3 and text not in original_header_map:
                        original_header_map[text] = level

                logger.debug(
                    f"Extracted {len(original_header_map)} headers and {len(original_images)} images from original HTML"
                )
            except Exception as e:
                logger.warning(f"Could not extract original header hierarchy: {e}")

        # Convert XML tags to HTML
        html_parts = []

        # Determine which hierarchy source to use
        use_original_hierarchy = len(original_header_map) > 0

        if use_original_hierarchy:
            # Calculate normalization offset from original headers
            all_levels = list(original_header_map.values())
            min_level = min(all_levels) if all_levels else 2
            offset = min_level - 2  # Shift so smallest becomes H2
            logger.info(
                f"Using original HTML hierarchy: {len(original_header_map)} headers, min_level={min_level}, offset={offset}"
            )
        else:
            # Fallback: Analyze XML rend attributes
            header_levels = []
            for h in main.find_all("head"):
                rend = h.get("rend", "")
                if rend.startswith("h") and rend[1:].isdigit():
                    header_levels.append(int(rend[1:]))

            offset = 0
            if header_levels:
                min_level = min(header_levels)
                offset = min_level - 2
                logger.info(
                    f"Using XML rend hierarchy: {len(header_levels)} headers, min_level={min_level}, offset={offset}"
                )
            else:
                logger.warning("No header hierarchy found in XML, defaulting all to H2")

        # Get page title and description to filter out duplicates
        page_title = None
        page_title_words = set()
        page_description = None
        if original_html:
            try:
                title_soup = BS(original_html, "html.parser")

                # Get title
                title_tag = title_soup.find("title")
                if title_tag:
                    page_title = title_tag.get_text(strip=True).lower()
                    # Extract significant words from title (>4 chars)
                    page_title_words = {w for w in page_title.split() if len(w) > 4}

                # Get description (og:description or meta description)
                desc_tag = title_soup.find(
                    "meta", property="og:description"
                ) or title_soup.find("meta", attrs={"name": "description"})
                if desc_tag and desc_tag.get("content"):
                    page_description = desc_tag["content"].strip().lower()

                # Extract context for images to re-insert them if missing
                # We do this AFTER title extraction so we can use title_soup
                for img in title_soup.find_all("img"):
                    src = img.get("src", "")
                    alt = img.get("alt", "")

                    # Skip icons/logos
                    width = img.get("width", "")
                    if width and width.isdigit() and int(width) < 50:
                        continue
                    if src and any(
                        x in src.lower()
                        for x in [
                            "icon",
                            "logo",
                            "avatar",
                            "badge",
                            "facebook",
                            "twitter",
                            "linkedin",
                        ]
                    ):
                        continue

                    # Get surrounding text context
                    # 1. Try to find previous substantial text block
                    prev_context = ""
                    curr = img.parent
                    search_steps = 0
                    while curr and search_steps < 5:
                        prev = curr.find_previous_sibling()
                        if prev:
                            text = prev.get_text(strip=True)
                            if len(text) > 50:
                                prev_context = text[-100:]  # Last 100 chars
                                break
                            curr = prev
                        else:
                            curr = curr.parent
                            search_steps += 1

                    # 2. Try to find next substantial text block
                    next_context = ""
                    curr = img.parent
                    search_steps = 0
                    while curr and search_steps < 5:
                        next_node = curr.find_next_sibling()
                        if next_node:
                            text = next_node.get_text(strip=True)
                            if len(text) > 50:
                                next_context = text[:100]  # First 100 chars
                                break
                            curr = next_node
                        else:
                            curr = curr.parent
                            search_steps += 1

                    # Get caption
                    caption = ""
                    parent = img.parent
                    if parent and parent.name == "figure":
                        figcaption = parent.find("figcaption")
                        if figcaption:
                            caption = figcaption.get_text(strip=True)

                    if prev_context or next_context:
                        original_images.append(
                            {
                                "src": src,
                                "alt": alt,
                                "caption": caption,
                                "prev_context": prev_context,
                                "next_context": next_context,
                                "inserted": False,
                            }
                        )

            except Exception as e:
                logger.warning(f"Error analyzing original HTML: {e}")
                pass

        # First pass: collect headers and filter title duplicates
        headers_to_process = []
        for elem in main.find_all(recursive=False):
            text = elem.get_text(strip=True)
            if not text or len(text) < 3:
                continue

            is_header = False
            text_lower = text.lower()

            # Check if this element should be treated as a header
            if elem.name == "head":
                is_header = True
            elif elem.name == "p" and use_original_hierarchy:
                # If we have the original hierarchy, allow paragraphs that match known headers
                if text_lower in original_header_map:
                    is_header = True

            if not is_header:
                continue

            # Skip navigation keywords
            nav_keywords = [
                "search",
                "menu",
                "sign in",
                "log in",
                "login",
                "get premium",
                "subscribe",
                "navigation",
                "skip to",
                "toggle",
                "⌘",
            ]
            if any(keyword in text_lower for keyword in nav_keywords):
                continue

            # Skip if this header matches the page title
            if page_title and (
                text_lower in page_title
                or page_title in text_lower
                or
                # Check if header contains significant title words
                any(word in text_lower for word in page_title_words)
            ):
                logger.debug(f"Skipping title-matching header: '{text[:40]}...'")
                continue

            # Get level
            normalized_text = text_lower

            if use_original_hierarchy and normalized_text in original_header_map:
                raw_level = original_header_map[normalized_text]
            else:
                # Fallback for explicit <head> tags
                rend = elem.get("rend", "h2")
                raw_level = 2
                if rend.startswith("h") and rend[1:].isdigit():
                    raw_level = int(rend[1:])

            headers_to_process.append((elem, text, raw_level))

        # Renormalize header levels after filtering
        # Find min level and map to H2-H4 range
        if headers_to_process:
            min_header_level = min(h[2] for h in headers_to_process)
            max_header_level = max(h[2] for h in headers_to_process)
            level_range = max_header_level - min_header_level + 1

            # Adjust offset to start at H2
            new_offset = min_header_level - 2

            # If more than 3 levels, collapse
            if level_range > 3:
                logger.info(f"Collapsing {level_range} header levels to 3")
                header_level_map = {}
                for _, _, raw_level in headers_to_process:
                    if raw_level not in header_level_map:
                        # Map to 2, 3, or 4
                        new_level = 2 + min(2, len(header_level_map))
                        header_level_map[raw_level] = new_level
            else:
                # Simple offset mapping
                header_level_map = {
                    raw_level: raw_level - new_offset
                    for raw_level in range(min_header_level, max_header_level + 1)
                }

        # Second pass: output content with normalized headers AND re-insert images
        header_index = 0

        # Helper to formatting image HTML
        def format_image_html(img_data):
            caption_html = ""
            if img_data.get("caption"):
                caption_html = (
                    f'<figcaption style="text-align:center; font-size:0.9em; '
                    f'color:var(--color-text-muted); margin-top:0.5em; font-style:italic;">'
                    f"{img_data['caption']}</figcaption>"
                )

            return (
                f'<figure style="margin:1.5em 0; text-align:center;">'
                f'<img src="{img_data["src"]}" alt="{img_data.get("alt", "")}" '
                f'style="max-width:100%; height:auto; border-radius:4px;"/>'
                f"{caption_html}"
                f"</figure>"
            )

        for elem in main.find_all(recursive=False):
            # CHECK FOR IMAGES BEFORE ELEMENT (based on prev_context matches)
            # This is tricky because we process element by element.
            # Best place is typically AFTER a paragraph that matches prev_context
            pass

            # PRIORITY HEADER CHECK
            header_match_data = None
            if header_index < len(headers_to_process):
                stored_elem, stored_text, raw_level = headers_to_process[header_index]
                if stored_elem == elem:
                    header_match_data = (stored_elem, stored_text, raw_level)

            if header_match_data:
                stored_elem, stored_text, raw_level = header_match_data

                # Use the pre-computed normalized level
                new_level = header_level_map.get(raw_level, 2)
                # Clamp to H2-H4
                new_level = max(2, min(4, new_level))

                # Check for images before header (using next_context match on header text)
                for img in original_images:
                    if not img["inserted"] and img["next_context"]:
                        clean_next = img["next_context"].replace("\n", " ").strip()[:50]
                        clean_header = stored_text.replace("\n", " ").strip()

                        if len(clean_next) > 10 and clean_next in clean_header:
                            html_parts.append(format_image_html(img))
                            img["inserted"] = True

                html_parts.append(f"<h{new_level}>{stored_text}</h{new_level}>")
                header_index += 1
                continue

            if elem.name == "p":
                # Preserve inline elements (links, emphasis) within paragraphs
                # Recursively process all inline elements
                def process_inline_elements(element):
                    """Recursively process inline elements to preserve structure"""
                    result = []
                    for child in element.children:
                        if isinstance(child, str):
                            # Plain text - preserve spacing
                            text = str(child)
                            if text.strip():
                                result.append(text)
                        elif child.name == "ref":
                            # Link (trafilatura uses <ref> for links)
                            link_text = child.get_text(
                                strip=False
                            )  # Preserve internal spacing
                            link_href = child.get("target", "#")
                            result.append(f'<a href="{link_href}">{link_text}</a>')
                        elif child.name == "hi":
                            # Highlighted/emphasized text - may contain nested elements
                            hi_text = child.get_text(strip=False)
                            rend = child.get("rend", "")
                            if rend in ["#b", "b"]:
                                result.append(f"<strong>{hi_text}</strong>")
                            elif rend in ["#i", "i"]:
                                result.append(f"<em>{hi_text}</em>")
                            else:
                                result.append(hi_text)
                        else:
                            # Recursively handle nested elements
                            result.extend(process_inline_elements(child))
                    return result

                p_html_parts = process_inline_elements(elem)
                paragraph_html = "".join(p_html_parts).strip()
                paragraph_text_pure = elem.get_text(strip=True)

                if paragraph_html:
                    # Skip if this paragraph matches the meta description
                    if page_description:
                        # Remove HTML tags for comparison
                        para_text = (
                            BS(f"<p>{paragraph_html}</p>", "html.parser")
                            .get_text()
                            .lower()
                        )
                        if (
                            para_text == page_description
                            or page_description in para_text
                        ):
                            logger.debug(
                                f"Skipping description paragraph: '{paragraph_html[:40]}...'"
                            )

                            continue

                    # CHECK FOR IMAGES matched by NEXT context (should be inserted BEFORE this paragraph)
                    for img in original_images:
                        if not img["inserted"] and img["next_context"]:
                            # Fuzzy match: check if first 50 chars of context match start of paragraph
                            clean_next = (
                                img["next_context"].replace("\n", " ").strip()[:50]
                            )
                            clean_para = paragraph_text_pure.replace("\n", " ").strip()

                            if len(clean_next) > 20 and clean_next in clean_para:
                                html_parts.append(format_image_html(img))
                                img["inserted"] = True
                                logger.info(
                                    f"Re-inserted image (before match) {img['src'][:30]}..."
                                )

                    html_parts.append(f"<p>{paragraph_html}</p>")

                    # CHECK FOR IMAGES matched by PREV context (should be inserted AFTER this paragraph)
                    for img in original_images:
                        if not img["inserted"] and img["prev_context"]:
                            # Fuzzy match: check if last 50 chars of context match end of paragraph
                            clean_prev = (
                                img["prev_context"].replace("\n", " ").strip()[-50:]
                            )
                            clean_para = paragraph_text_pure.replace("\n", " ").strip()

                            if len(clean_prev) > 20 and clean_prev in clean_para:
                                html_parts.append(format_image_html(img))
                                img["inserted"] = True
                                logger.info(
                                    f"Re-inserted image (after match) {img['src'][:30]}..."
                                )

            elif elem.name == "list":
                items = elem.find_all("item")
                if items:
                    list_type = elem.get("type", "")
                    list_rend = elem.get("rend", "")
                    is_ordered = (
                        list_type == "ordered" or "ordered" in list_rend.lower()
                    )
                    list_tag = "ol" if is_ordered else "ul"
                    html_parts.append(f"<{list_tag}>")
                    for item in items:
                        text = item.get_text(strip=True)
                        if text:
                            html_parts.append(f"<li>{text}</li>")
                    html_parts.append(f"</{list_tag}>")

            elif elem.name == "quote":
                text = elem.get_text(strip=True)
                if text:
                    html_parts.append(f"<blockquote>{text}</blockquote>")

            elif elem.name == "graphic":
                # Existing successful trafilatura extraction
                src = elem.get("src")
                alt = elem.get("alt", "")

                if src:
                    # Mark as inserted if we found it in original_images to avoid dupe
                    for img in original_images:
                        if img["src"] == src:
                            img["inserted"] = True

                    caption = ""
                    next_elem = elem.find_next_sibling()
                    if (
                        next_elem
                        and next_elem.name in ["p", "hi"]
                        and len(next_elem.get_text(strip=True)) < 200
                    ):
                        caption_text = next_elem.get_text(strip=True)
                        if caption_text:
                            caption = caption_text

                    html_parts.append(
                        format_image_html({"src": src, "alt": alt, "caption": caption})
                    )

        if html_parts:
            # Add any remaining images at the end if they haven't been inserted
            # (Use sparingly or maybe only if strict criteria met, otherwise we might dump footer images)
            return "\n".join(html_parts)
        else:
            logger.warning("No structured elements found in XML, converting all text")
            text = soup.get_text(strip=False)
            return text_to_html_paragraphs(text)

    except Exception as e:
        logger.warning(f"XML to HTML conversion failed: {str(e)}")
        # Fallback: try to extract any text and convert to paragraphs
        try:
            soup = BS(xml_content, "xml")
            text = soup.get_text(strip=False)
            if text:
                return text_to_html_paragraphs(text)
        except Exception as e:
            logger.warning("Failed to extract full text")
            pass
        return text_to_html_paragraphs(xml_content)


def text_to_html_paragraphs(text: str) -> str:
    """Convert plain text to HTML with paragraph breaks"""
    paragraphs = text.split("\n\n")
    html_parts = []

    for para in paragraphs:
        para = para.strip()
        if para:
            # Replace single line breaks with <br>
            para = para.replace("\n", "<br>")
            html_parts.append(f"<p>{para}</p>")

    return "\n".join(html_parts)


def extract_domain_from_url(url: str) -> str:
    """Extract domain name for fallback title"""
    domain = urlparse(url).netloc
    return domain.replace("www.", "").capitalize()


def extract_page_metadata(soup: BeautifulSoup, url: str) -> dict:
    """
    Extract metadata from HTML using Open Graph tags and fallbacks.
    """
    metadata = {}

    # Title
    # Priority: og:title > twitter:title > <title> tag
    og_title = soup.find("meta", property="og:title")
    twitter_title = soup.find("meta", attrs={"name": "twitter:title"})
    title_tag = soup.find("title")

    if og_title and og_title.get("content"):
        metadata["title"] = og_title["content"]
    elif twitter_title and twitter_title.get("content"):
        metadata["title"] = twitter_title["content"]
    elif title_tag and title_tag.string:
        metadata["title"] = title_tag.string.strip()
    else:
        metadata["title"] = url  # Fallback to URL

    # Description
    og_desc = soup.find("meta", property="og:description")
    twitter_desc = soup.find("meta", attrs={"name": "twitter:description"})
    meta_desc = soup.find("meta", attrs={"name": "description"})

    if og_desc and og_desc.get("content"):
        metadata["description"] = og_desc["content"]
    elif twitter_desc and twitter_desc.get("content"):
        metadata["description"] = twitter_desc["content"]
    elif meta_desc and meta_desc.get("content"):
        metadata["description"] = meta_desc["content"]

    # Thumbnail/Image
    og_image = soup.find("meta", property="og:image")
    twitter_image = soup.find("meta", attrs={"name": "twitter:image"})

    if og_image and og_image.get("content"):
        metadata["thumbnail"] = og_image["content"]
    elif twitter_image and twitter_image.get("content"):
        metadata["thumbnail"] = twitter_image["content"]

    # Content type (basic detection)
    domain = urlparse(url).netloc.lower()
    if "youtube.com" in domain or "youtu.be" in domain:
        metadata["content_type"] = "video"
    elif url.endswith(".pdf"):
        metadata["content_type"] = "pdf"
    else:
        metadata["content_type"] = "article"

    return metadata
