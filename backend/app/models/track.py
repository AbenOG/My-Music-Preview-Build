from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from ..database import Base


class Track(Base):
    __tablename__ = "tracks"

    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False, index=True)
    artist = Column(String, nullable=True, index=True)
    album = Column(String, nullable=True, index=True)
    album_artist = Column(String, nullable=True)
    genre = Column(String, nullable=True, index=True)
    year = Column(Integer, nullable=True)
    track_number = Column(Integer, nullable=True)
    disc_number = Column(Integer, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    bitrate = Column(Integer, nullable=True)
    sample_rate = Column(Integer, nullable=True)
    format = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    artwork_path = Column(String, nullable=True)
    file_hash = Column(String, nullable=True, index=True)
    is_duplicate = Column(Boolean, default=False)
    duplicate_group_id = Column(Integer, nullable=True, index=True)
    mood = Column(String, nullable=True, index=True)
    decade = Column(String, nullable=True, index=True)
    play_count = Column(Integer, default=0)
    last_played_at = Column(DateTime, nullable=True)
    folder_id = Column(
        Integer, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True
    )

    # Normalized fields for searching/grouping (lowercase, cleaned)
    artist_normalized = Column(String, nullable=True, index=True)
    album_normalized = Column(String, nullable=True, index=True)
    title_normalized = Column(String, nullable=True, index=True)

    # Original display values (preserved when different from normalized)
    artist_original = Column(String, nullable=True)
    album_original = Column(String, nullable=True)
    title_original = Column(String, nullable=True)

    # MusicBrainz integration
    musicbrainz_recording_id = Column(String, nullable=True, index=True)
    musicbrainz_release_id = Column(String, nullable=True)
    musicbrainz_artist_id = Column(String, nullable=True)
    musicbrainz_lookup_at = Column(DateTime, nullable=True)

    # Metadata quality score (0-100)
    metadata_completeness = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    folder = relationship("Folder", backref="tracks")


class LikedSong(Base):
    __tablename__ = "liked_songs"

    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(
        Integer,
        ForeignKey("tracks.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    liked_at = Column(DateTime, default=datetime.utcnow)

    track = relationship("Track", backref="liked", passive_deletes="all")


class PlayHistory(Base):
    __tablename__ = "play_history"

    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(
        Integer, ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False
    )
    played_at = Column(DateTime, default=datetime.utcnow, index=True)
    play_duration_ms = Column(Integer, nullable=True)

    track = relationship("Track", backref="play_history", passive_deletes="all")
