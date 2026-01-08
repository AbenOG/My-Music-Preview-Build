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

  // Radio playlist generation
  generateRadio: async (seedTrackId: number, limit: number = 40): Promise<Playlist> => {
    const response = await api.post('/playlists/radio/generate', null, {
      params: { seed_track_id: seedTrackId, limit }
    });
    return response.data;
  },

  // Bulk add tracks to playlist
  addTracks: async (playlistId: number, trackIds: number[]): Promise<void> => {
    await api.post(`/playlists/${playlistId}/tracks/bulk`, { track_ids: trackIds });
  },

  // Extend radio playlist with more tracks
  extendRadio: async (
    playlistId: number,
    seedTrackId: number,
    excludeIds: number[] = [],
    limit: number = 20
  ): Promise<Playlist['tracks']> => {
    const response = await api.post(`/playlists/${playlistId}/extend`, {
      seed_track_id: seedTrackId,
      exclude_ids: excludeIds,
      limit
    });
    return response.data;
  },

  // Get recently modified playlists
  getRecent: async (limit: number = 6): Promise<Playlist[]> => {
    const response = await api.get('/playlists/recent', { params: { limit } });
    return response.data;
  },
};
