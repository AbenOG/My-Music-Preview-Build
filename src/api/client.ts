import axios from 'axios';

const API_BASE_URL = '/api';
export const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const getStreamUrl = (trackId: number): string => {
  return `${API_BASE_URL}/stream/${trackId}`;
};

export const getArtworkUrl = (trackId: number): string => {
  return `${API_BASE_URL}/artwork/${trackId}`;
};

export const getAlbumArtworkUrl = (albumName: string): string => {
  return `${API_BASE_URL}/artwork/album/${encodeURIComponent(albumName)}`;
};

export default api;
