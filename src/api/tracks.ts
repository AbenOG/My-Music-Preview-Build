import api from './client';
import type { Track, TrackListResponse, PlayHistory, LibraryStats } from '../types';

export interface TrackFilters {
  page?: number;
  per_page?: number;
  artist?: string;
  album?: string;
  genre?: string;
  sort_by?: 'title' | 'artist' | 'album' | 'created_at' | 'duration_ms';
  sort_order?: 'asc' | 'desc';
}

export const tracksApi = {
  list: async (filters: TrackFilters = {}): Promise<TrackListResponse> => {
    const response = await api.get('/tracks', { params: filters });
    return response.data;
  },

  get: async (id: number): Promise<Track> => {
    const response = await api.get(`/tracks/${id}`);
    return response.data;
  },

  search: async (query: string, limit = 20): Promise<Track[]> => {
    const response = await api.get('/tracks/search', { params: { q: query, limit } });
    return response.data;
  },

  getRecent: async (limit = 20): Promise<Track[]> => {
    const response = await api.get('/tracks/recent', { params: { limit } });
    return response.data;
  },

  getStats: async (): Promise<LibraryStats> => {
    const response = await api.get('/tracks/stats');
    return response.data;
  },

  getLiked: async (): Promise<Track[]> => {
    const response = await api.get('/liked');
    return response.data;
  },

  like: async (trackId: number): Promise<{ is_liked: boolean }> => {
    const response = await api.post(`/liked/${trackId}`);
    return response.data;
  },

  unlike: async (trackId: number): Promise<{ is_liked: boolean }> => {
    const response = await api.delete(`/liked/${trackId}`);
    return response.data;
  },

  checkLiked: async (trackId: number): Promise<{ is_liked: boolean }> => {
    const response = await api.get(`/liked/${trackId}/status`);
    return response.data;
  },

  getHistory: async (limit = 50): Promise<PlayHistory[]> => {
    const response = await api.get('/history', { params: { limit } });
    return response.data;
  },

  logPlay: async (trackId: number): Promise<void> => {
    await api.post(`/tracks/${trackId}/play`);
  },

  getMoods: async () => {
    const response = await api.get('/tracks/discover/moods');
    return response.data;
  },

  getTracksByMood: async (mood: string, limit = 50): Promise<Track[]> => {
    const response = await api.get(`/tracks/discover/by-mood/${encodeURIComponent(mood)}`, { params: { limit } });
    return response.data;
  },

  getDecades: async () => {
    const response = await api.get('/tracks/discover/decades');
    return response.data;
  },

  getTracksByDecade: async (decade: string, limit = 50): Promise<Track[]> => {
    const response = await api.get(`/tracks/discover/by-decade/${encodeURIComponent(decade)}`, { params: { limit } });
    return response.data;
  },

  getActivities: async () => {
    const response = await api.get('/tracks/discover/activities');
    return response.data;
  },

  getTracksByActivity: async (activity: string, limit = 50): Promise<Track[]> => {
    const response = await api.get(`/tracks/discover/by-activity/${encodeURIComponent(activity)}`, { params: { limit } });
    return response.data;
  },

  getRecommendations: async (limit = 30) => {
    const response = await api.get('/tracks/discover/recommendations', { params: { limit } });
    return response.data;
  },

  getNewAdditions: async (days = 7, limit = 20) => {
    const response = await api.get('/tracks/discover/new-additions', { params: { days, limit } });
    return response.data;
  },

  getSimilarArtists: async (artistName: string, limit = 10) => {
    const response = await api.get(`/tracks/discover/similar-artists/${encodeURIComponent(artistName)}`, { params: { limit } });
    return response.data;
  },
};
