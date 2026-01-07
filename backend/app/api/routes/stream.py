import os
import mimetypes
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.track import Track

router = APIRouter(prefix="/stream", tags=["stream"])

MIME_TYPES = {
    ".mp3": "audio/mpeg",
    ".flac": "audio/flac",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".wma": "audio/x-ms-wma",
}

def get_content_type(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    return MIME_TYPES.get(ext, "application/octet-stream")

@router.get("/{track_id}")
async def stream_track(
    track_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    file_path = Path(track.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    file_size = file_path.stat().st_size
    content_type = get_content_type(str(file_path))
    
    range_header = request.headers.get("range")
    
    if range_header:
        try:
            range_spec = range_header.replace("bytes=", "")
            range_parts = range_spec.split("-")
            start = int(range_parts[0]) if range_parts[0] else 0
            end = int(range_parts[1]) if range_parts[1] else file_size - 1
            
            if start >= file_size:
                raise HTTPException(status_code=416, detail="Range not satisfiable")
            
            end = min(end, file_size - 1)
            content_length = end - start + 1
            
            def iter_file():
                with open(file_path, "rb") as f:
                    f.seek(start)
                    remaining = content_length
                    chunk_size = 1024 * 64
                    
                    while remaining > 0:
                        read_size = min(chunk_size, remaining)
                        data = f.read(read_size)
                        if not data:
                            break
                        remaining -= len(data)
                        yield data
            
            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Content-Type": content_type,
            }
            
            return StreamingResponse(
                iter_file(),
                status_code=206,
                headers=headers,
                media_type=content_type
            )
            
        except (ValueError, IndexError):
            raise HTTPException(status_code=400, detail="Invalid range header")
    
    def iter_file_full():
        with open(file_path, "rb") as f:
            chunk_size = 1024 * 64
            while True:
                data = f.read(chunk_size)
                if not data:
                    break
                yield data
    
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": content_type,
    }
    
    return StreamingResponse(
        iter_file_full(),
        headers=headers,
        media_type=content_type
    )
