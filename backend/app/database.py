from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

engine = create_engine(
    str(settings.DATABASE_URL),
    connect_args={"check_same_thread": False},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from .models import folder, track, playlist, player_state, radio, musicbrainz, duplicate

    # Create all tables (new tables will be created)
    Base.metadata.create_all(bind=engine)

    # Add new columns to existing tracks table
    _migrate_tracks_table()


def _migrate_tracks_table():
    """Add new columns to tracks table if they don't exist."""
    from sqlalchemy import inspect, text

    inspector = inspect(engine)

    # Check if tracks table exists
    if 'tracks' not in inspector.get_table_names():
        return

    existing_columns = {col['name'] for col in inspector.get_columns('tracks')}

    new_columns = [
        ("artist_normalized", "VARCHAR"),
        ("album_normalized", "VARCHAR"),
        ("title_normalized", "VARCHAR"),
        ("artist_original", "VARCHAR"),
        ("album_original", "VARCHAR"),
        ("title_original", "VARCHAR"),
        ("musicbrainz_recording_id", "VARCHAR"),
        ("musicbrainz_release_id", "VARCHAR"),
        ("musicbrainz_artist_id", "VARCHAR"),
        ("musicbrainz_lookup_at", "DATETIME"),
        ("metadata_completeness", "FLOAT"),
        # Loudness normalization
        ("loudness_integrated", "FLOAT"),
        ("loudness_true_peak", "FLOAT"),
        ("loudness_range", "FLOAT"),
        ("loudness_gain", "FLOAT"),
    ]

    with engine.connect() as conn:
        for col_name, col_type in new_columns:
            if col_name not in existing_columns:
                conn.execute(text(f"ALTER TABLE tracks ADD COLUMN {col_name} {col_type}"))
        conn.commit()
