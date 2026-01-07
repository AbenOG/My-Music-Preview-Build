import api from './client';
import type { PlayerState } from '../types';

export const playerApi = {
  getState: async (): Promise<PlayerState> => {
    const response = await api.get('/player/state');
    return response.data;
  },

  saveState: async (state: Partial<PlayerState>): Promise<PlayerState> => {
    const response = await api.put('/player/state', state);
    return response.data;
  },

  getQueue: async (): Promise<{ tracks: number[]; current_index: number }> => {
    const response = await api.get('/queue');
    return response.data;
  },

  updateQueue: async (trackIds: number[]): Promise<void> => {
    await api.put('/queue', { track_ids: trackIds });
  },

  addToQueue: async (trackId: number, position?: number): Promise<void> => {
    await api.post('/queue/add', { track_id: trackId, position });
  },

  clearQueue: async (): Promise<void> => {
    await api.delete('/queue/clear');
  },
};
