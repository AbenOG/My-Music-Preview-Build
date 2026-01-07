from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class FolderBase(BaseModel):
    path: str

class FolderCreate(FolderBase):
    pass

class FolderResponse(FolderBase):
    id: int
    name: str
    created_at: datetime
    last_scanned_at: Optional[datetime] = None
    track_count: int = 0
    
    class Config:
        from_attributes = True

class ScanStatus(BaseModel):
    is_scanning: bool
    folder_id: Optional[int] = None
    folder_path: Optional[str] = None
    current_file: Optional[str] = None
    processed: int = 0
    total: int = 0
    progress: float = 0.0
