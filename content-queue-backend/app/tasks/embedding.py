from celery import Task
from sqlalchemy.orm import Session
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.content import ContentItem
from app.core.config import settings
from uuid import UUID
import logging
from openai import OpenAI

logger = logging.getLogger(__name__)

class DatabaseTask(Task):
    """Base task with database session"""
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
def generate_embedding(self, content_item_id: str):
    """
    Generate embedding for content item using OpenAI.

    - Uses text-embedding-3-small model (1536 dimensions)
    - Combines title + description + full_text
    - Stores embedding in pgvector column
    """
    try:
        # Get content item
        item = self.db.query(ContentItem).filter(ContentItem.id == UUID(content_item_id)).first()
        if not item:
            logger.error(f"Content item {content_item_id} not found")
            return

        # Check if we have text to embed
        if not item.full_text and not item.description:
            logger.warning(f"No text to embed for {content_item_id}")
            return {"content_item_id": content_item_id, "status": "no_text"}

        logger.info(f"Generating embedding for {item.original_url}")

        # Prepare text for embedding
        # Combine title, description, and full text (truncate if too long)
        text_parts = []
        if item.title:
            text_parts.append(item.title)
        if item.description:
            text_parts.append(item.description)
        if item.full_text:
            # Truncate full text to ~8000 tokens (~6000 words)
            # OpenAI's limit is 8191 tokens for text-embedding-3-small
            words = item.full_text.split()
            if len(words) > 6000:
                truncated_text = ' '.join(words[:6000])
                text_parts.append(truncated_text)
            else:
                text_parts.append(item.full_text)

        text_to_embed = '\n\n'.join(text_parts)

        # Generate embedding using OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text_to_embed,
            encoding_format="float"
        )

        # Extract embedding vector
        embedding = response.data[0].embedding

        # Store in database
        item.embedding = embedding
        self.db.commit()

        logger.info(f"Successfully generated embedding for {item.original_url} (dimension: {len(embedding)})")

        return {
            "content_item_id": content_item_id,
            "embedding_dimension": len(embedding),
            "status": "completed"
        }

    except Exception as e:
        logger.error(f"Failed to generate embedding for {content_item_id}: {str(e)}")

        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))

        return {"content_item_id": content_item_id, "status": "failed", "error": str(e)}
