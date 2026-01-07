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
