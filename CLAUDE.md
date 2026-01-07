# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open-source local-first music player with a React frontend and Python/FastAPI backend. Scans local music folders, extracts metadata, and provides a Spotify-like interface.

## Development Commands

### Frontend (root directory)
```bash
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # Type-check and build for production
npm run lint     # ESLint
npm run preview  # Preview production build
```

### Backend (backend/ directory)
```bash
cd backend
source venv/bin/activate        # Activate virtualenv
pip install -r requirements.txt # Install dependencies
python run.py                   # Start FastAPI server (http://localhost:8000)
```

Both servers must run concurrently. Vite proxies `/api` and `/ws` to the backend.

## Architecture

### Frontend Stack
- **React 19** with TypeScript and Vite
- **Tailwind CSS v4** (using `@tailwindcss/vite` plugin)
- **Zustand** for state management (stores in `src/stores/`)
- **React Router** for navigation
- **Framer Motion** for animations

### Backend Stack
- **FastAPI** with SQLAlchemy + SQLite
- **Mutagen** for audio metadata extraction
- **Watchdog** for filesystem monitoring
- WebSocket for real-time updates

### Key Directories

**Frontend (`src/`):**
- `stores/` - Zustand stores: `playerStore.ts` (playback state, queue, shuffle), `libraryStore.ts` (tracks, playlists), `uiStore.ts` (panels, modals)
- `api/` - API client modules (axios-based), one file per resource
- `pages/` - Route page components
- `components/ui/` - Reusable UI components
- `components/layout/` - Layout wrapper components
- `components/audio/` - Audio player components

**Backend (`backend/app/`):**
- `api/routes/` - FastAPI route handlers per resource
- `services/` - Business logic: `scanner.py` (folder scanning), `metadata.py` (extraction), `watcher.py` (file monitoring), `recommendations.py`, `mood_mapper.py`
- `models/` - SQLAlchemy models: Track, Folder, Playlist, Radio, PlayerState
- `schemas/` - Pydantic request/response schemas

### Data Flow
1. User adds music folder via Settings page
2. Backend `scanner` service scans folder recursively, extracts metadata via `metadata` service
3. Tracks stored in SQLite (`backend/data/`)
4. `watcher` service monitors folders for changes, broadcasts updates via WebSocket
5. Frontend receives updates and refreshes library state

### API Proxy Setup
Vite dev server proxies `/api/*` to `http://localhost:8000` and `/ws` WebSocket connections.
