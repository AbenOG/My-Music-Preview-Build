<h1 align="center">
  MyMusic
</h1>

<p align="center">
  <strong>A beautiful, local-first music player with a modern interface</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#keyboard-shortcuts">Shortcuts</a> •
  <a href="#api-reference">API</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python" alt="Python">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

## Overview

<img src="https://i.ibb.co/6JtBDy04/mymusic.png" alt="mymusic">
<img src="https://i.ibb.co/8g9bHpF3/mymusic2.png" alt="mymusic2">

MyMusic is an open-source, local-first music player that brings a Spotify-like experience to your personal music collection. It scans your local music folders, extracts rich metadata, and presents everything in a sleek, modern interface.

**Why MyMusic?**
- **Privacy-focused**: Your music stays on your machine
- **No subscriptions**: Own your music, own your player
- **Fast & lightweight**: Built with modern technologies for smooth performance
- **Feature-rich**: Playlists, queues, shuffle, repeat, and more

---

## Features

### Core Functionality
- **Local Music Scanning** - Add folders and automatically discover all audio files
- **Metadata Extraction** - Extracts title, artist, album, genre, year, and embedded artwork
- **Album Artwork** - Displays high-quality embedded album art
- **Real-time Updates** - File watcher detects changes automatically

### Library Management
- **Playlists** - Create, edit, and manage custom playlists
- **Liked Songs** - Heart your favorites for quick access
- **Search** - Instant search across tracks, albums, and artists
- **Browse** - Explore by albums, artists, or genres

### Playback Features
- **Queue Management** - Build and reorder your play queue
- **Shuffle & Repeat** - Multiple playback modes (off, one, all)
- **Gapless Playback** - Seamless transitions between tracks
- **Volume Control** - Fine-grained volume adjustment

### User Experience
- **Modern Dark Theme** - Easy on the eyes, beautiful to look at
- **Smooth Animations** - Polished transitions powered by Framer Motion
- **Keyboard Shortcuts** - Full keyboard control for power users
- **Media Session API** - System-level controls and Now Playing info
- **Responsive Design** - Works on various screen sizes

---

## Supported Audio Formats

| Format | Extensions | Metadata Support |
|--------|------------|------------------|
| MP3 | `.mp3` | ID3v2.3/2.4 |
| FLAC | `.flac` | Vorbis Comments |
| AAC | `.m4a`, `.aac` | MP4 Tags |
| OGG Vorbis | `.ogg` | Vorbis Comments |
| WAV | `.wav` | Limited |
| WMA | `.wma` | ASF Tags |

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework with latest features |
| **TypeScript** | Type-safe development |
| **Vite** | Lightning-fast build tool |
| **Tailwind CSS v4** | Utility-first styling |
| **Zustand** | Lightweight state management |
| **React Query** | Server state & caching |
| **Framer Motion** | Smooth animations |
| **React Router** | Client-side routing |
| **Lucide React** | Beautiful icons |

### Backend
| Technology | Purpose |
|------------|---------|
| **Python 3.10+** | Backend runtime |
| **FastAPI** | High-performance API framework |
| **SQLAlchemy** | Database ORM |
| **SQLite** | Lightweight database |
| **Mutagen** | Audio metadata extraction |
| **Watchdog** | Filesystem monitoring |
| **WebSockets** | Real-time updates |
| **MusicBrainz** | Music database integration |

---

## Installation

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.10+ ([Download](https://python.org/))

### Quick Start

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/mymusic.git
cd mymusic
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server
python run.py
```

The backend API will be available at `http://localhost:8000`

#### 3. Frontend Setup

```bash
# From project root
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

---

## Usage

1. **Start both servers** - Backend (`python run.py`) and Frontend (`npm run dev`)
2. **Open the app** - Navigate to `http://localhost:5173`
3. **Add music folders** - Go to Settings and add your music directories
4. **Wait for scan** - The app will scan and index your music
5. **Enjoy!** - Browse, search, and play your music

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` / `→` | Seek backward / forward 5s |
| `Shift + ←` / `→` | Previous / Next track |
| `↑` / `↓` | Volume up / down |
| `N` | Next track |
| `P` | Previous track |
| `S` | Toggle shuffle |
| `R` | Cycle repeat mode |
| `M` | Toggle mute |
| `L` | Like / unlike current track |
| `Q` | Toggle queue panel |
| `/` or `Ctrl+K` | Focus search |
| `Esc` | Close modals / panels |

---

## Project Structure

```
mymusic/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # API endpoint handlers
│   │   ├── models/           # SQLAlchemy database models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── services/         # Business logic layer
│   │   │   ├── scanner.py    # Music folder scanning
│   │   │   ├── metadata.py   # Audio metadata extraction
│   │   │   └── watcher.py    # Filesystem monitoring
│   │   └── main.py           # FastAPI application entry
│   ├── requirements.txt      # Python dependencies
│   └── run.py                # Server startup script
│
├── src/
│   ├── api/                  # API client modules
│   ├── components/
│   │   ├── audio/            # Audio player components
│   │   ├── layout/           # Page layout components
│   │   └── ui/               # Reusable UI components
│   ├── hooks/                # Custom React hooks
│   ├── pages/                # Route page components
│   ├── stores/               # Zustand state stores
│   │   ├── playerStore.ts    # Playback state & queue
│   │   ├── libraryStore.ts   # Tracks & playlists
│   │   └── uiStore.ts        # UI state & modals
│   └── types/                # TypeScript definitions
│
├── package.json
├── vite.config.ts
└── README.md
```

---

## API Reference

### Folders
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/folders` | List all music folders |
| `POST` | `/api/folders` | Add a new folder |
| `DELETE` | `/api/folders/{id}` | Remove a folder |
| `POST` | `/api/folders/{id}/scan` | Trigger manual scan |

### Tracks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tracks` | List all tracks (paginated) |
| `GET` | `/api/tracks/search?q=` | Search tracks |
| `GET` | `/api/tracks/recent` | Recently added tracks |

### Albums & Artists
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/albums` | List all albums |
| `GET` | `/api/albums/{name}` | Get album with tracks |
| `GET` | `/api/artists` | List all artists |
| `GET` | `/api/artists/{name}` | Get artist details |

### Playlists
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/playlists` | List all playlists |
| `POST` | `/api/playlists` | Create a playlist |
| `GET` | `/api/playlists/{id}` | Get playlist details |
| `DELETE` | `/api/playlists/{id}` | Delete a playlist |

### Liked Songs
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/liked` | Get all liked songs |
| `POST` | `/api/liked/{track_id}` | Like a song |
| `DELETE` | `/api/liked/{track_id}` | Unlike a song |

### Streaming
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stream/{track_id}` | Stream audio (range requests supported) |
| `GET` | `/api/artwork/{track_id}` | Get track artwork |

---

## Development

### Running in Development

```bash
# Terminal 1 - Backend
cd backend && source venv/bin/activate && python run.py

# Terminal 2 - Frontend
npm run dev
```

### Building for Production

```bash
# Build frontend
npm run build

# Preview production build
npm run preview
```

### Linting

```bash
npm run lint
```

---

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Guidelines
- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features when applicable
- Update documentation as needed

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Mutagen](https://mutagen.readthedocs.io/) - Audio metadata library
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://react.dev/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [MusicBrainz](https://musicbrainz.org/) - Music metadata database

---
