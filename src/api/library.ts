import api from './client';
import type {
  DuplicatesResponse,
  DuplicateGroup,
  DuplicateStats,
  MergeResult,
  MusicBrainzLookupResult,
  MusicBrainzBatchProgress,
  NormalizeProgress,
  NormalizationStats,
} from '../types';

export const libraryApi = {
  // ==================== DUPLICATES ====================

  getDuplicates: async (refresh: boolean = false): Promise<DuplicatesResponse> => {
    const response = await api.get('/duplicates', { params: { refresh } });
    return response.data;
  },

  getDuplicateGroup: async (groupId: number): Promise<DuplicateGroup> => {
    const response = await api.get(`/duplicates/${groupId}`);
    return response.data;
  },

  getDuplicateStats: async (): Promise<DuplicateStats> => {
    const response = await api.get('/duplicates/stats');
    return response.data;
  },

  mergeDuplicates: async (
    groupId: number,
    keepTrackId: number,
    deleteFiles: boolean = false
  ): Promise<MergeResult> => {
    const response = await api.post('/duplicates/merge', {
      group_id: groupId,
      keep_track_id: keepTrackId,
      delete_files: deleteFiles,
    });
    return response.data;
  },

  bulkMergeDuplicates: async (
    merges: Array<{ group_id: number; keep_track_id: number; delete_files: boolean }>
  ) => {
    const response = await api.post('/duplicates/merge/bulk', { merges });
    return response.data;
  },

  ignoreDuplicateGroup: async (groupId: number) => {
    const response = await api.post(`/duplicates/${groupId}/ignore`);
    return response.data;
  },

  deleteDuplicate: async (trackId: number, deleteFile: boolean = false) => {
    const response = await api.delete(`/duplicates/${trackId}`, {
      params: { delete_file: deleteFile },
    });
    return response.data;
  },

  autoSelectBest: async (groupIds: number[]) => {
    const response = await api.post('/duplicates/auto-select-best', groupIds);
    return response.data;
  },

  rescanDuplicates: async () => {
    const response = await api.post('/duplicates/rescan');
    return response.data;
  },

  getDuplicateScanProgress: async () => {
    const response = await api.get('/duplicates/progress');
    return response.data as {
      is_running: boolean;
      phase: string;
      total_tracks: number;
      processed_tracks: number;
      current_track: string;
      progress: number;
      groups_found: number;
      duplicates_found: number;
      error: string | null;
    };
  },

  // ==================== MUSICBRAINZ ====================

  getMusicBrainzStatus: async () => {
    const response = await api.get('/musicbrainz/status');
    return response.data;
  },

  lookupMusicBrainz: async (trackId: number): Promise<MusicBrainzLookupResult> => {
    const response = await api.post(`/musicbrainz/lookup/${trackId}`);
    return response.data;
  },

  lookupMusicBrainzByMetadata: async (
    artist: string,
    title: string,
    album?: string,
    durationMs?: number
  ) => {
    const response = await api.post('/musicbrainz/lookup', {
      artist,
      title,
      album,
      duration_ms: durationMs,
    });
    return response.data;
  },

  batchLookupMusicBrainz: async (trackIds: number[]) => {
    const response = await api.post('/musicbrainz/batch-lookup', {
      track_ids: trackIds,
    });
    return response.data;
  },

  getMusicBrainzProgress: async (): Promise<MusicBrainzBatchProgress> => {
    const response = await api.get('/musicbrainz/batch-lookup/progress');
    return response.data;
  },

  applyMusicBrainzMetadata: async (
    trackId: number,
    options: {
      apply_artist?: boolean;
      apply_title?: boolean;
      apply_album?: boolean;
      apply_year?: boolean;
      apply_genre?: boolean;
    }
  ) => {
    const response = await api.post(`/musicbrainz/apply/${trackId}`, options);
    return response.data;
  },

  clearMusicBrainzCache: async (olderThanDays?: number) => {
    const response = await api.post('/musicbrainz/clear-cache', null, {
      params: olderThanDays ? { older_than_days: olderThanDays } : undefined,
    });
    return response.data;
  },

  getMusicBrainzCacheStats: async () => {
    const response = await api.get('/musicbrainz/cache-stats');
    return response.data;
  },

  // ==================== NORMALIZATION ====================

  normalizeLibrary: async () => {
    const response = await api.post('/normalize/library');
    return response.data;
  },

  getNormalizeProgress: async (): Promise<NormalizeProgress> => {
    const response = await api.get('/normalize/progress');
    return response.data;
  },

  normalizeTrack: async (trackId: number) => {
    const response = await api.post(`/normalize/track/${trackId}`);
    return response.data;
  },

  previewNormalization: async (text: { artist?: string; album?: string; title?: string }) => {
    const response = await api.get('/normalize/preview', { params: text });
    return response.data;
  },

  getNormalizationStats: async (): Promise<NormalizationStats> => {
    const response = await api.get('/normalize/stats');
    return response.data;
  },

  // ==================== METADATA ISSUES ====================

  getMetadataIssues: async () => {
    const response = await api.get('/metadata/issues');
    return response.data;
  },

  fixTrackMetadata: async (
    trackId: number,
    data: { title?: string; artist?: string; album?: string; year?: number },
    writeToFile: boolean = false
  ) => {
    const response = await api.post(`/metadata/fix/${trackId}`, null, {
      params: { ...data, write_to_file: writeToFile },
    });
    return response.data;
  },

  fixAllMetadata: async (writeToFile: boolean = false) => {
    const response = await api.post('/metadata/fix-all', null, {
      params: { write_to_file: writeToFile },
    });
    return response.data;
  },

  // ==================== SMART PLAYLISTS ====================

  getSmartPlaylists: async () => {
    const response = await api.get('/playlists/smart');
    return response.data;
  },

  getSmartPlaylistTracks: async (ruleId: string) => {
    const response = await api.get(`/playlists/smart/${ruleId}`);
    return response.data;
  },
};
