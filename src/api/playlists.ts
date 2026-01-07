import api from './client';
import type { Playlist } from '../types';

export const playlistsApi = {
  list: async (): Promise<Playlist[]> => {
    const response = await api.get('/playlists');
    return response.data;
  },

  get: async (id: number): Promise<Playlist> => {
    const response = await api.get(`/playlists/${id}`);
    return response.data;
  },

  create: async (name: string, description?: string): Promise<Playlist> => {
    const response = await api.post('/playlists', { name, description });
    return response.data;
  },

  update: async (id: number, data: { name?: string; description?: string }): Promise<Playlist> => {
    const response = await api.put(`/playlists/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/playlists/${id}`);
  },

  addTrack: async (playlistId: number, trackId: number): Promise<void> => {
    await api.post(`/playlists/${playlistId}/tracks`, { track_id: trackId });
  },

  removeTrack: async (playlistId: number, trackId: number): Promise<void> => {
    await api.delete(`/playlists/${playlistId}/tracks/${trackId}`);
  },

  reorderTracks: async (playlistId: number, trackIds: number[]): Promise<void> => {
    await api.put(`/playlists/${playlistId}/tracks/reorder`, { track_ids: trackIds });
  },
};
