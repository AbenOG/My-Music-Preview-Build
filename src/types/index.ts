export interface Track {
  id: number;
  file_path: string;
  title: string;
  artist: string | null;
  album: string | null;
  album_artist: string | null;
  genre: string | null;
  year: number | null;
  track_number: number | null;
  disc_number: number | null;
  duration_ms: number | null;
  bitrate: number | null;
  sample_rate: number | null;
  format: string | null;
  file_size: number | null;
  artwork_path: string | null;
  created_at: string;
  updated_at: string;
  is_liked: boolean;
}

export interface TrackListResponse {
  tracks: Track[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface Album {
  name: string;
  artist: string | null;
  year: number | null;
  track_count: number;
  total_duration_ms: number;
  artwork_path: string | null;
  tracks?: Track[];
}

export interface Artist {
  name: string;
  track_count: number;
  album_count: number;
  artwork_path: string | null;
  albums: string[];
  top_tracks?: Track[];
}

export interface Folder {
  id: number;
  path: string;
  name: string;
  created_at: string;
  last_scanned_at: string | null;
  track_count: number;
}

export interface ScanStatus {
  is_scanning: boolean;
  folder_id: number | null;
  folder_path: string | null;
  current_file: string | null;
  processed: number;
  total: number;
  progress: number;
}

export interface Playlist {
  id: number;
  name: string;
  description: string | null;
  cover_path: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  track_count: number;
  total_duration_ms: number;
  tracks?: Track[];
}

export interface PlayerState {
  id: number;
  current_track_id: number | null;
  position_ms: number;
  volume: number;
  shuffle_enabled: boolean;
  repeat_mode: 'none' | 'one' | 'all';
  updated_at: string;
}

export interface PlayHistory {
  id: number;
  track_id: number;
  played_at: string;
  play_duration_ms: number | null;
  track: Track;
}

export interface LibraryStats {
  total_tracks: number;
  total_duration_ms: number;
  total_size_bytes: number;
  total_albums: number;
  total_artists: number;
  genres: { name: string; count: number }[];
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  key?: string;
}

export type RepeatMode = 'none' | 'one' | 'all';

// Duplicate detection types
export interface DuplicateTrack {
  id: number;
  title: string;
  artist: string | null;
  album: string | null;
  file_path: string;
  bitrate: number | null;
  sample_rate: number | null;
  format: string | null;
  file_size: number | null;
  duration_ms: number | null;
  artwork_path: string | null;
  quality_score: number;
  is_master: boolean;
}

export interface DuplicateGroup {
  id: number;
  type: 'exact_hash' | 'fuzzy_metadata' | 'duration_match';
  reason: string;
  status: 'unresolved' | 'resolved' | 'ignored';
  master_track_id: number;
  tracks: DuplicateTrack[];
}

export interface DuplicatesResponse {
  total_groups: number;
  total_duplicates: number;
  groups: DuplicateGroup[];
}

export interface DuplicateStats {
  total_groups: number;
  unresolved: number;
  resolved: number;
  ignored: number;
  potential_space_savings_bytes: number;
}

export interface MergeResult {
  success: boolean;
  kept_track_id: number;
  deleted_tracks: number;
  deleted_files: string[];
  transfers: {
    play_history: number;
    playlists: number;
    likes: number;
  };
}

// MusicBrainz types
export interface MusicBrainzData {
  recording_mbid: string | null;
  release_mbid: string | null;
  artist_mbid: string | null;
  artist: string | null;
  title: string | null;
  album: string | null;
  year: number | null;
  genre: string | null;
}

export interface MusicBrainzLookupResult {
  track_id: number;
  found: boolean;
  current: {
    artist: string | null;
    title: string | null;
    album: string | null;
    year: number | null;
    genre: string | null;
  };
  musicbrainz: MusicBrainzData | null;
}

export interface MusicBrainzBatchProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  data: {
    processed?: number;
    total?: number;
    current_track?: string;
    stats?: {
      found: number;
      not_found: number;
      errors: number;
      skipped: number;
    };
    error?: string;
  };
}

// Normalization types
export interface NormalizeProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  data: {
    processed?: number;
    total?: number;
    updated?: number;
    error?: string;
  };
}

export interface NormalizationStats {
  total_tracks: number;
  normalized_tracks: number;
  tracks_with_preserved_originals: number;
  average_completeness: number;
}
