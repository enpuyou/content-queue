from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class VinylTrack(BaseModel):
    position: str
    title: str
    duration: Optional[str] = None


class VinylVideo(BaseModel):
    title: Optional[str] = None
    uri: str
    duration: Optional[int] = None


class VinylRecordBase(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None
    label: Optional[str] = None
    catalog_number: Optional[str] = None
    year: Optional[int] = None
    cover_url: Optional[str] = None
    genres: List[str] = []
    styles: List[str] = []
    notes: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    tags: List[str] = []
    status: str = "collection"


class VinylRecordCreate(BaseModel):
    discogs_url: str


class VinylRecordUpdate(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None
    label: Optional[str] = None
    year: Optional[int] = None
    cover_url: Optional[str] = None
    genres: Optional[List[str]] = None
    styles: Optional[List[str]] = None
    notes: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    videos: Optional[List[VinylVideo]] = None


class VinylRecordResponse(VinylRecordBase):
    id: UUID
    user_id: UUID
    discogs_url: str
    discogs_release_id: Optional[int] = None
    tracklist: List[VinylTrack] = []
    videos: List[VinylVideo] = []
    processing_status: str
    processing_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
