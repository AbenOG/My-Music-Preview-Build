import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tracksApi } from '../api/tracks';

export function useMoods() {
    return useQuery({
        queryKey: ['discover', 'moods'],
        queryFn: tracksApi.getMoods,
        staleTime: 10 * 60 * 1000,
    });
}

export function useDecades() {
    return useQuery({
        queryKey: ['discover', 'decades'],
        queryFn: tracksApi.getDecades,
        staleTime: 10 * 60 * 1000,
    });
}

export function useActivities() {
    return useQuery({
        queryKey: ['discover', 'activities'],
        queryFn: tracksApi.getActivities,
        staleTime: 10 * 60 * 1000,
    });
}

export function useNewAdditions(days = 7, limit = 20) {
    return useQuery({
        queryKey: ['discover', 'newAdditions', days, limit],
        queryFn: () => tracksApi.getNewAdditions(days, limit),
        staleTime: 5 * 60 * 1000,
    });
}

export function useRecommendations(limit = 20) {
    return useQuery({
        queryKey: ['discover', 'recommendations', limit],
        queryFn: () => tracksApi.getRecommendations(limit),
        staleTime: 2 * 60 * 1000,
    });
}

export function useRefreshRecommendations() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: ['discover', 'recommendations'] });
}
