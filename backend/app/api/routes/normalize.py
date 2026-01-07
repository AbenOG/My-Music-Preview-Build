"""
API routes for metadata normalization.
"""

from typing import Optional
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ...database import get_db
from ...models.track import Track
from ...services.normalizer import normalizer

router = APIRouter(prefix="/normalize", tags=["normalize"])

# Progress tracking for background operations
normalize_progress = {"status": "idle", "data": {}}


class NormalizePreviewRequest(BaseModel):
    artist: Optional[str] = None
    album: Optional[str] = None
    title: Optional[str] = None


@router.post("/library")
async def normalize_library(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Normalize all track metadata in the library.
    This is a background operation.
    """
    global normalize_progress

    if normalize_progress["status"] == "running":
        return {"error": "Normalization already in progress", "status": normalize_progress}

    # Get total count first
    total = db.query(Track).count()
    normalize_progress = {"status": "running", "data": {"processed": 0, "total": total, "updated": 0}}

    def run_normalization():
        global normalize_progress
        from ...database import SessionLocal

        local_db = SessionLocal()
        try:
            tracks = local_db.query(Track).all()
            normalize_progress["data"]["total"] = len(tracks)

            updated = 0
            for i, track in enumerate(tracks):
                # Normalize fields
                artist_norm = normalizer.normalize_artist(track.artist)
                album_norm = normalizer.normalize_album(track.album)
                title_norm = normalizer.normalize_title(track.title)
                completeness = normalizer.calculate_completeness({
                    "title": track.title, "artist": track.artist, "album": track.album,
                    "year": track.year, "genre": track.genre, "artwork_path": track.artwork_path,
                    "track_number": track.track_number, "bitrate": track.bitrate
                })

                # Check if update needed
                needs_update = (
                    track.artist_normalized != artist_norm or
                    track.album_normalized != album_norm or
                    track.title_normalized != title_norm or
                    track.metadata_completeness != completeness
                )

                if needs_update:
                    # Store original if different from current display value
                    if track.artist and artist_norm and track.artist.lower() != artist_norm:
                        track.artist_original = track.artist
                    if track.album and album_norm and track.album.lower() != album_norm:
                        track.album_original = track.album
                    if track.title and title_norm and track.title.lower() != title_norm:
                        track.title_original = track.title

                    track.artist_normalized = artist_norm
                    track.album_normalized = album_norm
                    track.title_normalized = title_norm
                    track.metadata_completeness = completeness
                    updated += 1

                normalize_progress["data"]["processed"] = i + 1
                normalize_progress["data"]["updated"] = updated

                if (i + 1) % 100 == 0:
                    local_db.commit()

            local_db.commit()
            normalize_progress = {
                "status": "completed",
                "data": {"total": len(tracks), "updated": updated}
            }
        except Exception as e:
            normalize_progress = {"status": "error", "data": {"error": str(e)}}
        finally:
            local_db.close()

    background_tasks.add_task(run_normalization)

    return {"message": "Normalization started", "total": total}


@router.get("/progress")
async def get_normalize_progress():
    """Get progress of normalization operation."""
    return normalize_progress


@router.post("/track/{track_id}")
async def normalize_track(track_id: int, db: Session = Depends(get_db)):
    """Normalize a single track's metadata."""
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        return {"error": "Track not found"}

    original = {
        "artist": track.artist,
        "album": track.album,
        "title": track.title
    }

    # Calculate normalized values
    artist_norm = normalizer.normalize_artist(track.artist)
    album_norm = normalizer.normalize_album(track.album)
    title_norm = normalizer.normalize_title(track.title)

    # Store originals if different
    if track.artist and artist_norm and track.artist.lower() != artist_norm:
        track.artist_original = track.artist
    if track.album and album_norm and track.album.lower() != album_norm:
        track.album_original = track.album
    if track.title and title_norm and track.title.lower() != title_norm:
        track.title_original = track.title

    track.artist_normalized = artist_norm
    track.album_normalized = album_norm
    track.title_normalized = title_norm
    track.metadata_completeness = normalizer.calculate_completeness({
        "title": track.title, "artist": track.artist, "album": track.album,
        "year": track.year, "genre": track.genre, "artwork_path": track.artwork_path,
        "track_number": track.track_number, "bitrate": track.bitrate
    })

    db.commit()

    return {
        "success": True,
        "track_id": track_id,
        "original": original,
        "normalized": {
            "artist": track.artist_normalized,
            "album": track.album_normalized,
            "title": track.title_normalized
        },
        "completeness": track.metadata_completeness
    }


@router.get("/preview")
async def preview_normalization(
    artist: Optional[str] = None,
    album: Optional[str] = None,
    title: Optional[str] = None
):
    """Preview how text would be normalized."""
    return {
        "original": {"artist": artist, "album": album, "title": title},
        "normalized": {
            "artist": normalizer.normalize_artist(artist),
            "album": normalizer.normalize_album(album),
            "title": normalizer.normalize_title(title)
        }
    }


@router.get("/stats")
async def get_normalization_stats(db: Session = Depends(get_db)):
    """Get statistics about normalized tracks."""
    total = db.query(Track).count()
    normalized = db.query(Track).filter(Track.artist_normalized.isnot(None)).count()
    with_originals = db.query(Track).filter(Track.artist_original.isnot(None)).count()

    # Calculate average completeness
    from sqlalchemy import func
    avg_completeness = db.query(func.avg(Track.metadata_completeness)).scalar() or 0

    return {
        "total_tracks": total,
        "normalized_tracks": normalized,
        "tracks_with_preserved_originals": with_originals,
        "average_completeness": round(avg_completeness, 1)
    }
