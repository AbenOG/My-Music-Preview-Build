from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class TrackBase(BaseModel):
    title: str
    artist: Optional[str] = None
    album: Optional[str] = None

class TrackCreate(TrackBase):
    file_path: str
    album_artist: Optional[str] = None
    genre: Optional[str] = None
    year: Optional[int] = None
    track_number: Optional[int] = None
    disc_number: Optional[int] = None
    duration_ms: Optional[int] = None
    bitrate: Optional[int] = None
    sample_rate: Optional[int] = None
    format: Optional[str] = None
    file_size: Optional[int] = None
    artwork_path: Optional[str] = None
    folder_id: Optional[int] = None

class TrackResponse(TrackBase):
    id: int
    file_path: str
    album_artist: Optional[str] = None
    genre: Optional[str] = None
    year: Optional[int] = None
    track_number: Optional[int] = None
    disc_number: Optional[int] = None
    duration_ms: Optional[int] = None
    bitrate: Optional[int] = None
    sample_rate: Optional[int] = None
    format: Optional[str] = None
    file_size: Optional[int] = None
    artwork_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_liked: bool = False
    
    class Config:
        from_attributes = True

class TrackListResponse(BaseModel):
    tracks: List[TrackResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class AlbumResponse(BaseModel):
    name: str
    artist: Optional[str] = None
    year: Optional[int] = None
    track_count: int
    total_duration_ms: int
    artwork_path: Optional[str] = None
    tracks: List[TrackResponse] = []

class ArtistResponse(BaseModel):
    name: str
    track_count: int
    album_count: int
    artwork_path: Optional[str] = None
    albums: List[str] = []

class LikedSongResponse(BaseModel):
    id: int
    track_id: int
    liked_at: datetime
    track: TrackResponse
    
    class Config:
        from_attributes = True

class PlayHistoryResponse(BaseModel):
    id: int
    track_id: int
    played_at: datetime
    play_duration_ms: Optional[int] = None
    track: TrackResponse
    
    class Config:
        from_attributes = True

class PlayHistoryCreate(BaseModel):
    track_id: int
    play_duration_ms: Optional[int] = None
