from celery import Task
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.content import ContentItem
from app.core.config import settings
from uuid import UUID
import logging
from openai import OpenAI
import json
import re

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
def generate_tags(self, content_item_id: str):
    """
    Auto-generate tags for a content item using hybrid approach.

    1. First pass (free): Check embedding similarity to tagged articles
    2. Second pass (cheap LLM): Call Haiku if no good matches found
    """
    try:
        # Get content item
        item = (
            self.db.query(ContentItem)
            .filter(ContentItem.id == UUID(content_item_id))
            .first()
        )
        if not item:
            logger.error(f"Content item {content_item_id} not found")
            return

        # Skip if no embedding available
        if item.embedding is None:
            logger.warning(f"No embedding for {content_item_id}")
            return {"content_item_id": content_item_id, "status": "no_embedding"}

        logger.info(f"Generating tags for {item.original_url}")

        # PASS 1: Embedding-based similarity (free)
        suggested_tags = find_similar_tags_by_embedding(self.db, item)

        if suggested_tags and should_accept_tags(suggested_tags):
            item.auto_tags = suggested_tags
            item.tags = suggested_tags  # Auto-accept if high confidence
            item.processing_status = "completed"
            self.db.commit()
            logger.info(f"Auto-tagged {item.original_url} with {suggested_tags}")
            return {
                "content_item_id": content_item_id,
                "tags": suggested_tags,
                "source": "embedding_similarity",
                "status": "completed",
            }

        # PASS 2: LLM-based tagging (cheap with gpt-4o-mini)
        user_vocabulary = get_user_tag_vocabulary(self.db, item.user_id)
        llm_tags = generate_tags_with_llm(
            item.title, item.description, item.full_text, user_vocabulary
        )

        if llm_tags:
            item.auto_tags = llm_tags
            item.tags = llm_tags  # Auto-accept from LLM
            item.processing_status = "completed"
            self.db.commit()
            logger.info(f"LLM-tagged {item.original_url} with {llm_tags}")
            return {
                "content_item_id": content_item_id,
                "tags": llm_tags,
                "source": "llm_tagging",
                "status": "completed",
            }

        # No tags generated, but processing is done
        item.processing_status = "completed"
        self.db.commit()
        return {
            "content_item_id": content_item_id,
            "status": "completed",
            "message": "No tags generated",
        }

    except Exception as e:
        logger.error(f"Failed to generate tags for {content_item_id}: {str(e)}")
        # Ensure we don't get stuck in processing
        try:
            # re-query item to avoid detached instance issues if session closed?
            # But self.db is session.
            item = (
                self.db.query(ContentItem)
                .filter(ContentItem.id == UUID(content_item_id))
                .first()
            )
            if item:
                item.processing_status = "completed"
                # Optional: item.processing_error = f"Tagging error: {str(e)}"
                self.db.commit()
        except Exception as db_e:
            logger.error(f"Failed to update status on tagging error: {db_e}")

        return {"content_item_id": content_item_id, "status": "failed", "error": str(e)}


def find_similar_tags_by_embedding(db: Session, item: ContentItem) -> list:
    """
    Find similar articles already tagged, suggest their tags.
    Uses pgvector similarity search.
    """
    # Find 3 most similar articles with tags
    similar_items = (
        db.query(ContentItem)
        .filter(
            and_(
                ContentItem.user_id == item.user_id,
                ContentItem.id != item.id,
                ContentItem.tags.isnot(None),
                ContentItem.embedding.isnot(None),
            )
        )
        .order_by(ContentItem.embedding.op("<->")(item.embedding))
        .limit(3)
        .all()
    )

    if not similar_items:
        return []

    # Collect tags from similar articles
    tag_counts = {}
    for similar_item in similar_items:
        if similar_item.tags:
            for tag in similar_item.tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

    # Return most frequent tags (max 3-5)
    sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
    return [tag for tag, _ in sorted_tags[:5]]


def should_accept_tags(tags: list) -> bool:
    """Heuristic: accept tags if we found good matches"""
    return len(tags) >= 2  # Accept if we found 2+ tags


def get_user_tag_vocabulary(db: Session, user_id: UUID) -> list:
    """Get all unique tags user has ever created"""
    existing_tags = (
        db.query(func.unnest(ContentItem.tags))
        .filter(ContentItem.user_id == user_id)
        .distinct()
        .all()
    )
    return [tag[0] for tag in existing_tags if tag[0]]


def generate_tags_with_llm(
    title: str, description: str, full_text: str, user_vocabulary: list
) -> list:
    """Call OpenAI (gpt-4o-mini) to generate tags."""
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # Prepare context from article
    text_parts = [title, description]
    if full_text:
        # Use first 500 words only
        words = full_text.split()[:500]
        text_parts.append(" ".join(words))

    article_context = "\n\n".join(t for t in text_parts if t)

    prompt = f"""Analyze this article and suggest 3-5 relevant tags.

User's existing tags: {", ".join(user_vocabulary) if user_vocabulary else "None yet"}

Article:
{article_context}

Return ONLY a JSON list of tags (strings). Example: ["Technology", "AI", "Opinion"]
Reuse the user's existing tags when relevant."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )

        # Parse tags from response
        content = response.choices[0].message.content
        # Try to extract JSON list
        try:
            # Handle potential wrapper object if model outputs {"tags": [...]}
            data = json.loads(content)
            if isinstance(data, list):
                tags = data
            elif isinstance(data, dict):
                # Look for list values
                tags = next((v for v in data.values() if isinstance(v, list)), [])
            else:
                tags = []

            return [str(tag)[:100] for tag in tags[:5]]  # Limit tag length
        except json.JSONDecodeError:
            # If JSON parsing fails, extract quoted strings
            matches = re.findall(r'"([^"]+)"', content)
            if matches:
                return matches[:5]

        return []

    except Exception as e:
        logger.error(f"LLM tagging failed: {str(e)}")
        return []
