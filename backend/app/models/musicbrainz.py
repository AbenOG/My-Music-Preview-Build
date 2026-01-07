from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Index
from ..database import Base


class MusicBrainzCache(Base):
    """Cache for MusicBrainz API lookup results."""
    __tablename__ = "musicbrainz_cache"

    id = Column(Integer, primary_key=True, index=True)

    # Search key (hash of normalized artist+title+album)
    search_key = Column(String, unique=True, index=True, nullable=False)

    # MusicBrainz IDs
    recording_mbid = Column(String, nullable=True)
    release_mbid = Column(String, nullable=True)
    artist_mbid = Column(String, nullable=True)

    # Canonical data from MusicBrainz
    canonical_artist = Column(String, nullable=True)
    canonical_title = Column(String, nullable=True)
    canonical_album = Column(String, nullable=True)
    canonical_year = Column(Integer, nullable=True)
    canonical_genre = Column(String, nullable=True)

    # Lookup status: pending, found, not_found, error
    lookup_status = Column(String, default="pending", nullable=False)
    error_message = Column(String, nullable=True)

    # Cache metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    last_queried_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_mb_cache_status', 'lookup_status'),
    )
