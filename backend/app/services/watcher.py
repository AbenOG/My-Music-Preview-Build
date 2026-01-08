import os
import asyncio
import threading
import time
from pathlib import Path
from typing import Dict, Set, Callable, Optional, List
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileCreatedEvent, FileDeletedEvent, FileModifiedEvent, FileMovedEvent
from ..config import settings


class MusicFileHandler(FileSystemEventHandler):
    """
    Enhanced file handler with:
    - File stability checking (waits for file size to stabilize)
    - Batch collection (groups files before processing)
    - Immediate detection notifications
    """

    def __init__(
        self,
        folder_id: int,
        folder_path: str,
        on_batch_ready: Callable,
        on_files_detected: Callable,
        on_single_event: Callable
    ):
        super().__init__()
        self.folder_id = folder_id
        self.folder_path = folder_path
        self.on_batch_ready = on_batch_ready
        self.on_files_detected = on_files_detected
        self.on_single_event = on_single_event  # For deletes/modifies
        self.supported_formats = settings.SUPPORTED_FORMATS

        # Stability tracking for new files
        self._stability_queue: Dict[str, dict] = {}  # path -> {size, first_seen, last_size_change}
        self._ready_batch: Dict[str, dict] = {}      # Stable files ready to process

        # Pending events for delete/modify (handled immediately with debounce)
        self._pending_events: Dict[str, dict] = {}

        self._lock = threading.Lock()
        self._stability_timer: Optional[threading.Timer] = None
        self._batch_timer: Optional[threading.Timer] = None
        self._debounce_timer: Optional[threading.Timer] = None
        self._detection_notify_timer: Optional[threading.Timer] = None
        self._last_notified_count: int = 0

        self._stability_check_interval = settings.FILE_STABILITY_DELAY_MS / 1000
        self._batch_window = settings.FILE_BATCH_WINDOW_MS / 1000
        self._debounce_delay = settings.FILE_WATCHER_DEBOUNCE_MS / 1000
        self._detection_notify_interval = 0.3  # Throttle detection notifications to every 300ms

    def _is_audio_file(self, path: str) -> bool:
        return path.lower().endswith(self.supported_formats)

    def _get_file_size(self, path: str) -> Optional[int]:
        try:
            return os.path.getsize(path)
        except (OSError, IOError):
            return None

    def _start_stability_timer(self):
        """Start or restart the stability check timer."""
        with self._lock:
            if self._stability_timer:
                self._stability_timer.cancel()

            self._stability_timer = threading.Timer(
                self._stability_check_interval,
                self._check_stability
            )
            self._stability_timer.start()

    def _start_batch_timer(self):
        """Start the batch processing timer if not already running."""
        with self._lock:
            if self._batch_timer is None or not self._batch_timer.is_alive():
                self._batch_timer = threading.Timer(
                    self._batch_window,
                    self._flush_batch
                )
                self._batch_timer.start()

    def _schedule_detection_notify(self):
        """Throttle detection notifications to avoid spamming."""
        with self._lock:
            # If timer already scheduled, let it handle the notification
            if self._detection_notify_timer is not None and self._detection_notify_timer.is_alive():
                return

            self._detection_notify_timer = threading.Timer(
                self._detection_notify_interval,
                self._send_detection_notify
            )
            self._detection_notify_timer.start()

    def _send_detection_notify(self):
        """Send throttled detection notification."""
        with self._lock:
            current_count = len(self._stability_queue) + len(self._ready_batch)
            self._detection_notify_timer = None

            # Only notify if count changed
            if current_count == self._last_notified_count:
                return

            self._last_notified_count = current_count

        if current_count > 0:
            self.on_files_detected({
                "count": current_count,
                "folder_id": self.folder_id,
                "folder_path": self.folder_path
            })

    def _check_stability(self):
        """Check if files in stability queue have stable sizes."""
        now = time.time()
        files_to_move = []
        files_to_remove = []

        with self._lock:
            for path, info in list(self._stability_queue.items()):
                current_size = self._get_file_size(path)

                if current_size is None:
                    # File was deleted or inaccessible
                    files_to_remove.append(path)
                    continue

                if current_size != info["last_size"]:
                    # File size changed, update tracking
                    info["last_size"] = current_size
                    info["last_size_change"] = now
                elif (now - info["last_size_change"]) >= self._stability_check_interval:
                    # File size stable for required duration
                    files_to_move.append((path, info))

            # Move stable files to ready batch
            for path, info in files_to_move:
                del self._stability_queue[path]
                self._ready_batch[path] = {
                    "type": "created",
                    "path": path,
                    "folder_id": self.folder_id
                }

            # Remove inaccessible files
            for path in files_to_remove:
                del self._stability_queue[path]

            # Continue checking if there are still files in queue
            has_pending = len(self._stability_queue) > 0
            has_ready = len(self._ready_batch) > 0

        # Start batch timer if we have ready files
        if has_ready:
            self._start_batch_timer()

        # Continue stability checking if there are pending files
        if has_pending:
            self._start_stability_timer()

    def _flush_batch(self):
        """Process all files in the ready batch."""
        with self._lock:
            if not self._ready_batch:
                return

            batch = list(self._ready_batch.values())
            self._ready_batch.clear()
            self._batch_timer = None
            self._last_notified_count = 0  # Reset so future detections will notify

        if batch:
            self.on_batch_ready({
                "files": batch,
                "folder_id": self.folder_id,
                "folder_path": self.folder_path
            })

    def _schedule_debounce(self):
        """Schedule processing of delete/modify events with debounce."""
        with self._lock:
            if self._debounce_timer:
                self._debounce_timer.cancel()

            self._debounce_timer = threading.Timer(
                self._debounce_delay,
                self._process_pending_events
            )
            self._debounce_timer.start()

    def _process_pending_events(self):
        """Process pending delete/modify events."""
        with self._lock:
            if not self._pending_events:
                return

            events = self._pending_events.copy()
            self._pending_events.clear()

        for path, event_data in events.items():
            try:
                self.on_single_event(event_data)
            except Exception as e:
                print(f"Error processing file event for {path}: {e}")

    def on_created(self, event):
        if event.is_directory:
            return
        if not self._is_audio_file(event.src_path):
            return

        now = time.time()
        current_size = self._get_file_size(event.src_path)

        if current_size is None:
            return

        with self._lock:
            # Add to stability queue
            self._stability_queue[event.src_path] = {
                "first_seen": now,
                "last_size": current_size,
                "last_size_change": now
            }

        # Schedule throttled detection notification (avoids spamming)
        self._schedule_detection_notify()

        # Start stability checking
        self._start_stability_timer()

    def on_deleted(self, event):
        if event.is_directory:
            return
        if not self._is_audio_file(event.src_path):
            return

        with self._lock:
            # Remove from stability/batch queues if present
            self._stability_queue.pop(event.src_path, None)
            self._ready_batch.pop(event.src_path, None)

            # Add to pending events for immediate processing
            self._pending_events[event.src_path] = {
                "type": "deleted",
                "path": event.src_path,
                "folder_id": self.folder_id
            }

        self._schedule_debounce()

    def on_modified(self, event):
        if event.is_directory:
            return
        if not self._is_audio_file(event.src_path):
            return

        with self._lock:
            # If file is in stability queue, update its size tracking
            if event.src_path in self._stability_queue:
                current_size = self._get_file_size(event.src_path)
                if current_size is not None:
                    self._stability_queue[event.src_path]["last_size"] = current_size
                    self._stability_queue[event.src_path]["last_size_change"] = time.time()
                return

            # If file is in ready batch, it's already being processed
            if event.src_path in self._ready_batch:
                return

            # Existing file modified - add to pending events
            if event.src_path not in self._pending_events:
                self._pending_events[event.src_path] = {
                    "type": "modified",
                    "path": event.src_path,
                    "folder_id": self.folder_id
                }

        self._schedule_debounce()

    def on_moved(self, event):
        if event.is_directory:
            return

        # Handle source (treat as delete)
        if self._is_audio_file(event.src_path):
            with self._lock:
                self._stability_queue.pop(event.src_path, None)
                self._ready_batch.pop(event.src_path, None)
                self._pending_events[event.src_path] = {
                    "type": "deleted",
                    "path": event.src_path,
                    "folder_id": self.folder_id
                }
            self._schedule_debounce()

        # Handle destination (treat as create)
        if self._is_audio_file(event.dest_path):
            now = time.time()
            current_size = self._get_file_size(event.dest_path)

            if current_size is not None:
                with self._lock:
                    self._stability_queue[event.dest_path] = {
                        "first_seen": now,
                        "last_size": current_size,
                        "last_size_change": now
                    }

                # Schedule throttled detection notification
                self._schedule_detection_notify()
                self._start_stability_timer()

    def stop(self):
        """Clean up timers."""
        with self._lock:
            if self._stability_timer:
                self._stability_timer.cancel()
                self._stability_timer = None
            if self._batch_timer:
                self._batch_timer.cancel()
                self._batch_timer = None
            if self._debounce_timer:
                self._debounce_timer.cancel()
                self._debounce_timer = None
            if self._detection_notify_timer:
                self._detection_notify_timer.cancel()
                self._detection_notify_timer = None
            self._last_notified_count = 0


class FileWatcher:
    def __init__(self):
        self._observers: Dict[int, Observer] = {}
        self._handlers: Dict[int, MusicFileHandler] = {}
        self._folder_paths: Dict[int, str] = {}
        self._batch_callback: Optional[Callable] = None
        self._detection_callback: Optional[Callable] = None
        self._single_event_callback: Optional[Callable] = None
        self._running = False

    def set_batch_callback(self, callback: Callable):
        """Set callback for batch file processing."""
        self._batch_callback = callback

    def set_detection_callback(self, callback: Callable):
        """Set callback for immediate file detection notifications."""
        self._detection_callback = callback

    def set_single_event_callback(self, callback: Callable):
        """Set callback for single events (delete/modify)."""
        self._single_event_callback = callback

    def _on_batch_ready(self, batch_data: dict):
        if self._batch_callback:
            self._batch_callback(batch_data)

    def _on_files_detected(self, detection_data: dict):
        if self._detection_callback:
            self._detection_callback(detection_data)

    def _on_single_event(self, event_data: dict):
        if self._single_event_callback:
            self._single_event_callback(event_data)

    def watch_folder(self, folder_id: int, folder_path: str) -> bool:
        if folder_id in self._observers:
            return True

        path = Path(folder_path)
        if not path.exists() or not path.is_dir():
            return False

        try:
            handler = MusicFileHandler(
                folder_id,
                folder_path,
                self._on_batch_ready,
                self._on_files_detected,
                self._on_single_event
            )
            observer = Observer()
            observer.schedule(handler, str(path), recursive=True)
            observer.start()

            self._observers[folder_id] = observer
            self._handlers[folder_id] = handler
            self._folder_paths[folder_id] = folder_path
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
            handler = self._handlers[folder_id]

            handler.stop()
            observer.stop()
            observer.join(timeout=5)

            del self._observers[folder_id]
            del self._handlers[folder_id]
            del self._folder_paths[folder_id]

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

    def get_folder_path(self, folder_id: int) -> Optional[str]:
        return self._folder_paths.get(folder_id)


file_watcher = FileWatcher()
