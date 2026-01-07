import os
import asyncio
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from ...database import get_db
from ...models.folder import Folder
from ...models.track import Track
from ...schemas.folder import FolderCreate, FolderResponse, ScanStatus
from ...services.scanner import folder_scanner, scan_progress
from ...services.watcher import file_watcher
from ..websocket import broadcast_message

router = APIRouter(prefix="/folders", tags=["folders"])

@router.get("", response_model=List[FolderResponse])
async def list_folders(db: Session = Depends(get_db)):
    folders = db.query(Folder).all()
    result = []
    for folder in folders:
        track_count = db.query(func.count(Track.id)).filter(Track.folder_id == folder.id).scalar()
        result.append(FolderResponse(
            id=folder.id,
            path=folder.path,
            name=folder.name,
            created_at=folder.created_at,
            last_scanned_at=folder.last_scanned_at,
            track_count=track_count
        ))
    return result

@router.post("", response_model=FolderResponse)
async def add_folder(
    folder_data: FolderCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    path = Path(folder_data.path).resolve()
    
    if not path.exists():
        raise HTTPException(status_code=400, detail="Folder does not exist")
    
    if not path.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")
    
    existing = db.query(Folder).filter(Folder.path == str(path)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Folder already added")
    
    folder = Folder(
        path=str(path),
        name=path.name
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    
    file_watcher.watch_folder(folder.id, folder.path)
    
    background_tasks.add_task(scan_folder_task, folder.id)
    
    return FolderResponse(
        id=folder.id,
        path=folder.path,
        name=folder.name,
        created_at=folder.created_at,
        last_scanned_at=folder.last_scanned_at,
        track_count=0
    )

@router.delete("/{folder_id}")
async def remove_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    file_watcher.unwatch_folder(folder_id)
    
    db.query(Track).filter(Track.folder_id == folder_id).delete()
    db.delete(folder)
    db.commit()
    
    return {"message": "Folder removed successfully"}

@router.post("/{folder_id}/scan")
async def trigger_scan(
    folder_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    if scan_progress.is_scanning:
        raise HTTPException(status_code=409, detail="Scan already in progress")
    
    background_tasks.add_task(scan_folder_task, folder_id)
    
    return {"message": "Scan started"}

@router.get("/scan-status", response_model=ScanStatus)
async def get_scan_status():
    return ScanStatus(
        is_scanning=scan_progress.is_scanning,
        folder_id=scan_progress.folder_id,
        folder_path=scan_progress.folder_path,
        current_file=scan_progress.current_file,
        processed=scan_progress.processed,
        total=scan_progress.total,
        progress=scan_progress.progress
    )

async def scan_folder_task(folder_id: int):
    from ...database import SessionLocal
    
    db = SessionLocal()
    try:
        folder = db.query(Folder).filter(Folder.id == folder_id).first()
        if not folder:
            return
        
        async def progress_callback(data):
            await broadcast_message({
                "type": "scan_progress",
                "data": data
            })
        
        result = await folder_scanner.scan_folder(db, folder, progress_callback)
        
        await broadcast_message({
            "type": "scan_complete",
            "data": {
                "folder_id": folder_id,
                "result": result
            }
        })
        
        await broadcast_message({
            "type": "library_updated",
            "data": {"reason": "scan_complete"}
        })
        
    finally:
        db.close()
