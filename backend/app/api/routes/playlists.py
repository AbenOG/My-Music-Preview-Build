from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from ...database import get_db
from ...models.playlist import Playlist, PlaylistTrack
from ...models.track import Track, LikedSong
from ...schemas.playlist import (
    PlaylistCreate, PlaylistUpdate, PlaylistResponse,
    PlaylistDetailResponse, PlaylistTrackAdd, PlaylistReorder,
    PlaylistTracksAdd, PlaylistExtend
)
from ...schemas.track import TrackResponse
from ...services.smart_playlists import get_smart_playlists, get_smart_playlist_tracks
from ...services.recommendations import get_radio_tracks

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


@router.get("/recent", response_model=List[PlaylistResponse])
async def get_recent_playlists(
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """Get recently modified playlists."""
    playlists = db.query(Playlist).order_by(
        desc(Playlist.updated_at)
    ).limit(limit).all()

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


@router.post("/radio/generate", response_model=PlaylistDetailResponse)
async def generate_radio_playlist(
    seed_track_id: int = Query(..., description="ID of the seed track"),
    limit: int = Query(40, ge=20, le=100, description="Number of tracks to generate"),
    db: Session = Depends(get_db)
):
    """Generate a radio playlist based on a seed track."""
    # Get the seed track
    seed_track = db.query(Track).filter(Track.id == seed_track_id).first()
    if not seed_track:
        raise HTTPException(status_code=404, detail="Seed track not found")

    # Generate playlist name
    playlist_name = f"{seed_track.title} Radio"

    # Check if a radio playlist with this name already exists
    existing = db.query(Playlist).filter(Playlist.name == playlist_name).first()
    if existing:
        # Delete existing radio playlist to regenerate
        db.query(PlaylistTrack).filter(PlaylistTrack.playlist_id == existing.id).delete()
        db.delete(existing)
        db.commit()

    # Create the playlist
    playlist = Playlist(
        name=playlist_name,
        description=f"Radio based on {seed_track.title} by {seed_track.artist or 'Unknown'}",
        is_system=False  # User-visible playlist
    )
    db.add(playlist)
    db.commit()
    db.refresh(playlist)

    # Get recommended tracks using the scoring algorithm
    recommended_tracks = get_radio_tracks(db, seed_track, limit - 1)

    # Add seed track first, then recommended tracks
    all_tracks = [seed_track] + recommended_tracks

    for position, track in enumerate(all_tracks):
        playlist_track = PlaylistTrack(
            playlist_id=playlist.id,
            track_id=track.id,
            position=position
        )
        db.add(playlist_track)

    db.commit()

    # Return the full playlist with tracks
    tracks = [get_track_response(t, db) for t in all_tracks]
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


@router.post("/{playlist_id}/tracks/bulk")
async def add_tracks_to_playlist_bulk(
    playlist_id: int,
    tracks_data: PlaylistTracksAdd,
    db: Session = Depends(get_db)
):
    """Add multiple tracks to a playlist at once."""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Get current max position
    max_position = db.query(func.max(PlaylistTrack.position)).filter(
        PlaylistTrack.playlist_id == playlist_id
    ).scalar() or 0

    # Get existing track IDs in playlist
    existing_track_ids = set(
        pt.track_id for pt in db.query(PlaylistTrack.track_id).filter(
            PlaylistTrack.playlist_id == playlist_id
        ).all()
    )

    added_count = 0
    for track_id in tracks_data.track_ids:
        # Skip if already in playlist
        if track_id in existing_track_ids:
            continue

        # Verify track exists
        track = db.query(Track).filter(Track.id == track_id).first()
        if not track:
            continue

        max_position += 1
        playlist_track = PlaylistTrack(
            playlist_id=playlist_id,
            track_id=track_id,
            position=max_position
        )
        db.add(playlist_track)
        existing_track_ids.add(track_id)
        added_count += 1

    db.commit()

    return {"message": f"Added {added_count} tracks to playlist"}


@router.post("/{playlist_id}/extend", response_model=List[TrackResponse])
async def extend_playlist(
    playlist_id: int,
    extend_data: PlaylistExtend,
    db: Session = Depends(get_db)
):
    """Extend a radio playlist with more tracks based on a seed track."""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Get the seed track
    seed_track = db.query(Track).filter(Track.id == extend_data.seed_track_id).first()
    if not seed_track:
        raise HTTPException(status_code=404, detail="Seed track not found")

    # Get current track IDs in playlist
    current_track_ids = [
        pt.track_id for pt in db.query(PlaylistTrack.track_id).filter(
            PlaylistTrack.playlist_id == playlist_id
        ).all()
    ]

    # Combine with explicitly excluded IDs
    exclude_ids = list(set(current_track_ids + extend_data.exclude_ids))

    # Generate more tracks
    new_tracks = get_radio_tracks(db, seed_track, extend_data.limit, exclude_ids)

    if not new_tracks:
        return []

    # Get current max position
    max_position = db.query(func.max(PlaylistTrack.position)).filter(
        PlaylistTrack.playlist_id == playlist_id
    ).scalar() or 0

    # Add new tracks to playlist
    for track in new_tracks:
        max_position += 1
        playlist_track = PlaylistTrack(
            playlist_id=playlist_id,
            track_id=track.id,
            position=max_position
        )
        db.add(playlist_track)

    db.commit()

    return [get_track_response(t, db) for t in new_tracks]
