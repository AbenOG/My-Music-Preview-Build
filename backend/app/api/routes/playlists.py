from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ...database import get_db
from ...models.playlist import Playlist, PlaylistTrack
from ...models.track import Track, LikedSong
from ...schemas.playlist import (
    PlaylistCreate, PlaylistUpdate, PlaylistResponse, 
    PlaylistDetailResponse, PlaylistTrackAdd, PlaylistReorder
)
from ...schemas.track import TrackResponse
from ...services.smart_playlists import get_smart_playlists, get_smart_playlist_tracks

router = APIRouter(prefix="/playlists", tags=["playlists"])

@router.get("/smart")
async def list_smart_playlists(db: Session = Depends(get_db)):
    return get_smart_playlists(db)

@router.get("/smart/{rule_id}")
async def get_smart_playlist(rule_id: str, db: Session = Depends(get_db)):
    tracks = get_smart_playlist_tracks(db, rule_id)
    return [get_track_response(t, db) for t in tracks]

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

def get_playlist_info(playlist: Playlist, db: Session) -> dict:
    track_count = db.query(func.count(PlaylistTrack.id)).filter(
        PlaylistTrack.playlist_id == playlist.id
    ).scalar()
    
    total_duration = db.query(func.sum(Track.duration_ms)).join(
        PlaylistTrack, PlaylistTrack.track_id == Track.id
    ).filter(
        PlaylistTrack.playlist_id == playlist.id
    ).scalar() or 0
    
    return {
        "track_count": track_count,
        "total_duration_ms": total_duration
    }

@router.get("", response_model=List[PlaylistResponse])
async def list_playlists(db: Session = Depends(get_db)):
    playlists = db.query(Playlist).order_by(Playlist.created_at.desc()).all()
    
    result = []
    for playlist in playlists:
        info = get_playlist_info(playlist, db)
        result.append(PlaylistResponse(
            id=playlist.id,
            name=playlist.name,
            description=playlist.description,
            cover_path=playlist.cover_path,
            is_system=playlist.is_system,
            created_at=playlist.created_at,
            updated_at=playlist.updated_at,
            track_count=info["track_count"],
            total_duration_ms=info["total_duration_ms"]
        ))
    
    return result

@router.post("", response_model=PlaylistResponse)
async def create_playlist(
    playlist_data: PlaylistCreate,
    db: Session = Depends(get_db)
):
    playlist = Playlist(
        name=playlist_data.name,
        description=playlist_data.description
    )
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    
    return PlaylistResponse(
        id=playlist.id,
        name=playlist.name,
        description=playlist.description,
        cover_path=playlist.cover_path,
        is_system=playlist.is_system,
        created_at=playlist.created_at,
        updated_at=playlist.updated_at,
        track_count=0,
        total_duration_ms=0
    )

@router.get("/{playlist_id}", response_model=PlaylistDetailResponse)
async def get_playlist(playlist_id: int, db: Session = Depends(get_db)):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    playlist_tracks = db.query(PlaylistTrack).filter(
        PlaylistTrack.playlist_id == playlist_id
    ).order_by(PlaylistTrack.position).all()
    
    tracks = []
    for pt in playlist_tracks:
        track = db.query(Track).filter(Track.id == pt.track_id).first()
        if track:
            tracks.append(get_track_response(track, db))
    
    info = get_playlist_info(playlist, db)
    
    return PlaylistDetailResponse(
        id=playlist.id,
        name=playlist.name,
        description=playlist.description,
        cover_path=playlist.cover_path,
        is_system=playlist.is_system,
        created_at=playlist.created_at,
        updated_at=playlist.updated_at,
        track_count=info["track_count"],
        total_duration_ms=info["total_duration_ms"],
        tracks=tracks
    )

@router.put("/{playlist_id}", response_model=PlaylistResponse)
async def update_playlist(
    playlist_id: int,
    playlist_data: PlaylistUpdate,
    db: Session = Depends(get_db)
):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    if playlist.is_system:
        raise HTTPException(status_code=403, detail="Cannot modify system playlist")
    
    if playlist_data.name is not None:
        playlist.name = playlist_data.name
    if playlist_data.description is not None:
        playlist.description = playlist_data.description
    if playlist_data.cover_path is not None:
        playlist.cover_path = playlist_data.cover_path
    
    db.commit()
    db.refresh(playlist)
    
    info = get_playlist_info(playlist, db)
    
    return PlaylistResponse(
        id=playlist.id,
        name=playlist.name,
        description=playlist.description,
        cover_path=playlist.cover_path,
        is_system=playlist.is_system,
        created_at=playlist.created_at,
        updated_at=playlist.updated_at,
        track_count=info["track_count"],
        total_duration_ms=info["total_duration_ms"]
    )

@router.delete("/{playlist_id}")
async def delete_playlist(playlist_id: int, db: Session = Depends(get_db)):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    if playlist.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system playlist")
    
    db.query(PlaylistTrack).filter(PlaylistTrack.playlist_id == playlist_id).delete()
    db.delete(playlist)
    db.commit()
    
    return {"message": "Playlist deleted"}

@router.post("/{playlist_id}/tracks")
async def add_track_to_playlist(
    playlist_id: int,
    track_data: PlaylistTrackAdd,
    db: Session = Depends(get_db)
):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    track = db.query(Track).filter(Track.id == track_data.track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    existing = db.query(PlaylistTrack).filter(
        PlaylistTrack.playlist_id == playlist_id,
        PlaylistTrack.track_id == track_data.track_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Track already in playlist")
    
    max_position = db.query(func.max(PlaylistTrack.position)).filter(
        PlaylistTrack.playlist_id == playlist_id
    ).scalar() or 0
    
    playlist_track = PlaylistTrack(
        playlist_id=playlist_id,
        track_id=track_data.track_id,
        position=max_position + 1
    )
    db.add(playlist_track)
    db.commit()
    
    return {"message": "Track added to playlist"}

@router.delete("/{playlist_id}/tracks/{track_id}")
async def remove_track_from_playlist(
    playlist_id: int,
    track_id: int,
    db: Session = Depends(get_db)
):
    playlist_track = db.query(PlaylistTrack).filter(
        PlaylistTrack.playlist_id == playlist_id,
        PlaylistTrack.track_id == track_id
    ).first()
    
    if not playlist_track:
        raise HTTPException(status_code=404, detail="Track not in playlist")
    
    db.delete(playlist_track)
    db.commit()
    
    return {"message": "Track removed from playlist"}

@router.put("/{playlist_id}/tracks/reorder")
async def reorder_playlist_tracks(
    playlist_id: int,
    reorder_data: PlaylistReorder,
    db: Session = Depends(get_db)
):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    for i, track_id in enumerate(reorder_data.track_ids):
        playlist_track = db.query(PlaylistTrack).filter(
            PlaylistTrack.playlist_id == playlist_id,
            PlaylistTrack.track_id == track_id
        ).first()
        
        if playlist_track:
            playlist_track.position = i
    
    db.commit()
    
    return {"message": "Playlist reordered"}
