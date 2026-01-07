"""
API routes for MusicBrainz metadata lookup and enrichment.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from ...database import get_db
from ...models.track import Track
from ...services.musicbrainz import musicbrainz_service

router = APIRouter(prefix="/musicbrainz", tags=["musicbrainz"])


class LookupRequest(BaseModel):
    artist: str
    title: str
    album: Optional[str] = None
    duration_ms: Optional[int] = None


class BatchLookupRequest(BaseModel):
    track_ids: List[int]


class ApplyMetadataRequest(BaseModel):
    apply_artist: bool = False
    apply_title: bool = False
    apply_album: bool = False
    apply_year: bool = False
    apply_genre: bool = False


# Progress tracking for batch operations
batch_progress = {"status": "idle", "data": {}}


@router.get("/status")
async def get_musicbrainz_status():
    """Check if MusicBrainz integration is available."""
    return {
        "available": musicbrainz_service.is_available(),
        "message": "MusicBrainz integration is ready" if musicbrainz_service.is_available()
                   else "MusicBrainz library not installed. Run: pip install musicbrainzngs"
    }


@router.post("/lookup")
async def lookup_metadata(request: LookupRequest, db: Session = Depends(get_db)):
    """Single track MusicBrainz lookup by artist/title."""
    if not musicbrainz_service.is_available():
        raise HTTPException(status_code=503, detail="MusicBrainz integration not available")

    result = musicbrainz_service.lookup_track(
        db,
        artist=request.artist,
        title=request.title,
        album=request.album,
        duration_ms=request.duration_ms
    )

    if result:
        return {"found": True, "data": result}
    return {"found": False, "data": None}


@router.post("/lookup/{track_id}")
async def lookup_track_metadata(track_id: int, db: Session = Depends(get_db)):
    """Look up metadata for a specific track by ID."""
    if not musicbrainz_service.is_available():
        raise HTTPException(status_code=503, detail="MusicBrainz integration not available")

    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    if not track.artist or not track.title:
        raise HTTPException(status_code=400, detail="Track missing artist or title")

    result = musicbrainz_service.lookup_track(
        db,
        artist=track.artist,
        title=track.title,
        album=track.album,
        duration_ms=track.duration_ms
    )

    return {
        "track_id": track_id,
        "found": result is not None,
        "current": {
            "artist": track.artist,
            "title": track.title,
            "album": track.album,
            "year": track.year,
            "genre": track.genre
        },
        "musicbrainz": result
    }


@router.post("/batch-lookup")
async def batch_lookup_metadata(
    request: BatchLookupRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Start batch MusicBrainz lookup for multiple tracks."""
    global batch_progress

    if not musicbrainz_service.is_available():
        raise HTTPException(status_code=503, detail="MusicBrainz integration not available")

    if batch_progress["status"] == "running":
        raise HTTPException(status_code=409, detail="Batch lookup already in progress")

    batch_progress = {
        "status": "running",
        "data": {"processed": 0, "total": len(request.track_ids), "stats": {}}
    }

    async def run_batch():
        global batch_progress
        from ...database import SessionLocal

        local_db = SessionLocal()
        try:
            async def update_progress(data):
                batch_progress["data"] = data

            stats = await musicbrainz_service.batch_lookup(
                local_db,
                request.track_ids,
                progress_callback=update_progress
            )
            batch_progress = {"status": "completed", "data": stats}
        except Exception as e:
            batch_progress = {"status": "error", "data": {"error": str(e)}}
        finally:
            local_db.close()

    background_tasks.add_task(run_batch)

    return {"message": "Batch lookup started", "total_tracks": len(request.track_ids)}


@router.get("/batch-lookup/progress")
async def get_batch_progress():
    """Get progress of batch lookup operation."""
    return batch_progress


@router.post("/apply/{track_id}")
async def apply_musicbrainz_metadata(
    track_id: int,
    request: ApplyMetadataRequest,
    db: Session = Depends(get_db)
):
    """Apply MusicBrainz metadata to a track."""
    if not musicbrainz_service.is_available():
        raise HTTPException(status_code=503, detail="MusicBrainz integration not available")

    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    # First, look up the metadata
    result = musicbrainz_service.lookup_track(
        db,
        artist=track.artist,
        title=track.title,
        album=track.album,
        duration_ms=track.duration_ms
    )

    if not result:
        raise HTTPException(status_code=404, detail="No MusicBrainz data found for this track")

    updates = {}

    if request.apply_artist and result.get("artist"):
        track.artist_original = track.artist
        track.artist = result["artist"]
        updates["artist"] = result["artist"]

    if request.apply_title and result.get("title"):
        track.title_original = track.title
        track.title = result["title"]
        updates["title"] = result["title"]

    if request.apply_album and result.get("album"):
        track.album_original = track.album
        track.album = result["album"]
        updates["album"] = result["album"]

    if request.apply_year and result.get("year"):
        track.year = result["year"]
        updates["year"] = result["year"]

    if request.apply_genre and result.get("genre"):
        track.genre = result["genre"]
        updates["genre"] = result["genre"]

    # Update MusicBrainz IDs
    track.musicbrainz_recording_id = result.get("recording_mbid")
    track.musicbrainz_release_id = result.get("release_mbid")
    track.musicbrainz_artist_id = result.get("artist_mbid")
    track.musicbrainz_lookup_at = datetime.utcnow()

    # Re-normalize after updates
    from ...services.normalizer import normalizer
    track.artist_normalized = normalizer.normalize_artist(track.artist)
    track.album_normalized = normalizer.normalize_album(track.album)
    track.title_normalized = normalizer.normalize_title(track.title)
    track.metadata_completeness = normalizer.calculate_completeness({
        "title": track.title, "artist": track.artist, "album": track.album,
        "year": track.year, "genre": track.genre, "artwork_path": track.artwork_path,
        "track_number": track.track_number, "bitrate": track.bitrate
    })

    db.commit()

    return {"success": True, "updates": updates, "track_id": track_id}


@router.post("/clear-cache")
async def clear_musicbrainz_cache(
    older_than_days: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Clear MusicBrainz lookup cache."""
    deleted = musicbrainz_service.clear_cache(db, older_than_days)
    return {
        "success": True,
        "deleted_entries": deleted,
        "filter": f"older than {older_than_days} days" if older_than_days else "all"
    }


@router.get("/cache-stats")
async def get_cache_stats(db: Session = Depends(get_db)):
    """Get MusicBrainz cache statistics."""
    from ...models.musicbrainz import MusicBrainzCache
    from sqlalchemy import func

    total = db.query(MusicBrainzCache).count()
    found = db.query(MusicBrainzCache).filter(MusicBrainzCache.lookup_status == "found").count()
    not_found = db.query(MusicBrainzCache).filter(MusicBrainzCache.lookup_status == "not_found").count()
    errors = db.query(MusicBrainzCache).filter(MusicBrainzCache.lookup_status == "error").count()

    return {
        "total_cached": total,
        "found": found,
        "not_found": not_found,
        "errors": errors,
        "hit_rate": round((found / total * 100), 1) if total > 0 else 0
    }
