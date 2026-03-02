from sqlalchemy import (
    Column,
    String,
    DateTime,
    Integer,
    Text,
    ForeignKey,
    ARRAY,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base


class VinylRecord(Base):
    __tablename__ = "vinyl_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Discogs source
    discogs_url = Column(Text, nullable=False)
    discogs_release_id = Column(Integer, index=True)

    # Core metadata (populated by Celery task)
    title = Column(Text)  # Album title
    artist = Column(Text)  # Primary artist name
    label = Column(String(255))  # Record label
    catalog_number = Column(String(255))  # Label catalog number (e.g. "CAT-001")
    year = Column(Integer)  # Release year
    cover_url = Column(Text)  # Album art URL
    genres = Column(ARRAY(String(100)), default=list)
    styles = Column(ARRAY(String(100)), default=list)

    # Tracklist stored as JSON array: [{"position": "A1", "title": "...", "duration": "3:45"}, ...]
    tracklist = Column(JSONB, default=list)

    # Videos from Discogs + user-added: [{"title": "...", "uri": "https://youtube.com/...", "duration": 421}, ...]
    videos = Column(JSONB, default=list)

    # User interaction
    notes = Column(Text)  # Personal notes
    rating = Column(Integer)  # 1-5 star rating
    tags = Column(ARRAY(String(100)), default=list)  # User tags / wantlist labels
    status = Column(
        String(50), default="collection", index=True
    )  # collection, wantlist, library
    is_public = Column(Boolean, default=False, index=True)

    # Processing
    processing_status = Column(String(50), default="pending", index=True)
    processing_error = Column(Text)

    # Soft delete
    deleted_at = Column(DateTime(timezone=True), index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user = relationship("User", back_populates="vinyl_records")
