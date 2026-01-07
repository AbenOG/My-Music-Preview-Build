import os
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any
from mutagen import File as MutagenFile
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.mp4 import MP4
from mutagen.oggvorbis import OggVorbis
from mutagen.wave import WAVE
from mutagen.id3 import ID3
from ..config import settings

class MetadataExtractor:
    MIME_TO_EXT = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
    }
    
    def __init__(self):
        self.artwork_cache_dir = settings.ARTWORK_CACHE_DIR
    
    def extract(self, file_path: str) -> Dict[str, Any]:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        ext = path.suffix.lower()
        
        metadata = {
            "file_path": str(path.absolute()),
            "title": path.stem,
            "artist": None,
            "album": None,
            "album_artist": None,
            "genre": None,
            "year": None,
            "track_number": None,
            "disc_number": None,
            "duration_ms": None,
            "bitrate": None,
            "sample_rate": None,
            "format": ext.lstrip(".").upper(),
            "file_size": path.stat().st_size,
            "artwork_path": None,
        }
        
        try:
            audio = MutagenFile(file_path)
            if audio is None:
                return metadata
            
            if hasattr(audio, 'info'):
                info = audio.info
                if hasattr(info, 'length'):
                    metadata["duration_ms"] = int(info.length * 1000)
                if hasattr(info, 'bitrate'):
                    metadata["bitrate"] = info.bitrate
                if hasattr(info, 'sample_rate'):
                    metadata["sample_rate"] = info.sample_rate
            
            if ext == ".mp3":
                metadata = self._extract_mp3(file_path, metadata)
            elif ext == ".flac":
                metadata = self._extract_flac(file_path, metadata)
            elif ext in (".m4a", ".aac", ".mp4"):
                metadata = self._extract_mp4(file_path, metadata)
            elif ext == ".ogg":
                metadata = self._extract_ogg(file_path, metadata)
            elif ext == ".wav":
                metadata = self._extract_wav(file_path, metadata)
            
        except Exception as e:
            print(f"Error extracting metadata from {file_path}: {e}")
        
        return metadata
    
    def _extract_mp3(self, file_path: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        try:
            audio = MP3(file_path)
            tags = audio.tags
            
            if tags:
                metadata["title"] = self._get_tag(tags, ["TIT2"]) or metadata["title"]
                metadata["artist"] = self._get_tag(tags, ["TPE1"])
                metadata["album"] = self._get_tag(tags, ["TALB"])
                metadata["album_artist"] = self._get_tag(tags, ["TPE2"])
                metadata["genre"] = self._get_tag(tags, ["TCON"])
                
                year = self._get_tag(tags, ["TDRC", "TYER"])
                if year:
                    try:
                        metadata["year"] = int(str(year)[:4])
                    except ValueError:
                        pass
                
                track = self._get_tag(tags, ["TRCK"])
                if track:
                    metadata["track_number"] = self._parse_track_number(track)
                
                disc = self._get_tag(tags, ["TPOS"])
                if disc:
                    metadata["disc_number"] = self._parse_track_number(disc)
                
                for key in tags.keys():
                    if key.startswith("APIC"):
                        apic = tags[key]
                        artwork_path = self._save_artwork(
                            apic.data,
                            file_path,
                            apic.mime
                        )
                        if artwork_path:
                            metadata["artwork_path"] = artwork_path
                        break
                        
        except Exception as e:
            print(f"Error extracting MP3 metadata: {e}")
        
        return metadata
    
    def _extract_flac(self, file_path: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        try:
            audio = FLAC(file_path)
            
            metadata["title"] = self._get_vorbis_tag(audio, "title") or metadata["title"]
            metadata["artist"] = self._get_vorbis_tag(audio, "artist")
            metadata["album"] = self._get_vorbis_tag(audio, "album")
            metadata["album_artist"] = self._get_vorbis_tag(audio, "albumartist")
            metadata["genre"] = self._get_vorbis_tag(audio, "genre")
            
            year = self._get_vorbis_tag(audio, "date") or self._get_vorbis_tag(audio, "year")
            if year:
                try:
                    metadata["year"] = int(str(year)[:4])
                except ValueError:
                    pass
            
            track = self._get_vorbis_tag(audio, "tracknumber")
            if track:
                metadata["track_number"] = self._parse_track_number(track)
            
            disc = self._get_vorbis_tag(audio, "discnumber")
            if disc:
                metadata["disc_number"] = self._parse_track_number(disc)
            
            if audio.pictures:
                pic = audio.pictures[0]
                artwork_path = self._save_artwork(pic.data, file_path, pic.mime)
                if artwork_path:
                    metadata["artwork_path"] = artwork_path
                    
        except Exception as e:
            try:
                audio = MutagenFile(file_path)
                if audio and hasattr(audio, 'tags') and audio.tags:
                    tags = audio.tags
                    if hasattr(tags, 'get'):
                        metadata["title"] = self._get_vorbis_tag(tags, "title") or metadata["title"]
                        metadata["artist"] = self._get_vorbis_tag(tags, "artist")
                        metadata["album"] = self._get_vorbis_tag(tags, "album")
                        metadata["album_artist"] = self._get_vorbis_tag(tags, "albumartist")
                        metadata["genre"] = self._get_vorbis_tag(tags, "genre")
            except Exception as fallback_error:
                print(f"Fallback extraction also failed for {file_path}: {fallback_error}")
        
        return metadata
    
    def _extract_mp4(self, file_path: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        try:
            audio = MP4(file_path)
            tags = audio.tags
            
            if tags:
                metadata["title"] = self._get_mp4_tag(tags, "\xa9nam") or metadata["title"]
                metadata["artist"] = self._get_mp4_tag(tags, "\xa9ART")
                metadata["album"] = self._get_mp4_tag(tags, "\xa9alb")
                metadata["album_artist"] = self._get_mp4_tag(tags, "aART")
                metadata["genre"] = self._get_mp4_tag(tags, "\xa9gen")
                
                year = self._get_mp4_tag(tags, "\xa9day")
                if year:
                    try:
                        metadata["year"] = int(str(year)[:4])
                    except ValueError:
                        pass
                
                if "trkn" in tags and tags["trkn"]:
                    metadata["track_number"] = tags["trkn"][0][0]
                
                if "disk" in tags and tags["disk"]:
                    metadata["disc_number"] = tags["disk"][0][0]
                
                if "covr" in tags and tags["covr"]:
                    cover = tags["covr"][0]
                    mime = "image/jpeg" if cover.imageformat == 13 else "image/png"
                    artwork_path = self._save_artwork(bytes(cover), file_path, mime)
                    if artwork_path:
                        metadata["artwork_path"] = artwork_path
                        
        except Exception as e:
            print(f"Error extracting MP4 metadata: {e}")
        
        return metadata
    
    def _extract_ogg(self, file_path: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        try:
            audio = OggVorbis(file_path)
            
            metadata["title"] = self._get_vorbis_tag(audio, "title") or metadata["title"]
            metadata["artist"] = self._get_vorbis_tag(audio, "artist")
            metadata["album"] = self._get_vorbis_tag(audio, "album")
            metadata["album_artist"] = self._get_vorbis_tag(audio, "albumartist")
            metadata["genre"] = self._get_vorbis_tag(audio, "genre")
            
            year = self._get_vorbis_tag(audio, "date") or self._get_vorbis_tag(audio, "year")
            if year:
                try:
                    metadata["year"] = int(str(year)[:4])
                except ValueError:
                    pass
            
            track = self._get_vorbis_tag(audio, "tracknumber")
            if track:
                metadata["track_number"] = self._parse_track_number(track)
                
        except Exception as e:
            print(f"Error extracting OGG metadata: {e}")
        
        return metadata
    
    def _extract_wav(self, file_path: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        try:
            audio = WAVE(file_path)
            if audio.tags:
                metadata["title"] = self._get_tag(audio.tags, ["TIT2"]) or metadata["title"]
                metadata["artist"] = self._get_tag(audio.tags, ["TPE1"])
                metadata["album"] = self._get_tag(audio.tags, ["TALB"])
        except Exception as e:
            print(f"Error extracting WAV metadata: {e}")
        
        return metadata
    
    def _get_tag(self, tags, keys):
        for key in keys:
            if key in tags:
                value = tags[key]
                if hasattr(value, 'text'):
                    return str(value.text[0]) if value.text else None
                return str(value) if value else None
        return None
    
    def _get_vorbis_tag(self, audio, key):
        if key in audio:
            values = audio[key]
            return values[0] if values else None
        return None
    
    def _get_mp4_tag(self, tags, key):
        if key in tags:
            values = tags[key]
            return str(values[0]) if values else None
        return None
    
    def _parse_track_number(self, value) -> Optional[int]:
        try:
            if "/" in str(value):
                return int(str(value).split("/")[0])
            return int(value)
        except (ValueError, TypeError):
            return None
    
    def _save_artwork(self, data: bytes, source_file: str, mime: str = "image/jpeg") -> Optional[str]:
        try:
            file_hash = hashlib.md5(data).hexdigest()
            ext = self.MIME_TO_EXT.get(mime, ".jpg")
            artwork_filename = f"{file_hash}{ext}"
            artwork_path = self.artwork_cache_dir / artwork_filename
            
            if not artwork_path.exists():
                with open(artwork_path, "wb") as f:
                    f.write(data)
            
            return str(artwork_path)
        except Exception as e:
            print(f"Error saving artwork: {e}")
            return None

metadata_extractor = MetadataExtractor()
