import api from './client';
import type { Folder, ScanStatus } from '../types';

export const foldersApi = {
  list: async (): Promise<Folder[]> => {
    const response = await api.get('/folders');
    return response.data;
  },

  add: async (path: string): Promise<Folder> => {
    const response = await api.post('/folders', { path });
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/folders/${id}`);
  },

  scan: async (id: number): Promise<void> => {
    await api.post(`/folders/${id}/scan`);
  },

  getScanStatus: async (): Promise<ScanStatus> => {
    const response = await api.get('/folders/scan-status');
    return response.data;
  },
};
