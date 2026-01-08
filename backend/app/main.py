import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send
from .config import settings
from .database import init_db, SessionLocal
from .api.routes import (
    folders,
    tracks,
    albums,
    artists,
    playlists,
    player,
    stream,
    artwork,
    radio,
    duplicates,
    metadata,
    lyrics,
    normalize,
    musicbrainz,
)
from .api.websocket import websocket_endpoint, broadcast_message
from .services.watcher import file_watcher
from .services.scanner import folder_scanner
from .services.media_keys import media_key_handler
from .services.metadata import metadata_extractor
from .models.folder import Folder
from .models.track import Track


class WebSocketBypassWrapper:
    """ASGI wrapper that handles WebSocket at /ws directly, bypassing CORS."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "websocket" and scope["path"] == "/ws":
            from fastapi import WebSocket

            websocket = WebSocket(scope, receive, send)
            await websocket_endpoint(websocket)
        else:
            await self.app(scope, receive, send)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()

    db = SessionLocal()
    try:
        folders_list = db.query(Folder).all()
        for folder in folders_list:
            file_watcher.watch_folder(folder.id, folder.path)
    finally:
        db.close()

    loop = asyncio.get_event_loop()

    # Callback for batch processing (new files)
    def on_batch_ready(batch_data):
        asyncio.run_coroutine_threadsafe(handle_file_batch(batch_data), loop)

    # Callback for immediate detection notification
    def on_files_detected(detection_data):
        asyncio.run_coroutine_threadsafe(handle_files_detected(detection_data), loop)

    # Callback for single events (delete/modify)
    def on_single_event(event_data):
        asyncio.run_coroutine_threadsafe(handle_single_file_event(event_data), loop)

    file_watcher.set_batch_callback(on_batch_ready)
    file_watcher.set_detection_callback(on_files_detected)
    file_watcher.set_single_event_callback(on_single_event)

    media_key_handler.set_event_loop(loop)
    media_key_handler.set_callback(broadcast_message)
    media_key_handler.start()

    yield

    file_watcher.stop_all()
    media_key_handler.stop()


async def handle_files_detected(detection_data: dict):
    """Broadcast immediate notification when files are detected."""
    import os
    folder_path = detection_data.get("folder_path", "")
    folder_name = os.path.basename(folder_path) if folder_path else "Unknown"

    await broadcast_message({
        "type": "files_detected",
        "data": {
            "count": detection_data.get("count", 0),
            "folder_id": detection_data.get("folder_id"),
            "folder_name": folder_name
        }
    })


async def handle_file_batch(batch_data: dict):
    """Process a batch of new files with progress updates."""
    import os
    from .database import SessionLocal
    from .services.normalizer import normalizer
    from .services.mood_mapper import get_mood_from_genre, get_decade_from_year
    from .services.loudness import loudness_analyzer

    files = batch_data.get("files", [])
    folder_id = batch_data.get("folder_id")
    folder_path = batch_data.get("folder_path", "")
    folder_name = os.path.basename(folder_path) if folder_path else "Unknown"

    if not files:
        return

    total = len(files)
    added = 0
    errors = 0

    # Broadcast: processing started
    await broadcast_message({
        "type": "auto_scan_started",
        "data": {
            "total": total,
            "folder_id": folder_id,
            "folder_name": folder_name
        }
    })

    db = SessionLocal()
    try:
        for i, file_info in enumerate(files):
            file_path = file_info.get("path")

            try:
                metadata = metadata_extractor.extract(file_path)

                # Calculate normalized values
                artist_norm = normalizer.normalize_artist(metadata["artist"])
                album_norm = normalizer.normalize_album(metadata["album"])
                title_norm = normalizer.normalize_title(metadata["title"])
                completeness = normalizer.calculate_completeness(metadata)

                # Analyze loudness for normalization
                loudness_data = loudness_analyzer.analyze(file_path)

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
                    folder_id=folder_id,
                    mood=get_mood_from_genre(metadata["genre"]),
                    decade=get_decade_from_year(metadata["year"]),
                    artist_normalized=artist_norm,
                    album_normalized=album_norm,
                    title_normalized=title_norm,
                    metadata_completeness=completeness,
                    # Loudness normalization
                    loudness_integrated=loudness_data.get("integrated"),
                    loudness_true_peak=loudness_data.get("true_peak"),
                    loudness_range=loudness_data.get("range"),
                    loudness_gain=loudness_data.get("gain"),
                )
                db.add(track)
                db.commit()
                added += 1

            except Exception as e:
                print(f"Error processing file {file_path}: {e}")
                errors += 1

            # Broadcast progress
            processed = i + 1
            await broadcast_message({
                "type": "auto_scan_progress",
                "data": {
                    "processed": processed,
                    "total": total,
                    "current_file": os.path.basename(file_path),
                    "progress": (processed / total) * 100
                }
            })

    finally:
        db.close()

    # Broadcast: complete
    await broadcast_message({
        "type": "auto_scan_complete",
        "data": {
            "added": added,
            "total": total,
            "errors": errors,
            "folder_name": folder_name
        }
    })

    # Also send library_updated for backward compatibility
    await broadcast_message({
        "type": "library_updated",
        "data": {"event": "batch_processed", "count": added}
    })


async def handle_single_file_event(event_data: dict):
    """Handle single file events (delete/modify) - not batched."""
    from .database import SessionLocal
    from .services.normalizer import normalizer
    from .services.mood_mapper import get_mood_from_genre, get_decade_from_year
    from .services.loudness import loudness_analyzer

    event_type = event_data.get("type")
    file_path = event_data.get("path")
    folder_id = event_data.get("folder_id")

    db = SessionLocal()
    try:
        if event_type == "deleted":
            db.query(Track).filter(Track.file_path == file_path).delete()
            db.commit()

        elif event_type == "modified":
            track = db.query(Track).filter(Track.file_path == file_path).first()
            if track:
                metadata = metadata_extractor.extract(file_path)
                for key, value in metadata.items():
                    if key != "file_path" and hasattr(track, key):
                        setattr(track, key, value)
                # Update normalized fields
                track.artist_normalized = normalizer.normalize_artist(
                    metadata["artist"]
                )
                track.album_normalized = normalizer.normalize_album(metadata["album"])
                track.title_normalized = normalizer.normalize_title(metadata["title"])
                track.metadata_completeness = normalizer.calculate_completeness(
                    metadata
                )
                # Re-analyze loudness
                loudness_data = loudness_analyzer.analyze(file_path)
                track.loudness_integrated = loudness_data.get("integrated")
                track.loudness_true_peak = loudness_data.get("true_peak")
                track.loudness_range = loudness_data.get("range")
                track.loudness_gain = loudness_data.get("gain")
                db.commit()

        await broadcast_message({
            "type": "library_updated",
            "data": {"event": event_type, "path": file_path}
        })

    except Exception as e:
        print(f"Error handling file event: {e}")
    finally:
        db.close()


app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, lifespan=lifespan)

# Add CORS middleware - but we'll handle WebSocket separately
# Using explicit origins instead of wildcard to avoid CORS issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(folders.router, prefix="/api")
app.include_router(tracks.router, prefix="/api")
app.include_router(albums.router, prefix="/api")
app.include_router(artists.router, prefix="/api")
app.include_router(playlists.router, prefix="/api")
app.include_router(player.router, prefix="/api")
app.include_router(stream.router, prefix="/api")
app.include_router(artwork.router, prefix="/api")
app.include_router(radio.router, prefix="/api")
app.include_router(duplicates.router, prefix="/api")
app.include_router(metadata.router, prefix="/api")
app.include_router(lyrics.router, prefix="/api")
app.include_router(normalize.router, prefix="/api")
app.include_router(musicbrainz.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}


# Wrap the app to bypass CORS for WebSocket connections
application = WebSocketBypassWrapper(app)
