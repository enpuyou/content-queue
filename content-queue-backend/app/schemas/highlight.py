from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional
from uuid import UUID


class HighlightBase(BaseModel):
    text: str = Field(..., min_length=1, description="The highlighted text")
    note: Optional[str] = Field(None, description="Optional annotation")
    start_offset: int = Field(
        ..., ge=0, description="Character position where highlight starts"
    )
    end_offset: int = Field(
        ..., gt=0, description="Character position where highlight ends"
    )
    color: str = Field(default="yellow", description="Highlight color")


class HighlightCreate(HighlightBase):
    pass


class HighlightUpdate(BaseModel):
    note: Optional[str] = None
    color: Optional[str] = None


class HighlightResponse(HighlightBase):
    id: UUID
    content_item_id: UUID
    user_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
