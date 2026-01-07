"""
Enhanced API routes for duplicate detection, merging, and management.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import threading
from ...database import get_db, SessionLocal
from ...models.track import Track, PlayHistory
from ...models.playlist import PlaylistTrack
from ...models.duplicate import DuplicateGroup, DuplicateGroupMember
from ...services.deduplication import deduplication_service, duplicate_detection_progress

router = APIRouter(prefix="/duplicates", tags=["duplicates"])

# Store the result of background scan
_scan_result = {"data": None, "completed": False}


class MergeRequest(BaseModel):
    group_id: int
    keep_track_id: int
    delete_files: bool = False


class BulkMergeRequest(BaseModel):
    merges: List[MergeRequest]


def _run_duplicate_scan():
    """Background task to run duplicate detection."""
    global _scan_result
    _scan_result["completed"] = False
    _scan_result["data"] = None

    db = SessionLocal()
    try:
        duplicate_detection_progress.reset()
        result = deduplication_service.find_all_duplicates(db, duplicate_detection_progress)
        _scan_result["data"] = result
        _scan_result["completed"] = True
    except Exception as e:
        duplicate_detection_progress.error = str(e)
        _scan_result["data"] = None
        _scan_result["completed"] = True
    finally:
        db.close()


@router.get("/progress")
async def get_scan_progress():
    """Get the current progress of duplicate detection."""
    return duplicate_detection_progress.to_dict()


@router.get("")
async def find_duplicates(
    refresh: bool = Query(False, description="Force re-scan for duplicates"),
    background: bool = Query(True, description="Run scan in background"),
    db: Session = Depends(get_db)
):
    """
    Get all duplicate groups.
    If refresh=True, re-scans the entire library for duplicates.
    If background=True (default), the scan runs in background and you can poll /progress.
    """
    global _scan_result

    if refresh:
        if duplicate_detection_progress.is_running:
            # Already running, return current progress
            return {
                "scanning": True,
                "progress": duplicate_detection_progress.to_dict()
            }

        if background:
            # Start background scan
            _scan_result["completed"] = False
            _scan_result["data"] = None
            thread = threading.Thread(target=_run_duplicate_scan)
            thread.start()
            return {
                "scanning": True,
                "progress": duplicate_detection_progress.to_dict()
            }
        else:
            # Run synchronously (legacy behavior)
            return deduplication_service.find_all_duplicates(db, duplicate_detection_progress)

    # Check if there's a completed background result waiting
    if _scan_result["completed"] and _scan_result["data"]:
        result = _scan_result["data"]
        _scan_result["data"] = None
        _scan_result["completed"] = False
        return result

    # Return cached groups
    groups = db.query(DuplicateGroup).filter(
        DuplicateGroup.status == "unresolved"
    ).all()

    if not groups:
        # No cached data, start background scan
        if not duplicate_detection_progress.is_running:
            _scan_result["completed"] = False
            _scan_result["data"] = None
            thread = threading.Thread(target=_run_duplicate_scan)
            thread.start()
        return {
            "scanning": True,
            "progress": duplicate_detection_progress.to_dict()
        }

    return {
        "total_groups": len(groups),
        "total_duplicates": sum(len(g.members) - 1 for g in groups),
        "groups": [deduplication_service._group_to_dict(g) for g in groups]
    }


@router.get("/stats")
async def get_duplicate_stats(db: Session = Depends(get_db)):
    """Get statistics about duplicates in the library."""
    return deduplication_service.get_stats(db)


@router.get("/{group_id}")
async def get_duplicate_group(group_id: int, db: Session = Depends(get_db)):
    """Get details of a specific duplicate group."""
    result = deduplication_service.get_group(db, group_id)
    if not result:
        raise HTTPException(status_code=404, detail="Duplicate group not found")
    return result


@router.post("/merge")
async def merge_duplicates(request: MergeRequest, db: Session = Depends(get_db)):
    """
    Merge a duplicate group by keeping one track.
    Transfers play history, playlist associations, and liked status to the kept track.
    """
    try:
        result = deduplication_service.merge_duplicates(
            db,
            group_id=request.group_id,
            keep_track_id=request.keep_track_id,
            delete_files=request.delete_files
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/merge/bulk")
async def bulk_merge_duplicates(request: BulkMergeRequest, db: Session = Depends(get_db)):
    """Merge multiple duplicate groups at once."""
    results = []
    errors = []

    for merge_req in request.merges:
        try:
            result = deduplication_service.merge_duplicates(
                db,
                group_id=merge_req.group_id,
                keep_track_id=merge_req.keep_track_id,
                delete_files=merge_req.delete_files
            )
            results.append(result)
        except Exception as e:
            errors.append({"group_id": merge_req.group_id, "error": str(e)})

    return {
        "success": len(results),
        "errors": len(errors),
        "results": results,
        "error_details": errors
    }


@router.post("/{group_id}/ignore")
async def ignore_duplicate_group(group_id: int, db: Session = Depends(get_db)):
    """Mark a duplicate group as 'not duplicates' (ignore)."""
    try:
        result = deduplication_service.ignore_group(db, group_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auto-select-best")
async def auto_select_best(group_ids: List[int], db: Session = Depends(get_db)):
    """
    Auto-select the best track to keep from a list of track IDs based on quality score.
    Returns track ID to keep and IDs to delete with their scores.
    """
    tracks = db.query(Track).filter(Track.id.in_(group_ids)).all()

    if len(tracks) < 2:
        return {"keep": None, "delete": [], "scores": {}}

    # Score all tracks using the deduplication service
    scored_tracks = [
        (t, deduplication_service.calculate_quality_score(t))
        for t in tracks
    ]
    sorted_tracks = sorted(scored_tracks, key=lambda x: x[1], reverse=True)

    return {
        "keep": sorted_tracks[0][0].id,
        "delete": [t[0].id for t in sorted_tracks[1:]],
        "scores": {t[0].id: t[1] for t in sorted_tracks}
    }


@router.delete("/{track_id}")
async def delete_duplicate(
    track_id: int,
    delete_file: bool = False,
    db: Session = Depends(get_db)
):
    """Delete a single duplicate track (legacy endpoint for backwards compatibility)."""
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    file_path = track.file_path

    # Delete related records
    db.query(PlayHistory).filter(PlayHistory.track_id == track_id).delete()
    db.query(PlaylistTrack).filter(PlaylistTrack.track_id == track_id).delete()
    db.query(DuplicateGroupMember).filter(DuplicateGroupMember.track_id == track_id).delete()

    # Check if this was the last member of any groups and clean up
    from ...models.track import LikedSong
    db.query(LikedSong).filter(LikedSong.track_id == track_id).delete()

    db.delete(track)
    db.commit()

    if delete_file and file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
            return {"success": True, "message": "Track and file deleted"}
        except Exception as e:
            return {"success": True, "message": f"Track deleted, but failed to delete file: {str(e)}"}

    return {"success": True, "message": "Track removed from library"}


@router.post("/rescan")
async def rescan_duplicates(
    background: bool = Query(True, description="Run scan in background"),
    db: Session = Depends(get_db)
):
    """Force a full rescan for duplicates."""
    global _scan_result

    if duplicate_detection_progress.is_running:
        return {
            "scanning": True,
            "progress": duplicate_detection_progress.to_dict()
        }

    if background:
        _scan_result["completed"] = False
        _scan_result["data"] = None
        thread = threading.Thread(target=_run_duplicate_scan)
        thread.start()
        return {
            "scanning": True,
            "progress": duplicate_detection_progress.to_dict()
        }

    return deduplication_service.find_all_duplicates(db, duplicate_detection_progress)
