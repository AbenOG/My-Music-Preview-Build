from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ...database import get_db
from ...models.track import Track, LikedSong
from ...schemas.track import ArtistResponse, TrackResponse

router = APIRouter(prefix="/artists", tags=["artists"])

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

@router.get("", response_model=List[ArtistResponse])
async def list_artists(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    artists_data = db.query(
        Track.artist,
        func.count(Track.id).label("track_count"),
        func.count(func.distinct(Track.album)).label("album_count"),
        func.min(Track.artwork_path).label("artwork_path")
    ).filter(
        Track.artist.isnot(None),
        Track.artist != ""
    ).group_by(
        Track.artist
    ).order_by(
        Track.artist
    ).offset(offset).limit(limit).all()
    
    result = []
    for artist_data in artists_data:
        albums = db.query(func.distinct(Track.album)).filter(
            Track.artist == artist_data[0],
            Track.album.isnot(None)
        ).all()
        
        result.append(ArtistResponse(
            name=artist_data[0],
            track_count=artist_data[1],
            album_count=artist_data[2],
            artwork_path=artist_data[3],
            albums=[a[0] for a in albums if a[0]]
        ))
    
    return result

@router.get("/{artist_name}")
async def get_artist(artist_name: str, db: Session = Depends(get_db)):
    tracks = db.query(Track).filter(Track.artist == artist_name).all()
    
    if not tracks:
        raise HTTPException(status_code=404, detail="Artist not found")
    
    albums = {}
    for track in tracks:
        if track.album:
            if track.album not in albums:
                albums[track.album] = {
                    "name": track.album,
                    "year": track.year,
                    "artwork_path": track.artwork_path,
                    "tracks": []
                }
            albums[track.album]["tracks"].append(get_track_response(track, db))
    
    sorted_tracks = sorted(tracks, key=lambda t: (
        db.query(func.count(PlayHistory.id)).filter(PlayHistory.track_id == t.id).scalar()
    ), reverse=True) if len(tracks) > 0 else tracks
    
    return {
        "name": artist_name,
        "track_count": len(tracks),
        "album_count": len(albums),
        "artwork_path": tracks[0].artwork_path if tracks else None,
        "top_tracks": [get_track_response(t, db) for t in sorted_tracks[:10]],
        "albums": list(albums.values())
    }

from ...models.track import PlayHistory
