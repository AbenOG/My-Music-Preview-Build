import os
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from ...database import get_db
from ...models.track import Track
from ...services.metadata import metadata_extractor

router = APIRouter(prefix="/metadata", tags=["metadata"])

FILENAME_PATTERNS = [
    r"^(?P<artist>.+?)\s*-\s*(?P<title>.+)$",
    r"^(?P<artist>.+?)\s*-\s*(?P<album>.+?)\s*-\s*(?P<title>.+)$",
    r"^(?P<track_number>\d+)\s*[-\.]\s*(?P<title>.+)$",
    r"^(?P<title>.+?)\s*\((?P<artist>.+?)\)$",
    r"^(?P<track_number>\d+)\s*[-\.]\s*(?P<artist>.+?)\s*-\s*(?P<title>.+)$",
]

YEAR_PATTERN = r"[\(\[]?(?P<year>19\d{2}|20\d{2})[\)\]]?"


def parse_filename(filename: str) -> dict:
    name = os.path.splitext(filename)[0]
    result = {}
    
    for pattern in FILENAME_PATTERNS:
        match = re.match(pattern, name, re.IGNORECASE)
        if match:
            groups = match.groupdict()
            for key, value in groups.items():
                if value:
                    if key == "track_number":
                        try:
                            result[key] = int(value)
                        except ValueError:
                            pass
                    else:
                        result[key] = value.strip()
            break
    
    return result


def extract_year_from_path(file_path: str) -> Optional[int]:
    path_parts = file_path.split(os.sep)
    
    for part in reversed(path_parts):
        match = re.search(YEAR_PATTERN, part)
        if match:
            try:
                return int(match.group("year"))
            except ValueError:
                pass
    
    return None


@router.get("/issues")
async def get_metadata_issues(db: Session = Depends(get_db)):
    tracks_with_issues = db.query(Track).filter(
        or_(
            Track.title.is_(None),
            Track.title == "",
            Track.artist.is_(None),
            Track.artist == "",
            Track.album.is_(None),
            Track.album == ""
        )
    ).all()
    
    issues = []
    for track in tracks_with_issues:
        filename = os.path.basename(track.file_path)
        parsed = parse_filename(filename)
        year_from_path = extract_year_from_path(track.file_path)
        
        suggestions = {}
        if not track.title and "title" in parsed:
            suggestions["title"] = parsed["title"]
        if not track.artist and "artist" in parsed:
            suggestions["artist"] = parsed["artist"]
        if not track.album and "album" in parsed:
            suggestions["album"] = parsed["album"]
        if not track.year and year_from_path:
            suggestions["year"] = year_from_path
        if not track.track_number and "track_number" in parsed:
            suggestions["track_number"] = parsed["track_number"]
        
        missing = []
        if not track.title:
            missing.append("title")
        if not track.artist:
            missing.append("artist")
        if not track.album:
            missing.append("album")
        if not track.year:
            missing.append("year")
        
        issues.append({
            "track": {
                "id": track.id,
                "file_path": track.file_path,
                "title": track.title,
                "artist": track.artist,
                "album": track.album,
                "year": track.year,
                "track_number": track.track_number
            },
            "missing": missing,
            "suggestions": suggestions
        })
    
    return {
        "total_issues": len(issues),
        "issues": issues
    }


@router.post("/fix/{track_id}")
async def fix_track_metadata(
    track_id: int,
    title: Optional[str] = None,
    artist: Optional[str] = None,
    album: Optional[str] = None,
    year: Optional[int] = None,
    write_to_file: bool = False,
    db: Session = Depends(get_db)
):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    if title:
        track.title = title
    if artist:
        track.artist = artist
    if album:
        track.album = album
    if year:
        track.year = year
    
    from ...services.mood_mapper import get_mood_from_genre, get_decade_from_year
    if track.genre:
        track.mood = get_mood_from_genre(track.genre)
    if track.year:
        track.decade = get_decade_from_year(track.year)
    
    db.commit()
    
    if write_to_file:
        try:
            from mutagen import File
            audio = File(track.file_path, easy=True)
            if audio is not None:
                if title:
                    audio["title"] = title
                if artist:
                    audio["artist"] = artist
                if album:
                    audio["album"] = album
                if year:
                    audio["date"] = str(year)
                audio.save()
        except Exception as e:
            return {"success": True, "message": f"Database updated, but failed to write to file: {str(e)}"}
    
    return {"success": True, "message": "Metadata updated"}


@router.post("/fix-all")
async def fix_all_metadata(write_to_file: bool = False, db: Session = Depends(get_db)):
    tracks_with_issues = db.query(Track).filter(
        or_(
            Track.title.is_(None),
            Track.title == "",
            Track.artist.is_(None),
            Track.artist == ""
        )
    ).all()
    
    fixed_count = 0
    
    for track in tracks_with_issues:
        filename = os.path.basename(track.file_path)
        parsed = parse_filename(filename)
        year_from_path = extract_year_from_path(track.file_path)
        
        updated = False
        
        if (not track.title or track.title == "") and "title" in parsed:
            track.title = parsed["title"]
            updated = True
        if (not track.artist or track.artist == "") and "artist" in parsed:
            track.artist = parsed["artist"]
            updated = True
        if (not track.album or track.album == "") and "album" in parsed:
            track.album = parsed["album"]
            updated = True
        if not track.year and year_from_path:
            track.year = year_from_path
            updated = True
        
        if updated:
            from ...services.mood_mapper import get_mood_from_genre, get_decade_from_year
            if track.genre:
                track.mood = get_mood_from_genre(track.genre)
            if track.year:
                track.decade = get_decade_from_year(track.year)
            fixed_count += 1
    
    db.commit()
    
    return {"success": True, "fixed_count": fixed_count}
