from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class ContentItemCreate(BaseModel):
    """Data needed to save a new link"""

    url: str  # The URL to save
    list_ids: list[UUID] | None = None  # Optional: add to specific lists


class ContentItemResponse(BaseModel):
    """What we return to the client"""

    id: UUID
    user_id: UUID
    original_url: str
    title: str | None
    description: str | None
    thumbnail_url: str | None
    content_type: str | None
    tags: list[str] | None = []

    # Full content fields
    full_text: str | None
    word_count: int | None
    reading_time_minutes: int | None

    # Reading progress
    read_position: Optional[float] = 0.0

    is_read: bool
    is_archived: bool
    processing_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContentItemDetail(ContentItemResponse):
    """Extended response with full text for single item view"""

    pass  # Same as ContentItemResponse but semantically different


class ContentItemUpdate(BaseModel):
    """Fields that can be updated"""

    is_read: bool | None = None
    is_archived: bool | None = None
    read_position: Optional[float] = None
    tags: list[str] | None = None


class ContentItemList(BaseModel):
    """Paginated list response"""

    items: list[ContentItemResponse]
    total: int
    skip: int
    limit: int
