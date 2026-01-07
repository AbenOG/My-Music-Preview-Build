import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.track import Track
from ...config import settings

router = APIRouter(prefix="/artwork", tags=["artwork"])

DEFAULT_ARTWORK = None

@router.get("/{track_id}")
async def get_track_artwork(track_id: int, db: Session = Depends(get_db)):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    if not track.artwork_path or not Path(track.artwork_path).exists():
        raise HTTPException(status_code=404, detail="Artwork not found")
    
    return FileResponse(
        track.artwork_path,
        media_type="image/jpeg"
    )

@router.get("/album/{album_name}")
async def get_album_artwork(album_name: str, db: Session = Depends(get_db)):
    track = db.query(Track).filter(
        Track.album == album_name,
        Track.artwork_path.isnot(None)
    ).first()
    
    if not track or not track.artwork_path or not Path(track.artwork_path).exists():
        raise HTTPException(status_code=404, detail="Artwork not found")
    
    return FileResponse(
        track.artwork_path,
        media_type="image/jpeg"
    )
