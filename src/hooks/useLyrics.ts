import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlayerStore } from '../stores/playerStore';
import { lyricsApi, type LyricsResponse } from '../api/lyrics';

export interface ParsedLyric {
    time: number;
    text: string;
}

export function parseLRC(lrc: string): ParsedLyric[] {
    const lines = lrc.split('\n');
    const lyrics: ParsedLyric[] = [];

    for (const line of lines) {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const ms = parseInt(match[3].padEnd(3, '0'));
            const time = minutes * 60 + seconds + ms / 1000;
            const text = match[4].trim();
            if (text) {
                lyrics.push({ time, text });
            }
        }
    }

    return lyrics.sort((a, b) => a.time - b.time);
}

function binarySearchCurrentLine(lyrics: ParsedLyric[], time: number): number {
    if (lyrics.length === 0) return -1;

    let left = 0;
    let right = lyrics.length - 1;
    let result = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (lyrics[mid].time <= time) {
            result = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return result;
}

async function fetchLyrics(trackId: number): Promise<LyricsResponse> {
    return lyricsApi.getLyrics(trackId);
}

export function useLyrics() {
    const { currentTrack, currentTime, queue, queueIndex } = usePlayerStore();
    const queryClient = useQueryClient();

    const trackId = currentTrack?.id;

    // Fetch lyrics for current track with caching
    const { data: lyrics, isLoading, error: queryError } = useQuery({
        queryKey: ['lyrics', trackId],
        queryFn: () => fetchLyrics(trackId!),
        enabled: !!trackId,
        staleTime: Infinity,
        gcTime: 30 * 60 * 1000,
    });

    // Prefetch lyrics for next 3 songs in queue
    useEffect(() => {
        if (!trackId) return;

        const nextTracks = queue.slice(queueIndex + 1, queueIndex + 4);

        nextTracks.forEach(track => {
            queryClient.prefetchQuery({
                queryKey: ['lyrics', track.id],
                queryFn: () => fetchLyrics(track.id),
                staleTime: Infinity,
            });
        });
    }, [trackId, queue, queueIndex, queryClient]);

    const error = queryError
        ? 'Failed to fetch lyrics'
        : (lyrics && !lyrics.found ? (lyrics.message || 'Lyrics not found') : null);

    const parsedLyrics = useMemo(() => {
        if (lyrics?.syncedLyrics) {
            return parseLRC(lyrics.syncedLyrics);
        }
        return null;
    }, [lyrics?.syncedLyrics]);

    const currentLineIndex = useMemo(() => {
        if (!parsedLyrics) return -1;
        return binarySearchCurrentLine(parsedLyrics, currentTime);
    }, [parsedLyrics, currentTime]);

    return {
        lyrics: lyrics || null,
        parsedLyrics,
        currentLineIndex,
        isLoading,
        error,
    };
}
