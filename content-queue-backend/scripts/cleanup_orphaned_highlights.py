#!/usr/bin/env python3
"""
Clean up highlights that belong to deleted articles.

Usage:
    python scripts/cleanup_orphaned_highlights.py [--dry-run]

This script will:
1. Find all highlights where the parent content_item has deleted_at IS NOT NULL
2. Delete those highlights (or just count them if --dry-run)

NOTE: This is a one-time cleanup script for existing orphaned highlights.
In production, the Celery task 'cleanup_old_deleted_items' runs daily and
automatically hard-deletes articles (and their highlights via CASCADE) that
have been soft-deleted for more than 7 days.
"""

import sys
from pathlib import Path
import argparse

# Add parent directory to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.highlight import Highlight
from app.models.content import ContentItem


def main():
    parser = argparse.ArgumentParser(description="Clean up orphaned highlights")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without actually deleting",
    )
    args = parser.parse_args()

    db = SessionLocal()

    try:
        # Find highlights from deleted articles
        orphaned_highlights = (
            db.query(Highlight)
            .join(ContentItem, Highlight.content_item_id == ContentItem.id)
            .filter(ContentItem.deleted_at.isnot(None))
            .all()
        )

        if not orphaned_highlights:
            print("✓ No orphaned highlights found. Database is clean!")
            return 0

        count = len(orphaned_highlights)
        print(f"\nFound {count} orphaned highlight(s) from deleted articles:")

        # Show sample
        for i, highlight in enumerate(orphaned_highlights[:5]):
            print(f'  - {highlight.id}: "{highlight.text[:50]}..."')

        if count > 5:
            print(f"  ... and {count - 5} more")

        if args.dry_run:
            print(
                "\n[DRY RUN] Would delete these highlights (use without --dry-run to actually delete)"
            )
            return 0

        # Delete orphaned highlights
        for highlight in orphaned_highlights:
            db.delete(highlight)

        db.commit()
        print(f"\n✓ Deleted {count} orphaned highlight(s)")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}", file=sys.stderr)
        return 1
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
