import api from './client';
import type { Artist, Track } from '../types';

export interface ArtistAlbum {
  name: string;
  year: number | null;
  artwork_path: string | null;
  tracks: Track[];
}

export interface ArtistDetail {
  name: string;
  track_count: number;
  album_count: number;
  artwork_path: string | null;
  top_tracks: Track[];
  albums: ArtistAlbum[];
}

export const artistsApi = {
  list: async (limit = 100, offset = 0): Promise<Artist[]> => {
    const response = await api.get('/artists', { params: { limit, offset } });
    return response.data;
  },

  get: async (artistName: string): Promise<ArtistDetail> => {
    const response = await api.get(`/artists/${encodeURIComponent(artistName)}`);
    return response.data;
  },
};
