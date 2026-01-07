import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from ..models.playlist import Playlist, PlaylistTrack
from ..models.track import Track, PlayHistory

SMART_PLAYLIST_RULES = {
    "recently_added": {
        "name": "Recently Added",
        "description": "Tracks added in the last 30 days",
        "icon": "sparkles",
        "query": lambda db: db.query(Track).filter(
            Track.created_at >= datetime.utcnow() - timedelta(days=30)
        ).order_by(desc(Track.created_at)).limit(100)
    },
    "most_played": {
        "name": "Most Played",
        "description": "Your top 50 most played tracks",
        "icon": "flame",
        "query": lambda db: db.query(Track).filter(
            Track.play_count > 0
        ).order_by(desc(Track.play_count)).limit(50)
    },
    "recently_played": {
        "name": "Recently Played",
        "description": "Tracks you played recently",
        "icon": "clock",
        "query": lambda db: db.query(Track).filter(
            Track.last_played_at.isnot(None)
        ).order_by(desc(Track.last_played_at)).limit(50)
    },
    "hidden_gems": {
        "name": "Hidden Gems",
        "description": "Great tracks you haven't played much",
        "icon": "gem",
        "query": lambda db: db.query(Track).filter(
            Track.play_count < 3,
            Track.created_at <= datetime.utcnow() - timedelta(days=7)
        ).order_by(func.random()).limit(50)
    },
}


def get_smart_playlists(db: Session) -> List[Dict[str, Any]]:
    result = []
    
    for rule_id, rule in SMART_PLAYLIST_RULES.items():
        tracks = rule["query"](db).all()
        result.append({
            "id": f"smart_{rule_id}",
            "name": rule["name"],
            "description": rule["description"],
            "icon": rule["icon"],
            "track_count": len(tracks),
            "is_smart": True,
        })
    
    return result


def get_smart_playlist_tracks(db: Session, rule_id: str) -> List[Track]:
    rule = SMART_PLAYLIST_RULES.get(rule_id)
    if not rule:
        return []
    
    return rule["query"](db).all()


def refresh_smart_playlist(db: Session, playlist_id: int) -> bool:
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist or not playlist.is_smart or not playlist.smart_rules:
        return False
    
    try:
        rules = json.loads(playlist.smart_rules)
        rule_type = rules.get("type")
        
        if rule_type not in SMART_PLAYLIST_RULES:
            return False
        
        db.query(PlaylistTrack).filter(PlaylistTrack.playlist_id == playlist_id).delete()
        
        tracks = SMART_PLAYLIST_RULES[rule_type]["query"](db).all()
        
        for i, track in enumerate(tracks):
            playlist_track = PlaylistTrack(
                playlist_id=playlist_id,
                track_id=track.id,
                position=i
            )
            db.add(playlist_track)
        
        playlist.updated_at = datetime.utcnow()
        db.commit()
        
        return True
    except Exception as e:
        print(f"Error refreshing smart playlist: {e}")
        return False
