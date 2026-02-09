"""
Management script to backfill existing highlights with embeddings.

Usage: python -m app.management.backfill_highlight_embeddings [user_id]

If user_id is provided, backfills only for that user.
Otherwise, backfills for all users.
"""

import logging
import sys
from uuid import UUID
from app.core.database import SessionLocal
from app.models.highlight import Highlight
from app.models.user import User
from app.tasks.embedding import generate_highlight_embeddings_batch

logger = logging.getLogger(__name__)


def backfill_highlight_embeddings(user_id: str | None = None):
    """
    Backfill existing highlights with embeddings using Celery task.

    Args:
        user_id: Optional specific user UUID. If None, backfills all users.
    """
    db = SessionLocal()

    try:
        if user_id:
            # Backfill for specific user
            user = db.query(User).filter(User.id == UUID(user_id)).first()
            if not user:
                logger.error(f"User {user_id} not found")
                return False

            logger.info(f"Starting backfill for user {user.email}")
            result = generate_highlight_embeddings_batch.delay(str(user.id))
            logger.info(f"Celery task queued: {result.id}")
            return True

        else:
            # Backfill for all users
            users = db.query(User).filter(User.is_active).all()
            logger.info(f"Starting backfill for {len(users)} active users")

            for user in users:
                highlights_without_embedding = (
                    db.query(Highlight)
                    .filter(
                        Highlight.user_id == user.id,
                        Highlight.embedding.is_(None),
                    )
                    .count()
                )

                if highlights_without_embedding > 0:
                    logger.info(
                        f"Queuing {highlights_without_embedding} highlights for user {user.email}"
                    )
                    generate_highlight_embeddings_batch.delay(str(user.id))

            logger.info("All users queued for embedding backfill")
            return True

    except Exception as e:
        logger.error(f"Backfill failed: {str(e)}")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    user_id = sys.argv[1] if len(sys.argv) > 1 else None
    success = backfill_highlight_embeddings(user_id)
    sys.exit(0 if success else 1)
