import { create } from 'zustand';
import type {
  Folder, Track, Album, Artist, Playlist, ScanStatus, LibraryStats,
  RecentlyPlayedAlbum, RecentlyPlayedArtist
} from '../types';
import { foldersApi } from '../api/folders';
import { tracksApi } from '../api/tracks';
import { albumsApi } from '../api/albums';
import { artistsApi } from '../api/artists';
import { playlistsApi } from '../api/playlists';

const getAlbumKey = (albumName: string, albumArtist: string | null): string => {
  return `${albumName}|${albumArtist || ''}`;
};

interface LibraryStore {
  folders: Folder[];
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  likedTracks: Track[];
  likedTrackIds: Set<number>;
  savedAlbums: Album[];
  savedAlbumKeys: Set<string>;
  recentTracks: Track[];
  stats: LibraryStats | null;

  // Activity hub state
  continueListening: Track[];
  recentlyPlayedAlbums: RecentlyPlayedAlbum[];
  recentlyPlayedArtists: RecentlyPlayedArtist[];
  recentPlaylists: Playlist[];

  isLoading: boolean;
  isScanning: boolean;
  scanProgress: ScanStatus | null;

  fetchFolders: () => Promise<void>;
  fetchTracks: () => Promise<void>;
  fetchAlbums: () => Promise<void>;
  fetchArtists: () => Promise<void>;
  fetchPlaylists: () => Promise<void>;
  fetchLikedTracks: () => Promise<void>;
  fetchSavedAlbums: () => Promise<void>;
  fetchRecentTracks: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchAll: () => Promise<void>;
  fetchActivityHub: () => Promise<void>;

  addFolder: (path: string) => Promise<Folder>;
  removeFolder: (id: number) => Promise<void>;
  scanFolder: (id: number) => Promise<void>;
  getScanStatus: () => Promise<void>;

  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  updatePlaylist: (id: number, data: { name?: string; description?: string }) => Promise<void>;
  deletePlaylist: (id: number) => Promise<void>;
  addTrackToPlaylist: (playlistId: number, trackId: number) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: number, trackId: number) => Promise<void>;

  toggleLike: (trackId: number) => Promise<void>;
  isLiked: (trackId: number) => boolean;

  toggleSaveAlbum: (albumName: string, albumArtist: string | null) => Promise<void>;
  isAlbumSaved: (albumName: string, albumArtist: string | null) => boolean;

  updateScanProgress: (progress: ScanStatus) => void;
  setIsScanning: (scanning: boolean) => void;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  folders: [],
  tracks: [],
  albums: [],
  artists: [],
  playlists: [],
  likedTracks: [],
  likedTrackIds: new Set(),
  savedAlbums: [],
  savedAlbumKeys: new Set(),
  recentTracks: [],
  stats: null,

  // Activity hub state
  continueListening: [],
  recentlyPlayedAlbums: [],
  recentlyPlayedArtists: [],
  recentPlaylists: [],

  isLoading: false,
  isScanning: false,
  scanProgress: null,

  fetchFolders: async () => {
    try {
      const folders = await foldersApi.list();
      set({ folders });
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  },

  fetchTracks: async () => {
    try {
      const response = await tracksApi.list({ per_page: 1000 });
      set({ tracks: response.tracks });
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
    }
  },

  fetchAlbums: async () => {
    try {
      const albums = await albumsApi.list(500);
      set({ albums });
    } catch (error) {
      console.error('Failed to fetch albums:', error);
    }
  },

  fetchArtists: async () => {
    try {
      const artists = await artistsApi.list(500);
      set({ artists });
    } catch (error) {
      console.error('Failed to fetch artists:', error);
    }
  },

  fetchPlaylists: async () => {
    try {
      const playlists = await playlistsApi.list();
      set({ playlists });
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  },

  fetchLikedTracks: async () => {
    try {
      const likedTracks = await tracksApi.getLiked();
      const likedTrackIds = new Set(likedTracks.map(t => t.id));
      set({ likedTracks, likedTrackIds });
    } catch (error) {
      console.error('Failed to fetch liked tracks:', error);
    }
  },

  fetchSavedAlbums: async () => {
    try {
      const savedAlbums = await albumsApi.getSaved();
      const savedAlbumKeys = new Set(
        savedAlbums.map(a => getAlbumKey(a.name, a.artist))
      );
      set({ savedAlbums, savedAlbumKeys });
    } catch (error) {
      console.error('Failed to fetch saved albums:', error);
    }
  },

  fetchRecentTracks: async () => {
    try {
      const recentTracks = await tracksApi.getRecent(20);
      set({ recentTracks });
    } catch (error) {
      console.error('Failed to fetch recent tracks:', error);
    }
  },

  fetchStats: async () => {
    try {
      const stats = await tracksApi.getStats();
      set({ stats });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  },

  fetchAll: async () => {
    set({ isLoading: true });
    try {
      await Promise.all([
        get().fetchFolders(),
        get().fetchTracks(),
        get().fetchAlbums(),
        get().fetchArtists(),
        get().fetchPlaylists(),
        get().fetchLikedTracks(),
        get().fetchSavedAlbums(),
        get().fetchRecentTracks(),
        get().fetchStats(),
      ]);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchActivityHub: async () => {
    try {
      const [continueListening, recentlyPlayedAlbums, recentlyPlayedArtists, recentPlaylists] = await Promise.all([
        tracksApi.getContinueListening(10),
        tracksApi.getRecentlyPlayedAlbums(8),
        tracksApi.getRecentlyPlayedArtists(8),
        playlistsApi.getRecent(6),
      ]);
      set({
        continueListening,
        recentlyPlayedAlbums,
        recentlyPlayedArtists,
        recentPlaylists,
      });
    } catch (error) {
      console.error('Failed to fetch activity hub:', error);
    }
  },

  addFolder: async (path: string) => {
    const folder = await foldersApi.add(path);
    set((state) => ({ folders: [...state.folders, folder] }));
    return folder;
  },

  removeFolder: async (id: number) => {
    await foldersApi.remove(id);
    set((state) => ({ 
      folders: state.folders.filter(f => f.id !== id) 
    }));
    await get().fetchTracks();
    await get().fetchAlbums();
    await get().fetchArtists();
  },

  scanFolder: async (id: number) => {
    await foldersApi.scan(id);
    set({ isScanning: true });
  },

  getScanStatus: async () => {
    const status = await foldersApi.getScanStatus();
    set({ scanProgress: status, isScanning: status.is_scanning });
  },

  createPlaylist: async (name: string, description?: string) => {
    const playlist = await playlistsApi.create(name, description);
    set((state) => ({ playlists: [playlist, ...state.playlists] }));
    return playlist;
  },

  updatePlaylist: async (id: number, data: { name?: string; description?: string }) => {
    await playlistsApi.update(id, data);
    await get().fetchPlaylists();
  },

  deletePlaylist: async (id: number) => {
    await playlistsApi.delete(id);
    set((state) => ({ 
      playlists: state.playlists.filter(p => p.id !== id) 
    }));
  },

  addTrackToPlaylist: async (playlistId: number, trackId: number) => {
    await playlistsApi.addTrack(playlistId, trackId);
    await get().fetchPlaylists();
  },

  removeTrackFromPlaylist: async (playlistId: number, trackId: number) => {
    await playlistsApi.removeTrack(playlistId, trackId);
    await get().fetchPlaylists();
  },

  toggleLike: async (trackId: number) => {
    const { likedTrackIds } = get();
    
    if (likedTrackIds.has(trackId)) {
      await tracksApi.unlike(trackId);
      set((state) => {
        const newIds = new Set(state.likedTrackIds);
        newIds.delete(trackId);
        return {
          likedTrackIds: newIds,
          likedTracks: state.likedTracks.filter(t => t.id !== trackId)
        };
      });
    } else {
      await tracksApi.like(trackId);
      const track = get().tracks.find(t => t.id === trackId);
      if (track) {
        set((state) => {
          const newIds = new Set(state.likedTrackIds);
          newIds.add(trackId);
          return {
            likedTrackIds: newIds,
            likedTracks: [{ ...track, is_liked: true }, ...state.likedTracks]
          };
        });
      }
    }
  },

  isLiked: (trackId: number) => {
    return get().likedTrackIds.has(trackId);
  },

  toggleSaveAlbum: async (albumName: string, albumArtist: string | null) => {
    const key = getAlbumKey(albumName, albumArtist);
    const { savedAlbumKeys, albums } = get();

    if (savedAlbumKeys.has(key)) {
      await albumsApi.unsave(albumName, albumArtist || undefined);
      set((state) => {
        const newKeys = new Set(state.savedAlbumKeys);
        newKeys.delete(key);
        return {
          savedAlbumKeys: newKeys,
          savedAlbums: state.savedAlbums.filter(
            a => getAlbumKey(a.name, a.artist) !== key
          )
        };
      });
    } else {
      await albumsApi.save(albumName, albumArtist || undefined);
      const album = albums.find(
        a => a.name === albumName && a.artist === albumArtist
      );
      if (album) {
        set((state) => {
          const newKeys = new Set(state.savedAlbumKeys);
          newKeys.add(key);
          return {
            savedAlbumKeys: newKeys,
            savedAlbums: [album, ...state.savedAlbums]
          };
        });
      }
    }
  },

  isAlbumSaved: (albumName: string, albumArtist: string | null) => {
    return get().savedAlbumKeys.has(getAlbumKey(albumName, albumArtist));
  },

  updateScanProgress: (progress: ScanStatus) => {
    set({ scanProgress: progress, isScanning: progress.is_scanning });
  },

  setIsScanning: (scanning: boolean) => {
    set({ isScanning: scanning });
  },
}));
