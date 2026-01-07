import asyncio
import threading
from typing import Callable, Optional

PYNPUT_AVAILABLE = False
try:
    from pynput import keyboard
    from pynput.keyboard import Key
    PYNPUT_AVAILABLE = True
except ImportError:
    pass

class MediaKeyHandler:
    def __init__(self):
        self._listener = None
        self._running = False
        self._callback: Optional[Callable] = None
        self._thread: Optional[threading.Thread] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
    
    def set_callback(self, callback: Callable):
        self._callback = callback
    
    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop
    
    def _on_key(self, key):
        if not PYNPUT_AVAILABLE:
            return
            
        try:
            media_key = None
            
            if hasattr(key, 'vk'):
                vk = key.vk
                if vk == 0xB3:
                    media_key = "play_pause"
                elif vk == 0xB0:
                    media_key = "next"
                elif vk == 0xB1:
                    media_key = "previous"
                elif vk == 0xB2:
                    media_key = "stop"
            
            if key == Key.media_play_pause:
                media_key = "play_pause"
            elif key == Key.media_next:
                media_key = "next"
            elif key == Key.media_previous:
                media_key = "previous"
            
            if media_key and self._callback and self._loop:
                asyncio.run_coroutine_threadsafe(
                    self._callback({"type": "media_key", "key": media_key}),
                    self._loop
                )
                
        except Exception as e:
            print(f"Error handling media key: {e}")
    
    def start(self):
        if not PYNPUT_AVAILABLE:
            print("Media key support disabled (pynput not installed)")
            return
            
        if self._running:
            return
        
        def run_listener():
            try:
                with keyboard.Listener(on_press=self._on_key) as listener:
                    self._listener = listener
                    self._running = True
                    listener.join()
            except Exception as e:
                print(f"Media key listener error: {e}")
                self._running = False
        
        self._thread = threading.Thread(target=run_listener, daemon=True)
        self._thread.start()
    
    def stop(self):
        self._running = False
        if self._listener:
            self._listener.stop()
        self._listener = None

media_key_handler = MediaKeyHandler()
