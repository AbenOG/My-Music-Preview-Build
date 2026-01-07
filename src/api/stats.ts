import { API_BASE } from './client';
import type { Track } from '../types';

export interface ListeningStats {
    total_plays: number;
    total_duration_ms: number;
    most_played_artist: string | null;
    most_played_genre: string | null;
    track_count: number;
}

export const statsApi = {
    getStats: async (): Promise<ListeningStats> => {
        const response = await fetch(`${API_BASE}/tracks/listening-stats`);
        return response.json();
    },
    
    getContinueListening: async (limit: number = 10): Promise<Track[]> => {
        const response = await fetch(`${API_BASE}/tracks/continue-listening?limit=${limit}`);
        return response.json();
    }
};
