from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ...database import get_db
from ...models.track import Track, LikedSong
from ...schemas.track import AlbumResponse, TrackResponse

router = APIRouter(prefix="/albums", tags=["albums"])

def get_track_response(track: Track, db: Session) -> TrackResponse:
    is_liked = db.query(LikedSong).filter(LikedSong.track_id == track.id).first() is not None
    return TrackResponse(
        id=track.id,
        file_path=track.file_path,
        title=track.title,
        artist=track.artist,
        album=track.album,
        album_artist=track.album_artist,
        genre=track.genre,
        year=track.year,
        track_number=track.track_number,
        disc_number=track.disc_number,
        duration_ms=track.duration_ms,
        bitrate=track.bitrate,
        sample_rate=track.sample_rate,
        format=track.format,
        file_size=track.file_size,
        artwork_path=track.artwork_path,
        created_at=track.created_at,
        updated_at=track.updated_at,
        is_liked=is_liked
    )

@router.get("", response_model=List[AlbumResponse])
async def list_albums(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    albums_data = db.query(
        Track.album,
        Track.artist,
        Track.album_artist,
        Track.year,
        func.count(Track.id).label("track_count"),
        func.sum(Track.duration_ms).label("total_duration"),
        func.min(Track.artwork_path).label("artwork_path")
    ).filter(
        Track.album.isnot(None),
        Track.album != ""
    ).group_by(
        Track.album,
        Track.artist
    ).order_by(
        Track.album
    ).offset(offset).limit(limit).all()
    
    result = []
    for album_data in albums_data:
        result.append(AlbumResponse(
            name=album_data[0],
            artist=album_data[2] or album_data[1],
            year=album_data[3],
            track_count=album_data[4],
            total_duration_ms=album_data[5] or 0,
            artwork_path=album_data[6]
        ))
    
    return result

@router.get("/{album_name}", response_model=AlbumResponse)
async def get_album(album_name: str, db: Session = Depends(get_db)):
    tracks = db.query(Track).filter(Track.album == album_name).order_by(
        Track.disc_number, Track.track_number
    ).all()
    
    if not tracks:
        raise HTTPException(status_code=404, detail="Album not found")
    
    first_track = tracks[0]
    total_duration = sum(t.duration_ms or 0 for t in tracks)
    
    return AlbumResponse(
        name=album_name,
        artist=first_track.album_artist or first_track.artist,
        year=first_track.year,
        track_count=len(tracks),
        total_duration_ms=total_duration,
        artwork_path=first_track.artwork_path,
        tracks=[get_track_response(t, db) for t in tracks]
    )
