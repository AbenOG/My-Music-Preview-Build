import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Music Player"
    APP_VERSION: str = "1.0.0"
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    DATABASE_PATH: Path = DATA_DIR / "music.db"
    ARTWORK_CACHE_DIR: Path = DATA_DIR / "cache" / "artwork"
    
    DATABASE_URL: str = f"sqlite:///{DATABASE_PATH}"
    
    SUPPORTED_FORMATS: tuple = (".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg", ".wma")
    
    SCAN_BATCH_SIZE: int = 50
    FILE_WATCHER_DEBOUNCE_MS: int = 500
    
    CORS_ORIGINS: list = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.ARTWORK_CACHE_DIR.mkdir(parents=True, exist_ok=True)
