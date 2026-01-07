import os
import asyncio
import hashlib
from pathlib import Path
from typing import List, Optional, Callable, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from ..config import settings
from ..models.folder import Folder
from ..models.track import Track, PlayHistory, LikedSong
from ..models.playlist import PlaylistTrack
from .metadata import metadata_extractor
from .mood_mapper import get_mood_from_genre, get_decade_from_year
from .normalizer import normalizer


class ScanProgress:
    def __init__(self):
        self.is_scanning = False
        self.folder_id: Optional[int] = None
        self.folder_path: Optional[str] = None
        self.current_file: Optional[str] = None
        self.processed = 0
        self.total = 0

    @property
    def progress(self) -> float:
        if self.total == 0:
            return 0.0
        return (self.processed / self.total) * 100

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_scanning": self.is_scanning,
            "folder_id": self.folder_id,
            "folder_path": self.folder_path,
            "current_file": self.current_file,
            "processed": self.processed,
            "total": self.total,
            "progress": self.progress,
        }


scan_progress = ScanProgress()


class FolderScanner:
    def __init__(self):
        self.supported_formats = settings.SUPPORTED_FORMATS
        self.batch_size = settings.SCAN_BATCH_SIZE
        self._progress_callback: Optional[Callable] = None

    def set_progress_callback(self, callback: Callable):
        self._progress_callback = callback

    def compute_file_hash(self, file_path: str) -> Optional[str]:
        try:
            file_size = os.path.getsize(file_path)
            chunk_size = 65536

            hasher = hashlib.md5()

            with open(file_path, "rb") as f:
                hasher.update(f.read(chunk_size))

                if file_size > chunk_size * 2:
                    f.seek(-chunk_size, 2)
                    hasher.update(f.read(chunk_size))

            return hasher.hexdigest()
        except Exception:
            return None

    def find_audio_files(self, folder_path: str) -> List[str]:
        audio_files = []
        path = Path(folder_path)

        if not path.exists() or not path.is_dir():
            return audio_files

        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if not d.startswith(".")]

            for file in files:
                if file.lower().endswith(self.supported_formats):
                    audio_files.append(os.path.join(root, file))

        return audio_files

    async def scan_folder(
        self, db: Session, folder: Folder, progress_callback: Optional[Callable] = None
    ) -> Dict[str, int]:
        global scan_progress

        scan_progress.is_scanning = True
        scan_progress.folder_id = folder.id
        scan_progress.folder_path = folder.path
        scan_progress.processed = 0

        result = {"added": 0, "updated": 0, "removed": 0, "errors": 0}

        try:
            audio_files = self.find_audio_files(folder.path)
            scan_progress.total = len(audio_files)

            existing_tracks = {
                t.file_path: t
                for t in db.query(Track).filter(Track.folder_id == folder.id).all()
            }
            existing_paths = set(existing_tracks.keys())
            found_paths = set(audio_files)

            removed_paths = existing_paths - found_paths
            for path in removed_paths:
                track = existing_tracks[path]
                # Manually delete related records to avoid FK constraint issues
                db.query(PlayHistory).filter(PlayHistory.track_id == track.id).delete()
                db.query(LikedSong).filter(LikedSong.track_id == track.id).delete()
                db.query(PlaylistTrack).filter(
                    PlaylistTrack.track_id == track.id
                ).delete()
                db.delete(track)
                result["removed"] += 1

            for i, file_path in enumerate(audio_files):
                scan_progress.current_file = os.path.basename(file_path)
                scan_progress.processed = i + 1

                if progress_callback:
                    await progress_callback(scan_progress.to_dict())

                try:
                    metadata = metadata_extractor.extract(file_path)

                    if file_path in existing_tracks:
                        track = existing_tracks[file_path]
                        file_stat = os.stat(file_path)

                        if track.file_size != file_stat.st_size:
                            for key, value in metadata.items():
                                if key != "file_path" and hasattr(track, key):
                                    setattr(track, key, value)
                            # Update normalized fields
                            track.artist_normalized = normalizer.normalize_artist(
                                metadata["artist"]
                            )
                            track.album_normalized = normalizer.normalize_album(
                                metadata["album"]
                            )
                            track.title_normalized = normalizer.normalize_title(
                                metadata["title"]
                            )
                            track.metadata_completeness = (
                                normalizer.calculate_completeness(metadata)
                            )
                            track.updated_at = datetime.utcnow()
                            result["updated"] += 1
                    else:
                        # Calculate normalized values
                        artist_norm = normalizer.normalize_artist(metadata["artist"])
                        album_norm = normalizer.normalize_album(metadata["album"])
                        title_norm = normalizer.normalize_title(metadata["title"])
                        completeness = normalizer.calculate_completeness(metadata)

                        track = Track(
                            file_path=metadata["file_path"],
                            title=metadata["title"],
                            artist=metadata["artist"],
                            album=metadata["album"],
                            album_artist=metadata["album_artist"],
                            genre=metadata["genre"],
                            year=metadata["year"],
                            track_number=metadata["track_number"],
                            disc_number=metadata["disc_number"],
                            duration_ms=metadata["duration_ms"],
                            bitrate=metadata["bitrate"],
                            sample_rate=metadata["sample_rate"],
                            format=metadata["format"],
                            file_size=metadata["file_size"],
                            artwork_path=metadata["artwork_path"],
                            folder_id=folder.id,
                            file_hash=self.compute_file_hash(file_path),
                            mood=get_mood_from_genre(metadata["genre"]),
                            decade=get_decade_from_year(metadata["year"]),
                            # Normalized fields
                            artist_normalized=artist_norm,
                            album_normalized=album_norm,
                            title_normalized=title_norm,
                            metadata_completeness=completeness,
                        )
                        db.add(track)
                        result["added"] += 1

                    if (i + 1) % self.batch_size == 0:
                        db.commit()

                except Exception as e:
                    print(f"Error processing {file_path}: {e}")
                    result["errors"] += 1

                await asyncio.sleep(0)

            folder.last_scanned_at = datetime.utcnow()
            db.commit()

        finally:
            scan_progress.is_scanning = False
            scan_progress.current_file = None

            if progress_callback:
                await progress_callback(
                    {**scan_progress.to_dict(), "complete": True, "result": result}
                )

        return result

    def scan_folder_sync(self, db: Session, folder: Folder) -> Dict[str, int]:
        result = {"added": 0, "updated": 0, "removed": 0, "errors": 0}

        audio_files = self.find_audio_files(folder.path)

        existing_tracks = {
            t.file_path: t
            for t in db.query(Track).filter(Track.folder_id == folder.id).all()
        }
        existing_paths = set(existing_tracks.keys())
        found_paths = set(audio_files)

        removed_paths = existing_paths - found_paths
        for path in removed_paths:
            track = existing_tracks[path]
            # Manually delete related records to avoid FK constraint issues
            db.query(PlayHistory).filter(PlayHistory.track_id == track.id).delete()
            db.query(LikedSong).filter(LikedSong.track_id == track.id).delete()
            db.query(PlaylistTrack).filter(PlaylistTrack.track_id == track.id).delete()
            db.delete(track)
            result["removed"] += 1

        for file_path in audio_files:
            try:
                metadata = metadata_extractor.extract(file_path)

                if file_path in existing_tracks:
                    track = existing_tracks[file_path]
                    file_stat = os.stat(file_path)

                    if track.file_size != file_stat.st_size:
                        for key, value in metadata.items():
                            if key != "file_path" and hasattr(track, key):
                                setattr(track, key, value)
                        # Update normalized fields
                        track.artist_normalized = normalizer.normalize_artist(
                            metadata["artist"]
                        )
                        track.album_normalized = normalizer.normalize_album(
                            metadata["album"]
                        )
                        track.title_normalized = normalizer.normalize_title(
                            metadata["title"]
                        )
                        track.metadata_completeness = normalizer.calculate_completeness(
                            metadata
                        )
                        track.updated_at = datetime.utcnow()
                        result["updated"] += 1
                else:
                    # Calculate normalized values
                    artist_norm = normalizer.normalize_artist(metadata["artist"])
                    album_norm = normalizer.normalize_album(metadata["album"])
                    title_norm = normalizer.normalize_title(metadata["title"])
                    completeness = normalizer.calculate_completeness(metadata)

                    track = Track(
                        file_path=metadata["file_path"],
                        title=metadata["title"],
                        artist=metadata["artist"],
                        album=metadata["album"],
                        album_artist=metadata["album_artist"],
                        genre=metadata["genre"],
                        year=metadata["year"],
                        track_number=metadata["track_number"],
                        disc_number=metadata["disc_number"],
                        duration_ms=metadata["duration_ms"],
                        bitrate=metadata["bitrate"],
                        sample_rate=metadata["sample_rate"],
                        format=metadata["format"],
                        file_size=metadata["file_size"],
                        artwork_path=metadata["artwork_path"],
                        folder_id=folder.id,
                        file_hash=self.compute_file_hash(file_path),
                        mood=get_mood_from_genre(metadata["genre"]),
                        decade=get_decade_from_year(metadata["year"]),
                        # Normalized fields
                        artist_normalized=artist_norm,
                        album_normalized=album_norm,
                        title_normalized=title_norm,
                        metadata_completeness=completeness,
                    )
                    db.add(track)
                    result["added"] += 1

            except Exception as e:
                print(f"Error processing {file_path}: {e}")
                result["errors"] += 1

        folder.last_scanned_at = datetime.utcnow()
        db.commit()

        return result


folder_scanner = FolderScanner()
