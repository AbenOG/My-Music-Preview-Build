from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from ..models.track import Track, PlayHistory, LikedSong


def get_recommendations(db: Session, limit: int = 30) -> List[Dict[str, Any]]:
    top_played = db.query(
        Track.artist,
        Track.genre,
        func.count(PlayHistory.id).label('play_count')
    ).join(
        PlayHistory, Track.id == PlayHistory.track_id
    ).group_by(
        Track.artist, Track.genre
    ).order_by(
        desc('play_count')
    ).limit(20).all()
    
    if not top_played:
        recent_tracks = db.query(Track).order_by(desc(Track.created_at)).limit(limit).all()
        return [{"track": t, "reason": "Recently added"} for t in recent_tracks]
    
    top_artists = [r.artist for r in top_played if r.artist]
    top_genres = [r.genre for r in top_played if r.genre]
    
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    
    played_today_ids = db.query(PlayHistory.track_id).filter(
        PlayHistory.played_at >= today_start
    ).distinct().all()
    played_today_ids = [p[0] for p in played_today_ids]
    
    liked_ids = db.query(LikedSong.track_id).all()
    liked_ids = set(p[0] for p in liked_ids)
    
    recommendations = []
    
    if top_artists:
        artist_tracks = db.query(Track).filter(
            Track.artist.in_(top_artists),
            Track.id.notin_(played_today_ids) if played_today_ids else True
        ).order_by(func.random()).limit(15).all()
        
        for track in artist_tracks:
            score = 40
            if track.id in liked_ids:
                score += 30
            recommendations.append({
                "track": track,
                "reason": f"Because you listen to {track.artist}",
                "score": score
            })
    
    if top_genres:
        genre_tracks = db.query(Track).filter(
            Track.genre.in_(top_genres),
            Track.id.notin_(played_today_ids) if played_today_ids else True,
            Track.id.notin_([r["track"].id for r in recommendations]) if recommendations else True
        ).order_by(func.random()).limit(15).all()
        
        for track in genre_tracks:
            score = 30
            if track.id in liked_ids:
                score += 30
            recommendations.append({
                "track": track,
                "reason": f"Based on your love for {track.genre}",
                "score": score
            })
    
    recommendations.sort(key=lambda x: x.get("score", 0), reverse=True)
    
    return recommendations[:limit]


def get_similar_artists(db: Session, artist_name: str, limit: int = 10) -> List[str]:
    artist_tracks = db.query(Track).filter(Track.artist == artist_name).all()
    if not artist_tracks:
        return []
    
    genres = set(t.genre for t in artist_tracks if t.genre)
    decades = set(t.decade for t in artist_tracks if t.decade)
    
    similar_query = db.query(Track.artist, func.count(Track.id).label('count')).filter(
        Track.artist != artist_name,
        Track.artist.isnot(None)
    )
    
    if genres:
        similar_query = similar_query.filter(Track.genre.in_(genres))
    
    similar_artists = similar_query.group_by(Track.artist).order_by(
        desc('count')
    ).limit(limit).all()
    
    return [a.artist for a in similar_artists]


def get_similar_albums(db: Session, album_name: str, limit: int = 10) -> List[Dict[str, Any]]:
    album_tracks = db.query(Track).filter(Track.album == album_name).first()
    if not album_tracks:
        return []

    artist = album_tracks.artist
    genre = album_tracks.genre
    decade = album_tracks.decade

    similar_query = db.query(
        Track.album,
        Track.artist,
        func.min(Track.artwork_path).label('artwork'),
        func.count(Track.id).label('track_count')
    ).filter(
        Track.album != album_name,
        Track.album.isnot(None)
    )

    if artist:
        similar_query = similar_query.filter(
            (Track.artist == artist) | (Track.genre == genre)
        )
    elif genre:
        similar_query = similar_query.filter(Track.genre == genre)

    similar_albums = similar_query.group_by(
        Track.album, Track.artist
    ).order_by(desc('track_count')).limit(limit).all()

    return [
        {
            "album": a.album,
            "artist": a.artist,
            "artwork": a.artwork,
            "track_count": a.track_count
        }
        for a in similar_albums
    ]


def get_radio_tracks(
    db: Session,
    seed_track: Track,
    limit: int = 40,
    exclude_ids: List[int] = None
) -> List[Track]:
    """
    Generate radio-style recommendations based on a seed track.
    Uses a scoring system to find similar tracks with variety.

    Scoring:
    - Same artist: +50 points
    - Same genre: +30 points
    - Same decade: +20 points
    - Same mood: +15 points
    - Liked track: +25 points
    """
    import random

    if exclude_ids is None:
        exclude_ids = []

    # Always exclude the seed track
    exclude_ids = list(set(exclude_ids + [seed_track.id]))

    # Get liked track IDs for bonus scoring
    liked_ids = set(
        lid[0] for lid in db.query(LikedSong.track_id).all()
    )

    # Get all available tracks
    all_tracks = db.query(Track).filter(
        Track.id.notin_(exclude_ids)
    ).all()

    if not all_tracks:
        return []

    # Score each track
    scored_tracks = []
    for track in all_tracks:
        score = 0

        # Same artist: +50 points
        if track.artist and track.artist == seed_track.artist:
            score += 50

        # Same genre: +30 points
        if track.genre and track.genre == seed_track.genre:
            score += 30

        # Same decade: +20 points
        if track.decade and track.decade == seed_track.decade:
            score += 20

        # Same mood: +15 points
        if track.mood and track.mood == seed_track.mood:
            score += 15

        # Liked track: +25 points
        if track.id in liked_ids:
            score += 25

        # Only include tracks with some relevance (score > 0)
        # or add some random tracks for variety
        if score > 0:
            scored_tracks.append((track, score))

    # If not enough scored tracks, add some random ones
    if len(scored_tracks) < limit:
        random_tracks = [t for t in all_tracks if not any(st[0].id == t.id for st in scored_tracks)]
        random.shuffle(random_tracks)
        for track in random_tracks[:limit - len(scored_tracks)]:
            scored_tracks.append((track, 5))  # Base score for variety

    # Sort by score (descending) then shuffle within score tiers for variety
    scored_tracks.sort(key=lambda x: x[1], reverse=True)

    # Group by score tiers and shuffle within each tier
    result = []
    current_tier = []
    current_score = None

    for track, score in scored_tracks:
        if current_score is None:
            current_score = score

        if score == current_score:
            current_tier.append(track)
        else:
            random.shuffle(current_tier)
            result.extend(current_tier)
            current_tier = [track]
            current_score = score

    # Don't forget the last tier
    if current_tier:
        random.shuffle(current_tier)
        result.extend(current_tier)

    # Limit to avoid too many from same artist clustering at the top
    # Take tracks but ensure variety
    final_result = []
    artist_counts = {}
    max_per_artist = max(5, limit // 8)  # At most ~5 tracks per artist for a 40-track playlist

    for track in result:
        artist = track.artist or "Unknown"
        if artist_counts.get(artist, 0) < max_per_artist:
            final_result.append(track)
            artist_counts[artist] = artist_counts.get(artist, 0) + 1

        if len(final_result) >= limit:
            break

    return final_result
