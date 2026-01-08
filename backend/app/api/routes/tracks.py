from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
from datetime import datetime, timedelta
from ...database import get_db
from ...models.track import Track, LikedSong, PlayHistory
from ...schemas.track import (
    TrackResponse, TrackListResponse, 
    PlayHistoryResponse, PlayHistoryCreate
)
from ...services.mood_mapper import get_all_moods, get_all_activities, matches_activity
from ...services.recommendations import get_recommendations, get_similar_artists

router = APIRouter(prefix="/tracks", tags=["tracks"])

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
        is_liked=is_liked,
        loudness_integrated=track.loudness_integrated,
        loudness_true_peak=track.loudness_true_peak,
        loudness_range=track.loudness_range,
        loudness_gain=track.loudness_gain,
    )

@router.get("", response_model=TrackListResponse)
async def list_tracks(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=2000),
    artist: Optional[str] = None,
    album: Optional[str] = None,
    genre: Optional[str] = None,
    sort_by: str = Query("title", pattern="^(title|artist|album|created_at|duration_ms)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    query = db.query(Track)
    
    if artist:
        query = query.filter(Track.artist.ilike(f"%{artist}%"))
    if album:
        query = query.filter(Track.album.ilike(f"%{album}%"))
    if genre:
        query = query.filter(Track.genre.ilike(f"%{genre}%"))
    
    total = query.count()
    
    sort_column = getattr(Track, sort_by)
    if sort_order == "desc":
        sort_column = sort_column.desc()
    query = query.order_by(sort_column)
    
    offset = (page - 1) * per_page
    tracks = query.offset(offset).limit(per_page).all()
    
    total_pages = (total + per_page - 1) // per_page
    
    return TrackListResponse(
        tracks=[get_track_response(t, db) for t in tracks],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

@router.get("/search")
async def search_tracks(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Track).filter(
        or_(
            Track.title.ilike(f"%{q}%"),
            Track.artist.ilike(f"%{q}%"),
            Track.album.ilike(f"%{q}%")
        )
    ).limit(limit)
    
    tracks = query.all()
    return [get_track_response(t, db) for t in tracks]

@router.get("/recent", response_model=List[TrackResponse])
async def get_recent_tracks(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    tracks = db.query(Track).order_by(Track.created_at.desc()).limit(limit).all()
    return [get_track_response(t, db) for t in tracks]

@router.get("/stats")
async def get_library_stats(db: Session = Depends(get_db)):
    total_tracks = db.query(func.count(Track.id)).scalar()
    total_duration = db.query(func.sum(Track.duration_ms)).scalar() or 0
    total_size = db.query(func.sum(Track.file_size)).scalar() or 0
    total_albums = db.query(func.count(func.distinct(Track.album))).filter(Track.album.isnot(None)).scalar()
    total_artists = db.query(func.count(func.distinct(Track.artist))).filter(Track.artist.isnot(None)).scalar()
    
    genres = db.query(Track.genre, func.count(Track.id)).filter(
        Track.genre.isnot(None)
    ).group_by(Track.genre).all()
    
    return {
        "total_tracks": total_tracks,
        "total_duration_ms": total_duration,
        "total_size_bytes": total_size,
        "total_albums": total_albums,
        "total_artists": total_artists,
        "genres": [{"name": g[0], "count": g[1]} for g in genres if g[0]]
    }

@router.get("/discover/moods")
async def get_moods(db: Session = Depends(get_db)):
    moods = get_all_moods()
    result = []
    
    for mood in moods:
        count = db.query(func.count(Track.id)).filter(Track.mood == mood).scalar()
        if count > 0:
            sample_track = db.query(Track).filter(
                Track.mood == mood, 
                Track.artwork_path.isnot(None)
            ).first()
            result.append({
                "name": mood,
                "track_count": count,
                "cover_track_id": sample_track.id if sample_track else None
            })
    
    return result

@router.get("/discover/by-mood/{mood}")
async def get_tracks_by_mood(
    mood: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    tracks = db.query(Track).filter(Track.mood == mood).order_by(func.random()).limit(limit).all()
    return [get_track_response(t, db) for t in tracks]

@router.get("/discover/decades")
async def get_decades(db: Session = Depends(get_db)):
    decades = db.query(
        Track.decade, 
        func.count(Track.id).label('count')
    ).filter(
        Track.decade.isnot(None)
    ).group_by(Track.decade).order_by(Track.decade).all()
    
    decade_colors = {
        "1960s": {"from": "#f59e0b", "to": "#d97706"},
        "1970s": {"from": "#84cc16", "to": "#65a30d"},
        "1980s": {"from": "#ec4899", "to": "#a855f7"},
        "1990s": {"from": "#14b8a6", "to": "#f97316"},
        "2000s": {"from": "#6366f1", "to": "#3b82f6"},
        "2010s": {"from": "#f472b6", "to": "#c084fc"},
        "2020s": {"from": "#1f2937", "to": "#4b5563"},
    }
    
    result = []
    for decade, count in decades:
        if decade and count > 0:
            colors = decade_colors.get(decade, {"from": "#6b7280", "to": "#9ca3af"})
            sample = db.query(Track).filter(
                Track.decade == decade,
                Track.artwork_path.isnot(None)
            ).first()
            result.append({
                "decade": decade,
                "track_count": count,
                "colors": colors,
                "cover_track_id": sample.id if sample else None
            })
    
    return result

@router.get("/discover/by-decade/{decade}")
async def get_tracks_by_decade(
    decade: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    tracks = db.query(Track).filter(Track.decade == decade).order_by(func.random()).limit(limit).all()
    return [get_track_response(t, db) for t in tracks]

@router.get("/discover/activities")
async def get_activities(db: Session = Depends(get_db)):
    activities = get_all_activities()
    result = []
    
    activity_icons = {
        "Workout": "dumbbell",
        "Focus": "brain",
        "Sleep": "moon",
        "Party": "party-popper"
    }
    
    activity_colors = {
        "Workout": {"from": "#ef4444", "to": "#f97316"},
        "Focus": {"from": "#6366f1", "to": "#8b5cf6"},
        "Sleep": {"from": "#1e3a5f", "to": "#312e81"},
        "Party": {"from": "#ec4899", "to": "#f59e0b"},
    }
    
    for activity in activities:
        tracks = db.query(Track).all()
        matching = [t for t in tracks if matches_activity(t.genre, t.mood, activity)]
        count = len(matching)
        
        if count > 0:
            sample = next((t for t in matching if t.artwork_path), None)
            total_duration = sum(t.duration_ms or 0 for t in matching[:50])
            result.append({
                "name": activity,
                "track_count": count,
                "total_duration_ms": total_duration,
                "icon": activity_icons.get(activity, "music"),
                "colors": activity_colors.get(activity, {"from": "#6b7280", "to": "#9ca3af"}),
                "cover_track_id": sample.id if sample else None
            })
    
    return result

@router.get("/discover/by-activity/{activity}")
async def get_tracks_by_activity(
    activity: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    tracks = db.query(Track).all()
    matching = [t for t in tracks if matches_activity(t.genre, t.mood, activity)]
    
    import random
    random.shuffle(matching)
    matching = matching[:limit]
    
    return [get_track_response(t, db) for t in matching]

@router.get("/discover/recommendations")
async def get_track_recommendations(
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db)
):
    recommendations = get_recommendations(db, limit)
    return [
        {
            "track": get_track_response(r["track"], db),
            "reason": r.get("reason", "Recommended for you")
        }
        for r in recommendations
    ]

@router.get("/discover/new-additions")
async def get_new_additions(
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    albums = db.query(
        Track.album,
        Track.artist,
        func.min(Track.id).label('sample_id'),
        func.count(Track.id).label('track_count'),
        func.min(Track.created_at).label('added_at')
    ).filter(
        Track.created_at >= cutoff,
        Track.album.isnot(None)
    ).group_by(
        Track.album, Track.artist
    ).order_by(desc('added_at')).limit(limit).all()
    
    result = []
    for album in albums:
        sample_track = db.query(Track).filter(Track.id == album.sample_id).first()
        result.append({
            "album": album.album,
            "artist": album.artist,
            "track_count": album.track_count,
            "added_at": album.added_at.isoformat() if album.added_at else None,
            "cover_track_id": sample_track.id if sample_track else None
        })
    
    return result

@router.get("/discover/similar-artists/{artist_name}")
async def get_similar_artists_route(
    artist_name: str,
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db)
):
    similar = get_similar_artists(db, artist_name, limit)
    
    result = []
    for artist in similar:
        sample = db.query(Track).filter(
            Track.artist == artist,
            Track.artwork_path.isnot(None)
        ).first()
        track_count = db.query(func.count(Track.id)).filter(Track.artist == artist).scalar()
        result.append({
            "artist": artist,
            "track_count": track_count,
            "cover_track_id": sample.id if sample else None
        })
    
    return result

@router.post("/{track_id}/play")
async def log_play(track_id: int, db: Session = Depends(get_db)):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    track.play_count = (track.play_count or 0) + 1
    track.last_played_at = datetime.utcnow()
    
    play_entry = PlayHistory(track_id=track_id)
    db.add(play_entry)
    db.commit()
    
    return {"success": True}

@router.get("/listening-stats")
async def get_listening_stats(db: Session = Depends(get_db)):
    total_plays = db.query(func.sum(Track.play_count)).scalar() or 0
    
    total_duration_played = db.query(
        func.sum(Track.duration_ms * Track.play_count)
    ).filter(Track.play_count > 0).scalar() or 0
    
    most_played_artist = db.query(
        Track.artist,
        func.sum(Track.play_count).label('plays')
    ).filter(
        Track.artist.isnot(None),
        Track.play_count > 0
    ).group_by(Track.artist).order_by(desc('plays')).first()
    
    most_played_genre = db.query(
        Track.genre,
        func.sum(Track.play_count).label('plays')
    ).filter(
        Track.genre.isnot(None),
        Track.play_count > 0
    ).group_by(Track.genre).order_by(desc('plays')).first()
    
    track_count = db.query(func.count(Track.id)).scalar() or 0
    
    return {
        "total_plays": total_plays,
        "total_duration_ms": total_duration_played,
        "most_played_artist": most_played_artist[0] if most_played_artist else None,
        "most_played_genre": most_played_genre[0] if most_played_genre else None,
        "track_count": track_count
    }

@router.get("/continue-listening")
async def get_continue_listening(
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db)
):
    from sqlalchemy.orm import aliased
    
    subquery = db.query(
        PlayHistory.track_id,
        func.max(PlayHistory.played_at).label('last_played')
    ).group_by(PlayHistory.track_id).subquery()
    
    recent_tracks = db.query(Track).join(
        subquery, Track.id == subquery.c.track_id
    ).order_by(desc(subquery.c.last_played)).limit(limit).all()

    return [get_track_response(track, db) for track in recent_tracks]


@router.get("/recently-played/albums")
async def get_recently_played_albums(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get albums sorted by most recent play time."""
    # Get the most recent play for each track
    subquery = db.query(
        PlayHistory.track_id,
        func.max(PlayHistory.played_at).label('last_played')
    ).group_by(PlayHistory.track_id).subquery()

    # Join with tracks and group by album
    albums = db.query(
        Track.album,
        Track.artist,
        func.max(subquery.c.last_played).label('last_played'),
        func.count(func.distinct(Track.id)).label('track_count'),
        func.sum(Track.duration_ms).label('total_duration'),
        func.min(Track.artwork_path).label('artwork_path')
    ).join(
        subquery, Track.id == subquery.c.track_id
    ).filter(
        Track.album.isnot(None)
    ).group_by(
        Track.album, Track.artist
    ).order_by(
        desc('last_played')
    ).limit(limit).all()

    result = []
    for album in albums:
        result.append({
            "name": album.album,
            "artist": album.artist,
            "last_played": album.last_played.isoformat() if album.last_played else None,
            "track_count": album.track_count,
            "total_duration_ms": album.total_duration or 0,
            "artwork_path": album.artwork_path
        })

    return result


@router.get("/recently-played/artists")
async def get_recently_played_artists(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get artists sorted by most recent play time."""
    # Get the most recent play for each track
    subquery = db.query(
        PlayHistory.track_id,
        func.max(PlayHistory.played_at).label('last_played')
    ).group_by(PlayHistory.track_id).subquery()

    # Join with tracks and group by artist
    artists = db.query(
        Track.artist,
        func.max(subquery.c.last_played).label('last_played'),
        func.count(func.distinct(Track.id)).label('track_count'),
        func.count(func.distinct(Track.album)).label('album_count'),
        func.min(Track.artwork_path).label('artwork_path')
    ).join(
        subquery, Track.id == subquery.c.track_id
    ).filter(
        Track.artist.isnot(None)
    ).group_by(
        Track.artist
    ).order_by(
        desc('last_played')
    ).limit(limit).all()

    result = []
    for artist in artists:
        result.append({
            "name": artist.artist,
            "last_played": artist.last_played.isoformat() if artist.last_played else None,
            "track_count": artist.track_count,
            "album_count": artist.album_count,
            "artwork_path": artist.artwork_path
        })

    return result


# NOTE: These catch-all routes MUST be at the end of the file
# to avoid matching specific routes like /continue-listening

@router.get("/{track_id}", response_model=TrackResponse)
async def get_track(track_id: int, db: Session = Depends(get_db)):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return get_track_response(track, db)

@router.post("/{track_id}/rescan")
async def rescan_track(track_id: int, db: Session = Depends(get_db)):
    from ...services.metadata import metadata_extractor
    from ...services.loudness import loudness_analyzer

    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    try:
        metadata = metadata_extractor.extract(track.file_path)

        track.title = metadata.get("title") or track.title
        track.artist = metadata.get("artist")
        track.album = metadata.get("album")
        track.album_artist = metadata.get("album_artist")
        track.genre = metadata.get("genre")
        track.year = metadata.get("year")
        track.track_number = metadata.get("track_number")
        track.disc_number = metadata.get("disc_number")
        track.duration_ms = metadata.get("duration_ms")
        track.bitrate = metadata.get("bitrate")
        track.sample_rate = metadata.get("sample_rate")
        track.artwork_path = metadata.get("artwork_path")

        # Re-analyze loudness
        loudness_data = loudness_analyzer.analyze(track.file_path)
        track.loudness_integrated = loudness_data.get("integrated")
        track.loudness_true_peak = loudness_data.get("true_peak")
        track.loudness_range = loudness_data.get("range")
        track.loudness_gain = loudness_data.get("gain")

        db.commit()
        db.refresh(track)

        return {
            "success": True,
            "message": "Track metadata rescanned successfully",
            "track": get_track_response(track, db)
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to rescan: {str(e)}",
            "track": get_track_response(track, db)
        }
