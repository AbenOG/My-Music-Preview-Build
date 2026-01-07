import { API_BASE } from './client';

export interface LyricsResponse {
    found: boolean;
    message?: string;
    synced?: boolean;
    syncedLyrics?: string | null;
    plainLyrics?: string | null;
    trackName?: string;
    artistName?: string;
    albumName?: string;
    duration?: number;
}

export const lyricsApi = {
    getLyrics: async (trackId: number): Promise<LyricsResponse> => {
        const response = await fetch(`${API_BASE}/lyrics/${trackId}`);
        return response.json();
    }
};
