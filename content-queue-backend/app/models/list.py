from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

# Junction table for many-to-many: content items can be in multiple lists
content_list_membership = Table(
    "content_list_membership",
    Base.metadata,
    Column(
        "content_item_id",
        UUID(as_uuid=True),
        ForeignKey("content_items.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "list_id",
        UUID(as_uuid=True),
        ForeignKey("lists.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("added_at", DateTime(timezone=True), server_default=func.now()),
    Column("added_by", UUID(as_uuid=True), ForeignKey("users.id")),
)


class List(Base):
    __tablename__ = "lists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_shared = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    owner = relationship("User", backref="owned_lists")
    content_items = relationship(
        "ContentItem", secondary=content_list_membership, backref="lists"
    )
