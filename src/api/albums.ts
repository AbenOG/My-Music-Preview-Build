import api from './client';
import type { Album } from '../types';

export const albumsApi = {
  list: async (limit = 100, offset = 0): Promise<Album[]> => {
    const response = await api.get('/albums', { params: { limit, offset } });
    return response.data;
  },

  get: async (albumName: string): Promise<Album> => {
    const response = await api.get(`/albums/${encodeURIComponent(albumName)}`);
    return response.data;
  },

  getSaved: async (): Promise<Album[]> => {
    const response = await api.get('/albums/saved');
    return response.data;
  },

  save: async (albumName: string, albumArtist?: string): Promise<{ is_saved: boolean }> => {
    const response = await api.post('/albums/saved', {
      album_name: albumName,
      album_artist: albumArtist
    });
    return response.data;
  },

  unsave: async (albumName: string, albumArtist?: string): Promise<{ is_saved: boolean }> => {
    const response = await api.delete('/albums/saved', {
      params: { album_name: albumName, album_artist: albumArtist }
    });
    return response.data;
  },

  checkSaved: async (albumName: string, albumArtist?: string): Promise<{ is_saved: boolean }> => {
    const response = await api.get(`/albums/${encodeURIComponent(albumName)}/saved-status`, {
      params: { album_artist: albumArtist }
    });
    return response.data;
  },
};
