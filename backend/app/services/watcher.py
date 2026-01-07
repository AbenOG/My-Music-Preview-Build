import os
import asyncio
import threading
from pathlib import Path
from typing import Dict, Set, Callable, Optional
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileCreatedEvent, FileDeletedEvent, FileModifiedEvent, FileMovedEvent
from ..config import settings
from .metadata import metadata_extractor

class MusicFileHandler(FileSystemEventHandler):
    def __init__(self, folder_id: int, on_change: Callable):
        super().__init__()
        self.folder_id = folder_id
        self.on_change = on_change
        self.supported_formats = settings.SUPPORTED_FORMATS
        self._pending_events: Dict[str, dict] = {}
        self._debounce_timer: Optional[threading.Timer] = None
        self._lock = threading.Lock()
    
    def _is_audio_file(self, path: str) -> bool:
        return path.lower().endswith(self.supported_formats)
    
    def _schedule_process(self):
        with self._lock:
            if self._debounce_timer:
                self._debounce_timer.cancel()
            
            self._debounce_timer = threading.Timer(
                settings.FILE_WATCHER_DEBOUNCE_MS / 1000,
                self._process_pending
            )
            self._debounce_timer.start()
    
    def _process_pending(self):
        with self._lock:
            if not self._pending_events:
                return
            
            events = self._pending_events.copy()
            self._pending_events.clear()
        
        for path, event_data in events.items():
            try:
                self.on_change(event_data)
            except Exception as e:
                print(f"Error processing file event for {path}: {e}")
    
    def on_created(self, event):
        if event.is_directory:
            return
        if not self._is_audio_file(event.src_path):
            return
        
        with self._lock:
            self._pending_events[event.src_path] = {
                "type": "created",
                "path": event.src_path,
                "folder_id": self.folder_id
            }
        self._schedule_process()
    
    def on_deleted(self, event):
        if event.is_directory:
            return
        if not self._is_audio_file(event.src_path):
            return
        
        with self._lock:
            self._pending_events[event.src_path] = {
                "type": "deleted",
                "path": event.src_path,
                "folder_id": self.folder_id
            }
        self._schedule_process()
    
    def on_modified(self, event):
        if event.is_directory:
            return
        if not self._is_audio_file(event.src_path):
            return
        
        with self._lock:
            if event.src_path not in self._pending_events:
                self._pending_events[event.src_path] = {
                    "type": "modified",
                    "path": event.src_path,
                    "folder_id": self.folder_id
                }
        self._schedule_process()
    
    def on_moved(self, event):
        if event.is_directory:
            return
        
        if self._is_audio_file(event.src_path):
            with self._lock:
                self._pending_events[event.src_path] = {
                    "type": "deleted",
                    "path": event.src_path,
                    "folder_id": self.folder_id
                }
        
        if self._is_audio_file(event.dest_path):
            with self._lock:
                self._pending_events[event.dest_path] = {
                    "type": "created",
                    "path": event.dest_path,
                    "folder_id": self.folder_id
                }
        
        self._schedule_process()


class FileWatcher:
    def __init__(self):
        self._observers: Dict[int, Observer] = {}
        self._handlers: Dict[int, MusicFileHandler] = {}
        self._change_callback: Optional[Callable] = None
        self._running = False
    
    def set_change_callback(self, callback: Callable):
        self._change_callback = callback
    
    def _on_file_change(self, event_data: dict):
        if self._change_callback:
            self._change_callback(event_data)
    
    def watch_folder(self, folder_id: int, folder_path: str) -> bool:
        if folder_id in self._observers:
            return True
        
        path = Path(folder_path)
        if not path.exists() or not path.is_dir():
            return False
        
        try:
            handler = MusicFileHandler(folder_id, self._on_file_change)
            observer = Observer()
            observer.schedule(handler, str(path), recursive=True)
            observer.start()
            
            self._observers[folder_id] = observer
            self._handlers[folder_id] = handler
            self._running = True
            
            print(f"Started watching folder: {folder_path}")
            return True
            
        except Exception as e:
            print(f"Error starting watcher for {folder_path}: {e}")
            return False
    
    def unwatch_folder(self, folder_id: int) -> bool:
        if folder_id not in self._observers:
            return False
        
        try:
            observer = self._observers[folder_id]
            observer.stop()
            observer.join(timeout=5)
            
            del self._observers[folder_id]
            del self._handlers[folder_id]
            
            return True
            
        except Exception as e:
            print(f"Error stopping watcher for folder {folder_id}: {e}")
            return False
    
    def stop_all(self):
        for folder_id in list(self._observers.keys()):
            self.unwatch_folder(folder_id)
        self._running = False
    
    @property
    def is_running(self) -> bool:
        return self._running and len(self._observers) > 0
    
    def get_watched_folders(self) -> list:
        return list(self._observers.keys())

file_watcher = FileWatcher()
