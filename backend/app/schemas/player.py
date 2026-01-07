from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class PlayerStateBase(BaseModel):
    current_track_id: Optional[int] = None
    position_ms: int = 0
    volume: float = 0.8
    shuffle_enabled: bool = False
    repeat_mode: str = "none"

class PlayerStateUpdate(PlayerStateBase):
    pass

class PlayerStateResponse(PlayerStateBase):
    id: int
    updated_at: datetime
    
    class Config:
        from_attributes = True

class QueueUpdate(BaseModel):
    track_ids: List[int]

class QueueAddRequest(BaseModel):
    track_id: int
    position: Optional[int] = None

class QueueResponse(BaseModel):
    tracks: List[int]
    current_index: int = 0
