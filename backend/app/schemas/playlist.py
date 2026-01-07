from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from .track import TrackResponse

class PlaylistBase(BaseModel):
    name: str
    description: Optional[str] = None

class PlaylistCreate(PlaylistBase):
    pass

class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cover_path: Optional[str] = None

class PlaylistTrackAdd(BaseModel):
    track_id: int

class PlaylistReorder(BaseModel):
    track_ids: List[int]

class PlaylistResponse(PlaylistBase):
    id: int
    cover_path: Optional[str] = None
    is_system: bool = False
    created_at: datetime
    updated_at: datetime
    track_count: int = 0
    total_duration_ms: int = 0
    
    class Config:
        from_attributes = True

class PlaylistDetailResponse(PlaylistResponse):
    tracks: List[TrackResponse] = []
