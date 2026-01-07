from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.track import Track, LikedSong, PlayHistory
from ...models.player_state import PlayerState, QueueItem
from ...schemas.track import TrackResponse, LikedSongResponse, PlayHistoryResponse, PlayHistoryCreate
from ...schemas.player import (
    PlayerStateResponse, PlayerStateUpdate, 
    QueueResponse, QueueUpdate, QueueAddRequest
)

router = APIRouter(tags=["player"])

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

@router.get("/liked", response_model=List[TrackResponse])
async def get_liked_songs(db: Session = Depends(get_db)):
    liked = db.query(LikedSong).order_by(LikedSong.liked_at.desc()).all()
    tracks = []
    for l in liked:
        track = db.query(Track).filter(Track.id == l.track_id).first()
        if track:
            tracks.append(get_track_response(track, db))
    return tracks

@router.post("/liked/{track_id}")
async def like_song(track_id: int, db: Session = Depends(get_db)):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    existing = db.query(LikedSong).filter(LikedSong.track_id == track_id).first()
    if existing:
        return {"message": "Already liked", "is_liked": True}
    
    liked = LikedSong(track_id=track_id)
    db.add(liked)
    db.commit()
    
    return {"message": "Song liked", "is_liked": True}

@router.delete("/liked/{track_id}")
async def unlike_song(track_id: int, db: Session = Depends(get_db)):
    liked = db.query(LikedSong).filter(LikedSong.track_id == track_id).first()
    if not liked:
        return {"message": "Not liked", "is_liked": False}
    
    db.delete(liked)
    db.commit()
    
    return {"message": "Song unliked", "is_liked": False}

@router.get("/liked/{track_id}/status")
async def check_liked_status(track_id: int, db: Session = Depends(get_db)):
    liked = db.query(LikedSong).filter(LikedSong.track_id == track_id).first()
    return {"is_liked": liked is not None}

@router.get("/history", response_model=List[PlayHistoryResponse])
async def get_play_history(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    history = db.query(PlayHistory).order_by(
        PlayHistory.played_at.desc()
    ).limit(limit).all()
    
    result = []
    for h in history:
        track = db.query(Track).filter(Track.id == h.track_id).first()
        if track:
            result.append(PlayHistoryResponse(
                id=h.id,
                track_id=h.track_id,
                played_at=h.played_at,
                play_duration_ms=h.play_duration_ms,
                track=get_track_response(track, db)
            ))
    
    return result

@router.post("/history")
async def log_play(
    data: PlayHistoryCreate,
    db: Session = Depends(get_db)
):
    track = db.query(Track).filter(Track.id == data.track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    history = PlayHistory(
        track_id=data.track_id,
        play_duration_ms=data.play_duration_ms
    )
    db.add(history)
    db.commit()
    
    return {"message": "Play logged"}

@router.get("/player/state", response_model=PlayerStateResponse)
async def get_player_state(db: Session = Depends(get_db)):
    state = db.query(PlayerState).first()
    if not state:
        state = PlayerState(id=1)
        db.add(state)
        db.commit()
        db.refresh(state)
    
    return PlayerStateResponse(
        id=state.id,
        current_track_id=state.current_track_id,
        position_ms=state.position_ms,
        volume=state.volume,
        shuffle_enabled=state.shuffle_enabled,
        repeat_mode=state.repeat_mode,
        updated_at=state.updated_at
    )

@router.put("/player/state", response_model=PlayerStateResponse)
async def update_player_state(
    data: PlayerStateUpdate,
    db: Session = Depends(get_db)
):
    state = db.query(PlayerState).first()
    if not state:
        state = PlayerState(id=1)
        db.add(state)
    
    state.current_track_id = data.current_track_id
    state.position_ms = data.position_ms
    state.volume = data.volume
    state.shuffle_enabled = data.shuffle_enabled
    state.repeat_mode = data.repeat_mode
    state.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(state)
    
    return PlayerStateResponse(
        id=state.id,
        current_track_id=state.current_track_id,
        position_ms=state.position_ms,
        volume=state.volume,
        shuffle_enabled=state.shuffle_enabled,
        repeat_mode=state.repeat_mode,
        updated_at=state.updated_at
    )

@router.get("/queue", response_model=QueueResponse)
async def get_queue(db: Session = Depends(get_db)):
    queue_items = db.query(QueueItem).order_by(QueueItem.position).all()
    return QueueResponse(
        tracks=[item.track_id for item in queue_items],
        current_index=0
    )

@router.put("/queue")
async def update_queue(
    data: QueueUpdate,
    db: Session = Depends(get_db)
):
    db.query(QueueItem).delete()
    
    for i, track_id in enumerate(data.track_ids):
        item = QueueItem(track_id=track_id, position=i)
        db.add(item)
    
    db.commit()
    
    return {"message": "Queue updated"}

@router.post("/queue/add")
async def add_to_queue(
    data: QueueAddRequest,
    db: Session = Depends(get_db)
):
    track = db.query(Track).filter(Track.id == data.track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    if data.position is not None:
        db.query(QueueItem).filter(
            QueueItem.position >= data.position
        ).update({QueueItem.position: QueueItem.position + 1})
        position = data.position
    else:
        max_pos = db.query(QueueItem).order_by(QueueItem.position.desc()).first()
        position = (max_pos.position + 1) if max_pos else 0
    
    item = QueueItem(track_id=data.track_id, position=position)
    db.add(item)
    db.commit()
    
    return {"message": "Added to queue"}

@router.delete("/queue/clear")
async def clear_queue(db: Session = Depends(get_db)):
    db.query(QueueItem).delete()
    db.commit()
    return {"message": "Queue cleared"}
