from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Index
from sqlalchemy.orm import relationship
from ..database import Base


class DuplicateGroup(Base):
    """Group of duplicate tracks detected by the deduplication system."""
    __tablename__ = "duplicate_groups"

    id = Column(Integer, primary_key=True, index=True)

    # Unique hash identifying this group of duplicates
    group_hash = Column(String, unique=True, index=True, nullable=False)

    # How duplicates were detected: exact_hash, fuzzy_metadata, duration_match
    detection_type = Column(String, nullable=False)
    detection_reason = Column(String, nullable=True)

    # Status: unresolved, resolved, ignored
    status = Column(String, default="unresolved", nullable=False)

    # The track chosen as the master (best quality)
    master_track_id = Column(Integer, ForeignKey("tracks.id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    members = relationship(
        "DuplicateGroupMember",
        back_populates="group",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index('idx_dup_group_status', 'status'),
        Index('idx_dup_group_type', 'detection_type'),
    )


class DuplicateGroupMember(Base):
    """Individual track membership in a duplicate group."""
    __tablename__ = "duplicate_group_members"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys
    group_id = Column(
        Integer,
        ForeignKey("duplicate_groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    track_id = Column(
        Integer,
        ForeignKey("tracks.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Quality assessment
    quality_score = Column(Float, default=0.0)
    similarity_score = Column(Float, default=1.0)  # 1.0 for exact matches

    # Is this the recommended track to keep?
    is_master = Column(Boolean, default=False)

    # When this track was added to the group
    added_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    group = relationship("DuplicateGroup", back_populates="members")
    track = relationship("Track")

    __table_args__ = (
        Index('idx_dup_member_group_track', 'group_id', 'track_id', unique=True),
    )
