from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.list import content_list_membership
from app.models.user import User
from app.models.content import ContentItem
from app.schemas.content import (
    ContentItemCreate,
    ContentItemResponse,
    ContentItemUpdate,
    ContentItemList,
    ContentItemDetail,
)
from app.tasks.extraction import extract_metadata
from app.tasks.summarization import generate_summary


def compute_reading_status(
    is_read: bool, read_position: float | None, is_archived: bool
) -> str:
    """
    Compute reading status based on read flags and position.

    - 'archived': if item is archived
    - 'read': if is_read flag is True OR read_position >= 0.9
    - 'in_progress': if read_position > 0 and < 0.9
    - 'unread': if read_position is 0 or None
    """
    if is_archived:
        return "archived"
    if is_read or (read_position and read_position >= 0.9):
        return "read"
    if read_position and read_position > 0:
        return "in_progress"
    return "unread"


def update_reading_patterns(user: User, item: ContentItem) -> None:
    """
    Update user's reading patterns based on completed article.
    Tracks: average reading time, preferred tags.
    """
    if not user.reading_patterns:
        user.reading_patterns = {}

    # Track reading time
    if item.reading_time_minutes:
        if "readings" not in user.reading_patterns:
            user.reading_patterns["readings"] = []
        user.reading_patterns["readings"].append(item.reading_time_minutes)

        # Keep only last 20 readings for rolling average
        if len(user.reading_patterns["readings"]) > 20:
            user.reading_patterns["readings"] = user.reading_patterns["readings"][-20:]

        # Calculate average reading time
        avg = sum(user.reading_patterns["readings"]) / len(
            user.reading_patterns["readings"]
        )
        user.reading_patterns["avg_reading_time"] = round(avg, 1)

    # Track preferred tags
    if item.tags:
        if "preferred_tags" not in user.reading_patterns:
            user.reading_patterns["preferred_tags"] = []
        for tag in item.tags:
            if tag not in user.reading_patterns["preferred_tags"]:
                user.reading_patterns["preferred_tags"].append(tag)


router = APIRouter(prefix="/content", tags=["content"])


@router.post(
    "", response_model=ContentItemResponse, status_code=status.HTTP_201_CREATED
)
async def create_content_item(
    request: Request,
    item_data: ContentItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Save a new link/article.

    - Creates content item with status 'pending'
    - Trigger background job to extract metadata/full text
    - Optionally adds to specified lists
    """
    # Create content item
    new_item = ContentItem(
        user_id=current_user.id,
        original_url=item_data.url,
        submitted_via="web",
        processing_status="pending",
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    # Add to lists if specified
    if item_data.list_ids:
        for list_id in item_data.list_ids:
            # Verify list exists and belongs to user
            from app.models.list import List

            list_obj = (
                db.query(List)
                .filter(List.id == list_id, List.owner_id == current_user.id)
                .first()
            )

            if list_obj:
                stmt = content_list_membership.insert().values(
                    content_item_id=new_item.id,
                    list_id=list_id,
                    added_by=current_user.id,
                )
                db.execute(stmt)
        db.commit()

    # Trigger background job for metadata extraction
    extract_metadata.delay(str(new_item.id))

    return new_item


@router.get("", response_model=ContentItemList)
def list_content_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    is_read: bool | None = None,
    is_archived: bool | None = None,
    tag: str | None = Query(None),  # Filter by tag
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    List all content items for current user.

    - Supports pagination (skip/limit)
    - Filter by read/archived status
    - Filter by tag
    - Excludes soft-deleted items
    """
    # Base query: user's items that aren't deleted
    query = db.query(ContentItem).filter(
        ContentItem.user_id == current_user.id, ContentItem.deleted_at.is_(None)
    )

    # Apply filters
    if is_read is not None:
        query = query.filter(ContentItem.is_read == is_read)
    if is_archived is not None:
        query = query.filter(ContentItem.is_archived == is_archived)
    if tag is not None:
        query = query.filter(ContentItem.tags.contains([tag]))

    # Get total count
    total = query.count()

    # Get paginated items
    items = (
        query.order_by(ContentItem.created_at.desc()).offset(skip).limit(limit).all()
    )

    return {"items": items, "total": total, "skip": skip, "limit": limit}


# IMPORTANT: Specific literal paths MUST come before generic /{item_id} routes
# Otherwise FastAPI will try to parse "recommended", "tags" etc. as UUIDs


@router.get("/tags", response_model=list)
def get_user_tags(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get all unique tags for the current user with occurrence counts.
    Returns list of (tag, count) tuples, sorted by frequency.
    """
    from sqlalchemy import func

    tag_counts = (
        db.query(
            func.unnest(ContentItem.tags).label("tag"),
            func.count("*").label("count"),
        )
        .filter(
            ContentItem.user_id == current_user.id,
            ContentItem.deleted_at.is_(None),
        )
        .group_by("tag")
        .order_by(func.count("*").desc())
        .all()
    )

    return [{"tag": tag, "count": count} for tag, count in tag_counts]


@router.get("/recommended", response_model=ContentItemList)
def get_recommended_content(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    mood: str | None = Query(None),  # "quick_read", "deep_dive", "light"
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get recommended content items for the user.

    Scoring factors (no ML):
    - Embedding similarity to recently read articles
    - Reading time match (based on user's patterns)
    - Recency (newer articles scored higher with decay)
    - Tag overlap with user's preferred tags
    """
    from datetime import timedelta, timezone

    now = datetime.now(timezone.utc)

    # Get recently read articles (last 7 days)
    seven_days_ago = now - timedelta(days=7)
    recent_reads = (
        db.query(ContentItem)
        .filter(
            ContentItem.user_id == current_user.id,
            ContentItem.is_read,
            ContentItem.read_at >= seven_days_ago,
            ContentItem.embedding.isnot(None),
        )
        .all()
    )

    # Get unread content
    unread = (
        db.query(ContentItem)
        .filter(
            ContentItem.user_id == current_user.id,
            ContentItem.is_read.is_(False),
            ContentItem.deleted_at.is_(None),
        )
        .all()
    )

    if not unread:
        return {"items": [], "total": 0, "skip": skip, "limit": limit}

    # Score each unread item
    scored_items = []

    for item in unread:
        score = 0

        # Factor 1: Embedding similarity (if we have recent reads)
        if recent_reads and item.embedding is not None:
            similarities = []
            for recent in recent_reads:
                if recent.embedding is None:
                    continue
                # Cosine similarity using pure Python
                a = list(item.embedding)
                b = list(recent.embedding)
                dot = sum(x * y for x, y in zip(a, b))
                norm_a = sum(x * x for x in a) ** 0.5
                norm_b = sum(x * x for x in b) ** 0.5
                if norm_a > 0 and norm_b > 0:
                    similarity = dot / (norm_a * norm_b)
                    similarities.append(similarity)
            if similarities:
                score += max(similarities) * 30  # Max similarity score: 30 points

        # Factor 2: Recency (newer is better)
        days_old = (now - item.created_at).days
        recency_score = max(0, 20 - (days_old / 10))  # Decay over 200 days
        score += recency_score

        # Factor 3: Tag overlap with user's preferred tags
        if (
            current_user.reading_patterns
            and "preferred_tags" in current_user.reading_patterns
        ):
            preferred = set(current_user.reading_patterns["preferred_tags"])
            item_tags = set(item.tags or [])
            overlap = len(preferred & item_tags)
            score += overlap * 10

        # Factor 4: Reading time match (if user has patterns)
        if (
            current_user.reading_patterns
            and "avg_reading_time" in current_user.reading_patterns
            and item.reading_time_minutes
        ):
            user_avg = current_user.reading_patterns["avg_reading_time"]
            time_diff = abs(item.reading_time_minutes - user_avg)
            time_match = max(0, 15 - time_diff / 2)  # Penalty for big time differences
            score += time_match

        # Apply mood filter
        if mood:
            if (
                mood == "quick_read"
                and item.reading_time_minutes
                and item.reading_time_minutes > 10
            ):
                continue  # Skip long articles
            elif (
                mood == "deep_dive"
                and item.reading_time_minutes
                and item.reading_time_minutes < 10
            ):
                continue  # Skip short articles
            elif mood == "light" and item.word_count and item.word_count > 5000:
                continue  # Skip very long articles

        scored_items.append((item, score))

    # Sort by score (highest first)
    scored_items.sort(key=lambda x: x[1], reverse=True)

    # Paginate
    total = len(scored_items)
    items = [item for item, _ in scored_items[skip : skip + limit]]

    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/{item_id}", response_model=ContentItemResponse)
def get_content_item(
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get a specific content item.

    - Only returns if item belongs to current user
    - Returns 404 if not found or deleted
    """
    item = (
        db.query(ContentItem)
        .filter(
            ContentItem.id == item_id,
            ContentItem.user_id == current_user.id,
            ContentItem.deleted_at.is_(None),
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    return item


@router.get("/{item_id}/full", response_model=ContentItemDetail)
def get_content_item_full(
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get a content item with full text.

    - Returns complete article content
    - Use this for reading view
    """
    item = (
        db.query(ContentItem)
        .filter(
            ContentItem.id == item_id,
            ContentItem.user_id == current_user.id,
            ContentItem.deleted_at.is_(None),
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    return item


@router.patch("/{item_id}", response_model=ContentItemResponse)
async def update_content_item(
    item_id: UUID,
    update_data: ContentItemUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Update a content item.

    - Can mark as read/unread
    - Can archive/unarchive
    """
    # Find item
    item = (
        db.query(ContentItem)
        .filter(
            ContentItem.id == item_id,
            ContentItem.user_id == current_user.id,
            ContentItem.deleted_at.is_(None),
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    # Update fields
    if update_data.is_read is not None:
        item.is_read = update_data.is_read
        if update_data.is_read:
            item.read_at = datetime.utcnow()
            item.read_position = 0.0
            # Update user's reading patterns when manually marked as read
            update_reading_patterns(current_user, item)
        else:
            item.read_at = None
            item.read_position = 0.0

    if update_data.is_archived is not None:
        item.is_archived = update_data.is_archived

    if update_data.read_position is not None:
        item.read_position = update_data.read_position
        # Auto-mark as read if scrolled to near the end
        if item.read_position >= 0.9 and not item.is_read:
            item.is_read = True
            item.read_at = datetime.utcnow()
            # Update reading patterns when auto-marked as read
            update_reading_patterns(current_user, item)

    if update_data.tags is not None:
        item.tags = update_data.tags

    if update_data.full_text is not None:
        item.full_text = update_data.full_text

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_content_item(
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Soft delete a content item.

    - Sets deleted_at timestamp
    - Item won't appear in lists anymore
    - Can be restored later (if we build that feature)
    """
    item = (
        db.query(ContentItem)
        .filter(
            ContentItem.id == item_id,
            ContentItem.user_id == current_user.id,
            ContentItem.deleted_at.is_(None),
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    # Soft delete
    item.deleted_at = datetime.utcnow()
    db.commit()

    return None


@router.post(
    "/{item_id}/summary", response_model=dict, status_code=status.HTTP_202_ACCEPTED
)
def generate_content_summary(
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Trigger summary generation for a content item.
    """
    item = (
        db.query(ContentItem)
        .filter(
            ContentItem.id == item_id,
            ContentItem.user_id == current_user.id,
            ContentItem.deleted_at.is_(None),
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    # Trigger task
    generate_summary.delay(str(item.id))

    return {"status": "processing"}


@router.post("/{item_id}/tags/accept", status_code=status.HTTP_200_OK)
def accept_auto_tags(
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Accept auto-generated tags for an item.
    Copies auto_tags → tags.
    """
    item = (
        db.query(ContentItem)
        .filter(
            ContentItem.id == item_id,
            ContentItem.user_id == current_user.id,
            ContentItem.deleted_at.is_(None),
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    if item.auto_tags:
        item.tags = item.auto_tags
        db.commit()

    return {"status": "accepted", "tags": item.tags}


@router.post("/{item_id}/tags/dismiss", status_code=status.HTTP_200_OK)
def dismiss_auto_tags(
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Dismiss auto-generated tags for an item.
    Clears auto_tags, keeps user's tags unchanged.
    """
    item = (
        db.query(ContentItem)
        .filter(
            ContentItem.id == item_id,
            ContentItem.user_id == current_user.id,
            ContentItem.deleted_at.is_(None),
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    item.auto_tags = []
    db.commit()

    return {"status": "dismissed", "tags": item.tags}
