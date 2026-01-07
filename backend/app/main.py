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

    async def on_file_change(event_data):
        await handle_file_change(event_data)

    file_watcher.set_change_callback(lambda e: asyncio.create_task(on_file_change(e)))

    loop = asyncio.get_event_loop()
    media_key_handler.set_event_loop(loop)
    media_key_handler.set_callback(broadcast_message)
    media_key_handler.start()

    yield

    file_watcher.stop_all()
    media_key_handler.stop()


async def handle_file_change(event_data: dict):
    from .database import SessionLocal
    from .services.normalizer import normalizer
    from .services.mood_mapper import get_mood_from_genre, get_decade_from_year

    event_type = event_data.get("type")
    file_path = event_data.get("path")
    folder_id = event_data.get("folder_id")

    db = SessionLocal()
    try:
        if event_type == "created":
            metadata = metadata_extractor.extract(file_path)

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
                folder_id=folder_id,
                mood=get_mood_from_genre(metadata["genre"]),
                decade=get_decade_from_year(metadata["year"]),
                artist_normalized=artist_norm,
                album_normalized=album_norm,
                title_normalized=title_norm,
                metadata_completeness=completeness,
            )
            db.add(track)
            db.commit()

        elif event_type == "deleted":
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
                db.commit()

        await broadcast_message(
            {
                "type": "library_updated",
                "data": {"event": event_type, "path": file_path},
            }
        )

    except Exception as e:
        print(f"Error handling file change: {e}")
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
