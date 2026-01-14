from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
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
    ContentItemDetail
)
from app.tasks.extraction import extract_metadata


router = APIRouter(prefix="/content", tags=["content"])

@router.post("", response_model=ContentItemResponse, status_code=status.HTTP_201_CREATED)
async def create_content_item(
    request: Request,
    item_data: ContentItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
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
        processing_status="pending"
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

     # Add to lists if specified
    if item_data.list_ids:
        for list_id in item_data.list_ids:
            # Verify list exists and belongs to user
            from app.models.list import List
            list_obj = db.query(List).filter(
                List.id == list_id,
                List.owner_id == current_user.id
            ).first()

            if list_obj:
                stmt = content_list_membership.insert().values(
                    content_item_id=new_item.id,
                    list_id=list_id,
                    added_by=current_user.id
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
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all content items for current user.

    - Supports pagination (skip/limit)
    - Filter by read/archived status
    - Excludes soft-deleted items
    """
    # Base query: user's items that aren't deleted
    query = db.query(ContentItem).filter(
        ContentItem.user_id == current_user.id,
        ContentItem.deleted_at.is_(None)
    )

    # Apply filters
    if is_read is not None:
        query = query.filter(ContentItem.is_read == is_read)
    if is_archived is not None:
        query = query.filter(ContentItem.is_archived == is_archived)

    # Get total count
    total = query.count()

    # Get paginated items
    items = query.order_by(ContentItem.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{item_id}", response_model=ContentItemResponse)
def get_content_item(
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific content item.

    - Only returns if item belongs to current user
    - Returns 404 if not found or deleted
    """
    item = db.query(ContentItem).filter(
        ContentItem.id == item_id,
        ContentItem.user_id == current_user.id,
        ContentItem.deleted_at.is_(None)
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found"
        )

    return item

@router.get("/{item_id}/full", response_model=ContentItemDetail)
def get_content_item_full(
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a content item with full text.

    - Returns complete article content
    - Use this for reading view
    """
    item = db.query(ContentItem).filter(
        ContentItem.id == item_id,
        ContentItem.user_id == current_user.id,
        ContentItem.deleted_at.is_(None)
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found"
        )

    return item

@router.patch("/{item_id}", response_model=ContentItemResponse)
async def update_content_item(
    item_id: UUID,
    update_data: ContentItemUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update a content item.

    - Can mark as read/unread
    - Can archive/unarchive
    """
    # Find item
    item = db.query(ContentItem).filter(
        ContentItem.id == item_id,
        ContentItem.user_id == current_user.id,
        ContentItem.deleted_at.is_(None)
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found"
        )

    # Update fields
    if update_data.is_read is not None:
        item.is_read = update_data.is_read
        if update_data.is_read:
            item.read_at = datetime.utcnow()
        else:
            item.read_at = None

    if update_data.is_archived is not None:
        item.is_archived = update_data.is_archived

    if update_data.read_position is not None:
        item.read_position = update_data.read_position

    if update_data.tags is not None:
        item.tags = update_data.tags

    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_content_item(
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Soft delete a content item.

    - Sets deleted_at timestamp
    - Item won't appear in lists anymore
    - Can be restored later (if we build that feature)
    """
    item = db.query(ContentItem).filter(
        ContentItem.id == item_id,
        ContentItem.user_id == current_user.id,
        ContentItem.deleted_at.is_(None)
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found"
        )

    # Soft delete
    item.deleted_at = datetime.utcnow()
    db.commit()

    return None
