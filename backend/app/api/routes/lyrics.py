from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
import asyncio
from typing import Optional, Tuple
from ...database import get_db
from ...models.track import Track

router = APIRouter(prefix="/lyrics", tags=["lyrics"])

LRCLIB_API = "https://lrclib.net/api/get"
MAX_RETRIES = 3
BASE_DELAY = 1.0  # seconds


async def fetch_with_retry(
    client: httpx.AsyncClient,
    params: dict
) -> Tuple[Optional[httpx.Response], Optional[str]]:
    """
    Fetch lyrics with exponential backoff retry.
    Returns (response, error_message).
    Does NOT retry on 404 (lyrics not found - valid response).
    Retries on: timeout, connection errors, 5xx server errors.
    """
    last_error = None

    for attempt in range(MAX_RETRIES):
        try:
            response = await client.get(LRCLIB_API, params=params)

            # 404 = lyrics not found - don't retry, it's a valid response
            if response.status_code == 404:
                return response, None

            # 5xx = server error - should retry
            if response.status_code >= 500:
                last_error = f"Server error: {response.status_code}"
                if attempt < MAX_RETRIES - 1:
                    delay = BASE_DELAY * (2 ** attempt)  # 1s, 2s, 4s
                    await asyncio.sleep(delay)
                    continue
                return None, f"Server error after {MAX_RETRIES} retries: {response.status_code}"

            # Success or client error (4xx except 404)
            return response, None

        except httpx.TimeoutException:
            last_error = "Request timed out"
            if attempt < MAX_RETRIES - 1:
                delay = BASE_DELAY * (2 ** attempt)
                await asyncio.sleep(delay)
                continue
            return None, f"Request timed out after {MAX_RETRIES} retries"

        except httpx.ConnectError:
            last_error = "Connection failed"
            if attempt < MAX_RETRIES - 1:
                delay = BASE_DELAY * (2 ** attempt)
                await asyncio.sleep(delay)
                continue
            return None, f"Connection failed after {MAX_RETRIES} retries"

        except httpx.RequestError as e:
            last_error = f"Request error: {str(e)}"
            if attempt < MAX_RETRIES - 1:
                delay = BASE_DELAY * (2 ** attempt)
                await asyncio.sleep(delay)
                continue
            return None, f"Request error after {MAX_RETRIES} retries: {str(e)}"

    return None, last_error or "Unknown error"


@router.get("/{track_id}")
async def get_lyrics(track_id: int, db: Session = Depends(get_db)):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    if not track.title:
        return {"found": False, "message": "Track has no title"}

    params = {
        "track_name": track.title,
        "artist_name": track.artist or "",
    }

    if track.album:
        params["album_name"] = track.album

    if track.duration_ms:
        params["duration"] = track.duration_ms // 1000

    async with httpx.AsyncClient(timeout=10.0) as client:
        response, error = await fetch_with_retry(client, params)

        if error:
            return {"found": False, "message": error}

        if response.status_code == 404:
            return {"found": False, "message": "Lyrics not found"}

        try:
            response.raise_for_status()
            data = response.json()

            return {
                "found": True,
                "synced": data.get("syncedLyrics") is not None,
                "syncedLyrics": data.get("syncedLyrics"),
                "plainLyrics": data.get("plainLyrics"),
                "trackName": data.get("trackName"),
                "artistName": data.get("artistName"),
                "albumName": data.get("albumName"),
                "duration": data.get("duration")
            }
        except Exception as e:
            return {"found": False, "message": f"Failed to parse response: {str(e)}"}
