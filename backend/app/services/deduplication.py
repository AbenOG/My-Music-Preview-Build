"""
Advanced deduplication service with fuzzy matching, quality scoring, and merge capabilities.
"""

import hashlib
import os
import asyncio
from typing import List, Dict, Any, Optional, Callable
from collections import defaultdict
from datetime import datetime
from difflib import SequenceMatcher
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models.track import Track, PlayHistory, LikedSong
from ..models.playlist import PlaylistTrack
from ..models.duplicate import DuplicateGroup, DuplicateGroupMember
from .normalizer import normalizer


class DuplicateDetectionProgress:
    """Track progress of duplicate detection."""

    def __init__(self):
        self.is_running = False
        self.phase = "idle"  # idle, hash_matching, fuzzy_matching, duration_matching, creating_groups, complete
        self.total_tracks = 0
        self.processed_tracks = 0
        self.current_track = ""
        self.groups_found = 0
        self.duplicates_found = 0
        self.error = None

    @property
    def progress(self) -> float:
        if self.total_tracks == 0:
            return 0.0
        return (self.processed_tracks / self.total_tracks) * 100

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "phase": self.phase,
            "total_tracks": self.total_tracks,
            "processed_tracks": self.processed_tracks,
            "current_track": self.current_track,
            "progress": round(self.progress, 1),
            "groups_found": self.groups_found,
            "duplicates_found": self.duplicates_found,
            "error": self.error
        }

    def reset(self):
        self.is_running = False
        self.phase = "idle"
        self.total_tracks = 0
        self.processed_tracks = 0
        self.current_track = ""
        self.groups_found = 0
        self.duplicates_found = 0
        self.error = None


# Global progress tracker
duplicate_detection_progress = DuplicateDetectionProgress()


class DeduplicationService:
    """
    Advanced deduplication service with fuzzy matching,
    quality scoring, and merge capabilities.
    """

    # Quality weights for scoring
    QUALITY_WEIGHTS = {
        "bitrate": 0.25,         # Higher bitrate = better
        "sample_rate": 0.15,     # Higher sample rate = better
        "format_score": 0.20,    # Format quality (FLAC > MP3 > etc)
        "completeness": 0.20,    # Metadata completeness
        "artwork": 0.10,         # Has artwork
        "file_size": 0.10,       # Larger = usually better quality
    }

    # Format quality scores (higher = better)
    FORMAT_SCORES = {
        "FLAC": 100,
        "WAV": 95,
        "ALAC": 90,
        "M4A": 80,
        "AAC": 75,
        "OGG": 70,
        "MP3": 60,
        "WMA": 50,
    }

    # Similarity threshold for fuzzy matching
    FUZZY_THRESHOLD = 0.85

    # Duration tolerance in milliseconds
    DURATION_TOLERANCE_MS = 2000  # ±2 seconds

    def find_all_duplicates(self, db: Session, progress: DuplicateDetectionProgress = None) -> Dict[str, Any]:
        """
        Comprehensive duplicate detection combining multiple methods:
        1. Exact file hash matches
        2. Fuzzy metadata matching
        3. Duration-based similarity
        """
        if progress is None:
            progress = duplicate_detection_progress

        try:
            progress.is_running = True
            progress.phase = "initializing"
            progress.error = None

            # Clear existing unresolved groups
            db.query(DuplicateGroupMember).filter(
                DuplicateGroupMember.group.has(DuplicateGroup.status == "unresolved")
            ).delete(synchronize_session=False)
            db.query(DuplicateGroup).filter(
                DuplicateGroup.status == "unresolved"
            ).delete(synchronize_session=False)
            db.commit()

            all_tracks = db.query(Track).all()
            progress.total_tracks = len(all_tracks)
            duplicate_groups = []
            seen_track_ids = set()

            # Method 1: Exact hash matches
            progress.phase = "hash_matching"
            progress.current_track = "Analyzing file hashes..."
            hash_groups = self._find_exact_hash_duplicates(all_tracks, progress)
            for group_tracks in hash_groups:
                if len(group_tracks) > 1:
                    group_ids = [t.id for t in group_tracks]
                    if not any(tid in seen_track_ids for tid in group_ids):
                        group = self._create_duplicate_group(
                            db, group_tracks, "exact_hash", "Identical file content"
                        )
                        duplicate_groups.append(group)
                        seen_track_ids.update(group_ids)
                        progress.groups_found = len(duplicate_groups)
                        progress.duplicates_found = sum(len(g.members) - 1 for g in duplicate_groups)

            # Method 2: Fuzzy metadata matching on normalized fields
            progress.phase = "fuzzy_matching"
            remaining_tracks = [t for t in all_tracks if t.id not in seen_track_ids]
            fuzzy_groups = self._find_fuzzy_metadata_duplicates(remaining_tracks, progress)
            for group_tracks in fuzzy_groups:
                if len(group_tracks) > 1:
                    group_ids = [t.id for t in group_tracks]
                    if not any(tid in seen_track_ids for tid in group_ids):
                        group = self._create_duplicate_group(
                            db, group_tracks, "fuzzy_metadata", "Similar metadata"
                        )
                        duplicate_groups.append(group)
                        seen_track_ids.update(group_ids)
                        progress.groups_found = len(duplicate_groups)
                        progress.duplicates_found = sum(len(g.members) - 1 for g in duplicate_groups)

            # Method 3: Duration-based matching for remaining tracks
            progress.phase = "duration_matching"
            remaining_tracks = [t for t in all_tracks if t.id not in seen_track_ids]
            duration_groups = self._find_duration_duplicates(remaining_tracks, progress)
            for group_tracks in duration_groups:
                if len(group_tracks) > 1:
                    group_ids = [t.id for t in group_tracks]
                    if not any(tid in seen_track_ids for tid in group_ids):
                        group = self._create_duplicate_group(
                            db, group_tracks, "duration_match", "Same duration and similar title"
                        )
                        duplicate_groups.append(group)
                        seen_track_ids.update(group_ids)
                        progress.groups_found = len(duplicate_groups)
                        progress.duplicates_found = sum(len(g.members) - 1 for g in duplicate_groups)

            db.commit()

            progress.phase = "complete"
            progress.processed_tracks = progress.total_tracks

            return {
                "total_groups": len(duplicate_groups),
                "total_duplicates": sum(len(g.members) - 1 for g in duplicate_groups),
                "groups": [self._group_to_dict(g) for g in duplicate_groups]
            }
        except Exception as e:
            progress.error = str(e)
            progress.phase = "error"
            raise
        finally:
            progress.is_running = False

    def _find_exact_hash_duplicates(
        self, tracks: List[Track], progress: DuplicateDetectionProgress = None
    ) -> List[List[Track]]:
        """Group tracks by identical file hash."""
        hash_groups = defaultdict(list)
        for i, track in enumerate(tracks):
            if track.file_hash:
                hash_groups[track.file_hash].append(track)
            if progress:
                progress.processed_tracks = i + 1
                progress.current_track = track.title or track.file_path
        return [group for group in hash_groups.values() if len(group) > 1]

    def _find_fuzzy_metadata_duplicates(
        self, tracks: List[Track], progress: DuplicateDetectionProgress = None
    ) -> List[List[Track]]:
        """Group tracks by fuzzy metadata similarity."""
        groups = []
        processed = set()
        total = len(tracks)

        for i, track1 in enumerate(tracks):
            if track1.id in processed:
                continue

            if progress:
                progress.current_track = f"Comparing: {track1.title or 'Unknown'}"
                # Progress for fuzzy matching - scale to remaining portion
                progress.processed_tracks = int(progress.total_tracks * 0.3) + int((i / max(total, 1)) * progress.total_tracks * 0.5)

            group = [track1]
            processed.add(track1.id)

            for track2 in tracks[i+1:]:
                if track2.id in processed:
                    continue

                similarity = self._calculate_metadata_similarity(track1, track2)
                if similarity >= self.FUZZY_THRESHOLD:
                    # Additional check: duration must be within tolerance
                    if self._duration_matches(track1, track2):
                        group.append(track2)
                        processed.add(track2.id)

            if len(group) > 1:
                groups.append(group)

        return groups

    def _find_duration_duplicates(
        self, tracks: List[Track], progress: DuplicateDetectionProgress = None
    ) -> List[List[Track]]:
        """Group tracks by duration + title similarity."""
        duration_groups = defaultdict(list)

        for i, track in enumerate(tracks):
            if track.duration_ms and track.title:
                # Get normalized title
                title_norm = track.title_normalized or normalizer.normalize_title(track.title)
                if title_norm:
                    # Group by duration bucket (rounded to nearest 5 seconds)
                    duration_bucket = round(track.duration_ms / 5000) * 5000
                    key = (title_norm, duration_bucket)
                    duration_groups[key].append(track)

            if progress:
                progress.current_track = track.title or track.file_path
                # Progress for duration matching - final 20%
                progress.processed_tracks = int(progress.total_tracks * 0.8) + int((i / max(len(tracks), 1)) * progress.total_tracks * 0.2)

        return [group for group in duration_groups.values() if len(group) > 1]

    def _calculate_metadata_similarity(self, track1: Track, track2: Track) -> float:
        """Calculate similarity score between two tracks' metadata."""
        scores = []

        # Title similarity (weighted heavily)
        title1 = track1.title_normalized or normalizer.normalize_title(track1.title)
        title2 = track2.title_normalized or normalizer.normalize_title(track2.title)
        if title1 and title2:
            title_sim = SequenceMatcher(None, title1, title2).ratio()
            scores.append(title_sim * 0.5)

        # Artist similarity
        artist1 = track1.artist_normalized or normalizer.normalize_artist(track1.artist)
        artist2 = track2.artist_normalized or normalizer.normalize_artist(track2.artist)
        if artist1 and artist2:
            artist_sim = SequenceMatcher(None, artist1, artist2).ratio()
            scores.append(artist_sim * 0.35)
        elif not artist1 and not artist2:
            # Both missing artist - might be same track
            scores.append(0.35)

        # Album similarity (lower weight)
        album1 = track1.album_normalized or normalizer.normalize_album(track1.album)
        album2 = track2.album_normalized or normalizer.normalize_album(track2.album)
        if album1 and album2:
            album_sim = SequenceMatcher(None, album1, album2).ratio()
            scores.append(album_sim * 0.15)

        return sum(scores) / max(len(scores), 1) if scores else 0

    def _duration_matches(self, track1: Track, track2: Track) -> bool:
        """Check if track durations are within tolerance."""
        if not track1.duration_ms or not track2.duration_ms:
            return True  # Can't compare, assume match
        return abs(track1.duration_ms - track2.duration_ms) <= self.DURATION_TOLERANCE_MS

    def calculate_quality_score(self, track: Track) -> float:
        """Calculate overall quality score for a track."""
        score = 0.0

        # Bitrate score (normalize to 0-1, assume max 320kbps)
        if track.bitrate:
            bitrate_score = min(track.bitrate / 320, 1.0)
            score += bitrate_score * self.QUALITY_WEIGHTS["bitrate"]

        # Sample rate score (normalize, assume max 96kHz)
        if track.sample_rate:
            sample_score = min(track.sample_rate / 96000, 1.0)
            score += sample_score * self.QUALITY_WEIGHTS["sample_rate"]

        # Format score
        format_name = track.format.upper() if track.format else ""
        format_score = self.FORMAT_SCORES.get(format_name, 50) / 100
        score += format_score * self.QUALITY_WEIGHTS["format_score"]

        # Metadata completeness
        completeness = track.metadata_completeness or normalizer.calculate_completeness({
            "title": track.title, "artist": track.artist, "album": track.album,
            "year": track.year, "genre": track.genre, "artwork_path": track.artwork_path,
            "track_number": track.track_number, "bitrate": track.bitrate
        })
        score += (completeness / 100) * self.QUALITY_WEIGHTS["completeness"]

        # Artwork bonus
        if track.artwork_path:
            score += self.QUALITY_WEIGHTS["artwork"]

        # File size (normalize, assume max 50MB for a track)
        if track.file_size:
            size_score = min(track.file_size / (50 * 1024 * 1024), 1.0)
            score += size_score * self.QUALITY_WEIGHTS["file_size"]

        return round(score * 100, 2)

    def _create_duplicate_group(
        self,
        db: Session,
        tracks: List[Track],
        detection_type: str,
        detection_reason: str
    ) -> DuplicateGroup:
        """Create a duplicate group with scored members."""
        # Generate group hash
        track_ids = sorted([t.id for t in tracks])
        group_hash = hashlib.md5(str(track_ids).encode()).hexdigest()

        group = DuplicateGroup(
            group_hash=group_hash,
            detection_type=detection_type,
            detection_reason=detection_reason,
            status="unresolved"
        )
        db.add(group)
        db.flush()

        # Score and add members
        scored_tracks = [(t, self.calculate_quality_score(t)) for t in tracks]
        scored_tracks.sort(key=lambda x: x[1], reverse=True)

        for i, (track, quality_score) in enumerate(scored_tracks):
            member = DuplicateGroupMember(
                group_id=group.id,
                track_id=track.id,
                quality_score=quality_score,
                is_master=(i == 0)
            )
            db.add(member)

        # Set master track
        group.master_track_id = scored_tracks[0][0].id

        return group

    def _group_to_dict(self, group: DuplicateGroup) -> Dict[str, Any]:
        """Convert duplicate group to dictionary for API response."""
        return {
            "id": group.id,
            "type": group.detection_type,
            "reason": group.detection_reason,
            "status": group.status,
            "master_track_id": group.master_track_id,
            "tracks": [
                {
                    "id": m.track.id,
                    "title": m.track.title,
                    "artist": m.track.artist,
                    "album": m.track.album,
                    "file_path": m.track.file_path,
                    "bitrate": m.track.bitrate,
                    "sample_rate": m.track.sample_rate,
                    "format": m.track.format,
                    "file_size": m.track.file_size,
                    "duration_ms": m.track.duration_ms,
                    "artwork_path": m.track.artwork_path,
                    "quality_score": m.quality_score,
                    "is_master": m.is_master
                }
                for m in sorted(group.members, key=lambda x: x.quality_score, reverse=True)
            ]
        }

    def get_group(self, db: Session, group_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific duplicate group."""
        group = db.query(DuplicateGroup).filter(DuplicateGroup.id == group_id).first()
        if not group:
            return None
        return self._group_to_dict(group)

    def merge_duplicates(
        self,
        db: Session,
        group_id: int,
        keep_track_id: int,
        delete_files: bool = False
    ) -> Dict[str, Any]:
        """
        Merge duplicate group by keeping one track and transferring data from others.
        - Transfer play history
        - Transfer playlist associations
        - Transfer liked status
        - Keep best metadata from all versions
        - Optionally delete duplicate files
        """
        group = db.query(DuplicateGroup).filter(DuplicateGroup.id == group_id).first()
        if not group:
            raise ValueError("Duplicate group not found")

        keep_track = db.query(Track).filter(Track.id == keep_track_id).first()
        if not keep_track:
            raise ValueError("Track to keep not found")

        # Get all tracks in group
        member_track_ids = [m.track_id for m in group.members]
        if keep_track_id not in member_track_ids:
            raise ValueError("Track to keep is not in this duplicate group")

        delete_track_ids = [tid for tid in member_track_ids if tid != keep_track_id]
        deleted_files = []
        transfer_stats = {"play_history": 0, "playlists": 0, "likes": 0}

        for delete_id in delete_track_ids:
            delete_track = db.query(Track).filter(Track.id == delete_id).first()
            if not delete_track:
                continue

            # Transfer play history
            play_history = db.query(PlayHistory).filter(
                PlayHistory.track_id == delete_id
            ).all()
            for ph in play_history:
                ph.track_id = keep_track_id
                transfer_stats["play_history"] += 1

            # Transfer playlist associations
            playlist_tracks = db.query(PlaylistTrack).filter(
                PlaylistTrack.track_id == delete_id
            ).all()
            for pt in playlist_tracks:
                # Check if keep_track already in this playlist
                existing = db.query(PlaylistTrack).filter(
                    PlaylistTrack.playlist_id == pt.playlist_id,
                    PlaylistTrack.track_id == keep_track_id
                ).first()
                if existing:
                    db.delete(pt)  # Duplicate entry, just remove
                else:
                    pt.track_id = keep_track_id
                    transfer_stats["playlists"] += 1

            # Transfer liked status
            liked = db.query(LikedSong).filter(LikedSong.track_id == delete_id).first()
            if liked:
                existing_liked = db.query(LikedSong).filter(
                    LikedSong.track_id == keep_track_id
                ).first()
                # Always delete the old liked entry first to avoid CASCADE/UPDATE conflicts
                liked_at = liked.liked_at
                db.delete(liked)
                db.flush()  # Ensure deletion is processed before insert

                if not existing_liked:
                    # Create new liked entry for the kept track
                    new_liked = LikedSong(track_id=keep_track_id, liked_at=liked_at)
                    db.add(new_liked)
                    transfer_stats["likes"] += 1

            # Merge metadata (prefer keep_track, but fill in missing)
            if not keep_track.year and delete_track.year:
                keep_track.year = delete_track.year
            if not keep_track.genre and delete_track.genre:
                keep_track.genre = delete_track.genre
            if not keep_track.artwork_path and delete_track.artwork_path:
                keep_track.artwork_path = delete_track.artwork_path
            if not keep_track.album and delete_track.album:
                keep_track.album = delete_track.album
            if not keep_track.track_number and delete_track.track_number:
                keep_track.track_number = delete_track.track_number

            # Update play count
            keep_track.play_count = (keep_track.play_count or 0) + (delete_track.play_count or 0)

            # Delete file if requested
            if delete_files and delete_track.file_path and os.path.exists(delete_track.file_path):
                try:
                    os.remove(delete_track.file_path)
                    deleted_files.append(delete_track.file_path)
                except Exception as e:
                    print(f"Error deleting file {delete_track.file_path}: {e}")

            # Delete track from database
            db.delete(delete_track)

        # Mark group as resolved
        group.status = "resolved"
        group.resolved_at = datetime.utcnow()
        group.master_track_id = keep_track_id

        db.commit()

        return {
            "success": True,
            "kept_track_id": keep_track_id,
            "deleted_tracks": len(delete_track_ids),
            "deleted_files": deleted_files,
            "transfers": transfer_stats
        }

    def ignore_group(self, db: Session, group_id: int) -> Dict[str, Any]:
        """Mark a duplicate group as ignored (not duplicates)."""
        group = db.query(DuplicateGroup).filter(DuplicateGroup.id == group_id).first()
        if not group:
            raise ValueError("Duplicate group not found")

        group.status = "ignored"
        group.resolved_at = datetime.utcnow()
        db.commit()

        return {"success": True, "group_id": group_id}

    def get_stats(self, db: Session) -> Dict[str, Any]:
        """Get statistics about duplicates in the library."""
        total_groups = db.query(DuplicateGroup).count()
        unresolved = db.query(DuplicateGroup).filter(DuplicateGroup.status == "unresolved").count()
        resolved = db.query(DuplicateGroup).filter(DuplicateGroup.status == "resolved").count()
        ignored = db.query(DuplicateGroup).filter(DuplicateGroup.status == "ignored").count()

        # Calculate potential space savings
        unresolved_groups = db.query(DuplicateGroup).filter(
            DuplicateGroup.status == "unresolved"
        ).all()

        potential_savings = 0
        for group in unresolved_groups:
            sizes = [m.track.file_size or 0 for m in group.members]
            if sizes:
                potential_savings += sum(sizes) - max(sizes)

        return {
            "total_groups": total_groups,
            "unresolved": unresolved,
            "resolved": resolved,
            "ignored": ignored,
            "potential_space_savings_bytes": potential_savings
        }


# Singleton instance
deduplication_service = DeduplicationService()
