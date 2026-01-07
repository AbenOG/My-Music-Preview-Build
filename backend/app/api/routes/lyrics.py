from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
from ...database import get_db
from ...models.track import Track

router = APIRouter(prefix="/lyrics", tags=["lyrics"])

LRCLIB_API = "https://lrclib.net/api/get"

@router.get("/{track_id}")
async def get_lyrics(track_id: int, db: Session = Depends(get_db)):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    if not track.title:
        return {"found": False, "message": "Track has no title"}
    
    params = {
        "track_name": track.title,
        "artist_name": track.artist or "",
    }
    
    if track.album:
        params["album_name"] = track.album
    
    if track.duration_ms:
        params["duration"] = track.duration_ms // 1000
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(LRCLIB_API, params=params)
            
            if response.status_code == 404:
                return {"found": False, "message": "Lyrics not found"}
            
            response.raise_for_status()
            data = response.json()
            
            return {
                "found": True,
                "synced": data.get("syncedLyrics") is not None,
                "syncedLyrics": data.get("syncedLyrics"),
                "plainLyrics": data.get("plainLyrics"),
                "trackName": data.get("trackName"),
                "artistName": data.get("artistName"),
                "albumName": data.get("albumName"),
                "duration": data.get("duration")
            }
    except httpx.TimeoutException:
        return {"found": False, "message": "Request timed out"}
    except Exception as e:
        return {"found": False, "message": str(e)}
