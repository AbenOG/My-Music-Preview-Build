import api from './client';

export interface RadioStation {
    id: number;
    name: string;
    url: string;
    genre: string | null;
    country: string | null;
    logo_url: string | null;
    is_favorite: boolean;
    is_custom: boolean;
    created_at: string;
}

// Radio Browser API types (formatted by backend)
export interface BrowseStation {
    stationuuid: string;
    name: string;
    url: string;
    favicon: string;
    tags: string[];
    country: string;
    votes: number;
    codec: string;
    bitrate: number;
}

export interface BrowseCountry {
    name: string;
    station_count: number;
}

export interface BrowseGenre {
    name: string;
    station_count: number;
}

export interface RadioStationCreate {
    name: string;
    url: string;
    genre?: string;
    country?: string;
    logo_url?: string;
}

export const radioApi = {
    list: async (): Promise<RadioStation[]> => {
        const response = await api.get('/radio');
        return response.data;
    },
    
    init: async (): Promise<void> => {
        await api.post('/radio/init');
    },
    
    create: async (data: RadioStationCreate): Promise<RadioStation> => {
        const response = await api.post('/radio', data);
        return response.data;
    },
    
    delete: async (id: number): Promise<void> => {
        await api.delete(`/radio/${id}`);
    },
    
    toggleFavorite: async (id: number): Promise<{ is_favorite: boolean }> => {
        const response = await api.post(`/radio/${id}/favorite`);
        return response.data;
    },

    // Radio Browser API methods
    getCountries: async (): Promise<BrowseCountry[]> => {
        const response = await api.get('/radio/browse/countries');
        return response.data;
    },

    getGenres: async (): Promise<BrowseGenre[]> => {
        const response = await api.get('/radio/browse/genres');
        return response.data;
    },

    getTopStations: async (limit: number = 50): Promise<BrowseStation[]> => {
        const response = await api.get(`/radio/browse/top?limit=${limit}`);
        return response.data;
    },

    searchStations: async (params: {
        name?: string;
        country?: string;
        tag?: string;
        limit?: number;
    }): Promise<BrowseStation[]> => {
        const response = await api.get('/radio/browse/search', { params });
        return response.data;
    },

    registerClick: async (stationUuid: string): Promise<void> => {
        await api.post(`/radio/browse/${stationUuid}/click`);
    },
};
