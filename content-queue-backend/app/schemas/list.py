from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class ListCreate(BaseModel):
    """Data needed to create a list"""

    name: str
    description: str | None = None
    is_shared: bool = False


class ListUpdate(BaseModel):
    """Fields that can be updated"""

    name: str | None = None
    description: str | None = None
    is_shared: bool | None = None


class ListResponse(BaseModel):
    """What we return for a list"""

    id: UUID
    name: str
    description: str | None
    owner_id: UUID
    is_shared: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ListWithContentCount(ListResponse):
    """List with count of items"""

    content_count: int


class AddContentToList(BaseModel):
    """Add content items to a list"""

    content_item_ids: list[UUID]


class RemoveContentFromList(BaseModel):
    """Remove content items from a list"""

    content_item_ids: list[UUID]
