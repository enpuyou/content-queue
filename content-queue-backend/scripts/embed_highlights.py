#!/usr/bin/env python3
"""
Generate embeddings for all highlights that don't have them yet.

Usage:
    python scripts/embed_highlights.py

This script will:
1. Find all users in the database
2. For each user, queue a Celery task to batch-embed their highlights
3. The task will only embed highlights that don't already have embeddings

Make sure Celery worker is running:
    celery -A app.core.celery_app worker --loglevel=info
"""

import sys
from pathlib import Path

# Add parent directory to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.user import User
from app.tasks.embedding import generate_highlight_embeddings_batch


def main():
    db = SessionLocal()

    try:
        # Get all users
        users = db.query(User).all()

        if not users:
            print("No users found in database")
            return

        print(f"Found {len(users)} user(s)")

        for user in users:
            print(f"\nQueueing highlight embeddings for user: {user.email} ({user.id})")

            # Queue the Celery task
            task = generate_highlight_embeddings_batch.delay(str(user.id))
            print(f"  Task ID: {task.id}")

        print("\n✓ All embedding tasks queued successfully!")
        print("\nCheck Celery worker logs to see progress.")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
