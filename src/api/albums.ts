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
};
