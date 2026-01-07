from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean, JSON
from ..database import Base

class PlayerState(Base):
    __tablename__ = "player_state"
    
    id = Column(Integer, primary_key=True, default=1)
    current_track_id = Column(Integer, ForeignKey("tracks.id", ondelete="SET NULL"), nullable=True)
    position_ms = Column(Integer, default=0)
    volume = Column(Float, default=0.8)
    shuffle_enabled = Column(Boolean, default=False)
    repeat_mode = Column(String, default="none")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class QueueItem(Base):
    __tablename__ = "queue_items"
    
    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(Integer, ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, nullable=False, default=0)
    added_at = Column(DateTime, default=datetime.utcnow)
