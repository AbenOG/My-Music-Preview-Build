"""
MusicBrainz integration service for metadata enrichment.
Implements rate limiting (1 req/sec) and result caching.
"""

import hashlib
import time
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session

try:
    import musicbrainzngs
    MUSICBRAINZ_AVAILABLE = True
except ImportError:
    MUSICBRAINZ_AVAILABLE = False

from ..models.musicbrainz import MusicBrainzCache
from ..models.track import Track
from .normalizer import normalizer


class MusicBrainzService:
    """
    Service for looking up metadata from MusicBrainz API.
    Implements rate limiting (1 req/sec) and result caching.
    """

    # Rate limiting
    _last_request_time: float = 0
    _min_request_interval: float = 1.0  # 1 second between requests

    def __init__(self):
        if MUSICBRAINZ_AVAILABLE:
            musicbrainzngs.set_useragent(
                "MyMusicPlayer",
                "1.0",
                "https://github.com/mymusic/player"
            )

    def _rate_limit(self):
        """Ensure at least 1 second between API calls."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self._min_request_interval:
            time.sleep(self._min_request_interval - elapsed)
        self._last_request_time = time.time()

    def _generate_search_key(
        self,
        artist: str,
        title: str,
        album: Optional[str] = None
    ) -> str:
        """Generate a cache key from normalized search parameters."""
        normalized = f"{normalizer.normalize_artist(artist)}|{normalizer.normalize_title(title)}"
        if album:
            normalized += f"|{normalizer.normalize_album(album)}"
        return hashlib.md5(normalized.encode()).hexdigest()

    def is_available(self) -> bool:
        """Check if MusicBrainz integration is available."""
        return MUSICBRAINZ_AVAILABLE

    def lookup_track(
        self,
        db: Session,
        artist: str,
        title: str,
        album: Optional[str] = None,
        duration_ms: Optional[int] = None,
        use_cache: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Look up track metadata from MusicBrainz.
        Returns cached result if available.
        """
        if not MUSICBRAINZ_AVAILABLE:
            return None

        if not artist or not title:
            return None

        search_key = self._generate_search_key(artist, title, album)

        # Check cache first
        if use_cache:
            cached = db.query(MusicBrainzCache).filter(
                MusicBrainzCache.search_key == search_key
            ).first()

            if cached and cached.lookup_status in ("found", "not_found"):
                # Update last queried time
                cached.last_queried_at = datetime.utcnow()
                db.commit()

                if cached.lookup_status == "found":
                    return {
                        "recording_mbid": cached.recording_mbid,
                        "release_mbid": cached.release_mbid,
                        "artist_mbid": cached.artist_mbid,
                        "artist": cached.canonical_artist,
                        "title": cached.canonical_title,
                        "album": cached.canonical_album,
                        "year": cached.canonical_year,
                        "genre": cached.canonical_genre,
                    }
                return None

        # Rate limit and make API call
        self._rate_limit()

        try:
            # Build search query
            query = f'recording:"{title}" AND artist:"{artist}"'
            if album:
                query += f' AND release:"{album}"'

            result = musicbrainzngs.search_recordings(
                query=query,
                limit=5
            )

            recordings = result.get("recording-list", [])

            if not recordings:
                # Cache negative result
                self._cache_result(db, search_key, None)
                return None

            # Find best match (considering duration if available)
            best_match = self._find_best_match(recordings, duration_ms)

            if best_match:
                # Get additional release info
                release_info = self._get_release_info(best_match)

                result_data = {
                    "recording_mbid": best_match.get("id"),
                    "artist_mbid": self._get_artist_mbid(best_match),
                    "artist": best_match.get("artist-credit-phrase"),
                    "title": best_match.get("title"),
                    **release_info
                }

                # Cache positive result
                self._cache_result(db, search_key, result_data)
                return result_data

            self._cache_result(db, search_key, None)
            return None

        except Exception as e:
            print(f"MusicBrainz lookup error: {e}")
            # Cache error state
            self._cache_error(db, search_key, str(e))
            return None

    def _get_artist_mbid(self, recording: Dict) -> Optional[str]:
        """Extract artist MBID from recording."""
        artist_credit = recording.get("artist-credit", [])
        if artist_credit and isinstance(artist_credit, list):
            first_credit = artist_credit[0]
            if isinstance(first_credit, dict):
                artist = first_credit.get("artist", {})
                return artist.get("id")
        return None

    def _find_best_match(
        self,
        recordings: List[Dict],
        duration_ms: Optional[int]
    ) -> Optional[Dict]:
        """Find best matching recording, considering duration tolerance."""
        if not recordings:
            return None

        if not duration_ms:
            return recordings[0]  # Return first match if no duration to compare

        duration_sec = duration_ms / 1000
        tolerance = 3  # ±3 seconds

        for recording in recordings:
            length = recording.get("length")
            if length:
                try:
                    length_sec = int(length) / 1000
                    if abs(length_sec - duration_sec) <= tolerance:
                        return recording
                except (ValueError, TypeError):
                    pass

        # If no duration match, return first result
        return recordings[0]

    def _get_release_info(self, recording: Dict) -> Dict[str, Any]:
        """Extract release information from recording."""
        releases = recording.get("release-list", [])
        if not releases:
            return {"album": None, "year": None, "release_mbid": None}

        # Prefer official releases
        release = releases[0]
        for r in releases:
            if r.get("status") == "Official":
                release = r
                break

        year = None
        date = release.get("date", "")
        if date and len(date) >= 4:
            try:
                year = int(date[:4])
            except ValueError:
                pass

        return {
            "album": release.get("title"),
            "year": year,
            "release_mbid": release.get("id")
        }

    def _cache_result(
        self,
        db: Session,
        search_key: str,
        result: Optional[Dict]
    ):
        """Cache lookup result."""
        # Check if entry already exists
        existing = db.query(MusicBrainzCache).filter(
            MusicBrainzCache.search_key == search_key
        ).first()

        if existing:
            existing.lookup_status = "found" if result else "not_found"
            existing.last_queried_at = datetime.utcnow()
            if result:
                existing.recording_mbid = result.get("recording_mbid")
                existing.release_mbid = result.get("release_mbid")
                existing.artist_mbid = result.get("artist_mbid")
                existing.canonical_artist = result.get("artist")
                existing.canonical_title = result.get("title")
                existing.canonical_album = result.get("album")
                existing.canonical_year = result.get("year")
        else:
            cache_entry = MusicBrainzCache(
                search_key=search_key,
                lookup_status="found" if result else "not_found",
                recording_mbid=result.get("recording_mbid") if result else None,
                release_mbid=result.get("release_mbid") if result else None,
                artist_mbid=result.get("artist_mbid") if result else None,
                canonical_artist=result.get("artist") if result else None,
                canonical_title=result.get("title") if result else None,
                canonical_album=result.get("album") if result else None,
                canonical_year=result.get("year") if result else None,
            )
            db.add(cache_entry)

        db.commit()

    def _cache_error(self, db: Session, search_key: str, error: str):
        """Cache error state for retry later."""
        existing = db.query(MusicBrainzCache).filter(
            MusicBrainzCache.search_key == search_key
        ).first()

        if existing:
            existing.lookup_status = "error"
            existing.error_message = error
            existing.last_queried_at = datetime.utcnow()
        else:
            cache_entry = MusicBrainzCache(
                search_key=search_key,
                lookup_status="error",
                error_message=error
            )
            db.add(cache_entry)

        db.commit()

    async def batch_lookup(
        self,
        db: Session,
        track_ids: List[int],
        progress_callback: Optional[callable] = None
    ) -> Dict[str, int]:
        """
        Batch lookup for multiple tracks.
        Returns stats: {found, not_found, errors, skipped, total}
        """
        stats = {
            "found": 0,
            "not_found": 0,
            "errors": 0,
            "skipped": 0,
            "total": len(track_ids)
        }

        tracks = db.query(Track).filter(Track.id.in_(track_ids)).all()

        for i, track in enumerate(tracks):
            if not track.artist or not track.title:
                stats["skipped"] += 1
                continue

            try:
                result = self.lookup_track(
                    db,
                    artist=track.artist,
                    title=track.title,
                    album=track.album,
                    duration_ms=track.duration_ms
                )

                if result:
                    # Update track with MusicBrainz data
                    track.musicbrainz_recording_id = result.get("recording_mbid")
                    track.musicbrainz_release_id = result.get("release_mbid")
                    track.musicbrainz_artist_id = result.get("artist_mbid")
                    track.musicbrainz_lookup_at = datetime.utcnow()
                    stats["found"] += 1
                else:
                    stats["not_found"] += 1

            except Exception as e:
                print(f"Error looking up track {track.id}: {e}")
                stats["errors"] += 1

            if progress_callback:
                await progress_callback({
                    "processed": i + 1,
                    "total": len(tracks),
                    "current_track": track.title,
                    "stats": stats
                })

            db.commit()
            await asyncio.sleep(0)  # Yield control

        return stats

    def clear_cache(self, db: Session, older_than_days: Optional[int] = None):
        """Clear MusicBrainz cache."""
        query = db.query(MusicBrainzCache)

        if older_than_days:
            from datetime import timedelta
            cutoff = datetime.utcnow() - timedelta(days=older_than_days)
            query = query.filter(MusicBrainzCache.last_queried_at < cutoff)

        deleted = query.delete()
        db.commit()
        return deleted


# Singleton instance
musicbrainz_service = MusicBrainzService()
