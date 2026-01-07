import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  Check,
  Music2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  GitMerge,
  Eye,
  EyeOff,
  Fingerprint,
  FileText,
  Clock,
  ChevronDown,
  ChevronRight,
  Star,
  X,
  Info,
} from 'lucide-react';
import { libraryApi } from '../api/library';
import { getArtworkUrl } from '../api/client';
import { cn } from '../lib/utils';
import type { DuplicateGroup, DuplicateTrack, DuplicateStats, MergeResult } from '../types';

type DetectionType = 'exact_hash' | 'fuzzy_metadata' | 'duration_match';

const DETECTION_BADGES: Record<DetectionType, { label: string; color: string; icon: typeof Fingerprint }> = {
  exact_hash: { label: 'Exact Match', color: 'bg-red-500/20 text-red-400', icon: Fingerprint },
  fuzzy_metadata: { label: 'Similar Metadata', color: 'bg-yellow-500/20 text-yellow-400', icon: FileText },
  duration_match: { label: 'Duration Match', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
};

interface MergeModalProps {
  group: DuplicateGroup;
  selectedKeepId: number;
  onClose: () => void;
  onConfirm: (deleteFiles: boolean) => void;
  isLoading: boolean;
}

function MergeModal({ group, selectedKeepId, onClose, onConfirm, isLoading }: MergeModalProps) {
  const [deleteFiles, setDeleteFiles] = useState(false);
  const keepTrack = group.tracks.find(t => t.id === selectedKeepId);
  const deleteTrackCount = group.tracks.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-zinc-900 rounded-xl p-6 max-w-lg w-full border border-white/10"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Merge Duplicates</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <p className="text-sm text-emerald-400 font-medium mb-2">Keeping:</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                {keepTrack?.artwork_path ? (
                  <img src={getArtworkUrl(keepTrack.id)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music2 className="w-5 h-5 text-white/20" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{keepTrack?.title}</p>
                <p className="text-sm text-white/50 truncate">{keepTrack?.artist}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-sm text-white/70 mb-3">
              <Info className="w-4 h-4 inline mr-1" />
              The following will be transferred to the kept track:
            </p>
            <ul className="text-sm text-white/50 space-y-1 ml-5 list-disc">
              <li>Play history from all duplicates</li>
              <li>Playlist associations</li>
              <li>Liked status (if any duplicate is liked)</li>
              <li>Combined play count</li>
              <li>Best available metadata</li>
            </ul>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-sm text-red-400 font-medium mb-2">
              Removing {deleteTrackCount} duplicate{deleteTrackCount > 1 ? 's' : ''} from library
            </p>

            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteFiles}
                onChange={e => setDeleteFiles(e.target.checked)}
                className="w-4 h-4 rounded border-white/30 bg-transparent accent-red-500"
              />
              <span className="text-sm text-white/70">Also delete files from disk</span>
            </label>
            {deleteFiles && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                This action cannot be undone!
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(deleteFiles)}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GitMerge className="w-4 h-4" />
            )}
            Merge
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface MergeAllModalProps {
  groups: DuplicateGroup[];
  onClose: () => void;
  onConfirm: (deleteFiles: boolean) => void;
  isLoading: boolean;
}

function MergeAllModal({ groups, onClose, onConfirm, isLoading }: MergeAllModalProps) {
  const [deleteFiles, setDeleteFiles] = useState(false);

  const totalDuplicates = groups.reduce((sum, g) => sum + g.tracks.length - 1, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-zinc-900 rounded-xl p-6 max-w-lg w-full border border-white/10"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Merge All Duplicates</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
            <p className="text-lg font-semibold text-pink-400 mb-1">
              {groups.length} groups to merge
            </p>
            <p className="text-sm text-white/50">
              {totalDuplicates} duplicate{totalDuplicates !== 1 ? 's' : ''} will be removed
            </p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-sm text-white/70 mb-3">
              <Info className="w-4 h-4 inline mr-1" />
              For each group, the highest quality track will be kept automatically:
            </p>
            <ul className="text-sm text-white/50 space-y-1 ml-5 list-disc">
              <li>Play history will be transferred</li>
              <li>Playlist associations will be merged</li>
              <li>Liked status will be preserved</li>
              <li>Best available metadata will be kept</li>
            </ul>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteFiles}
                onChange={e => setDeleteFiles(e.target.checked)}
                className="w-4 h-4 rounded border-white/30 bg-transparent accent-red-500"
              />
              <span className="text-sm text-white/70">Also delete files from disk</span>
            </label>
            {deleteFiles && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                This will permanently delete {totalDuplicates} file{totalDuplicates !== 1 ? 's' : ''} from your disk!
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(deleteFiles)}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GitMerge className="w-4 h-4" />
            )}
            {isLoading ? 'Merging...' : 'Merge All'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface GroupCardProps {
  group: DuplicateGroup;
  onMerge: (groupId: number, keepTrackId: number, deleteFiles: boolean) => Promise<void>;
  onIgnore: (groupId: number) => Promise<void>;
}

function GroupCard({ group, onMerge, onIgnore }: GroupCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedKeepId, setSelectedKeepId] = useState<number>(
    group.tracks.find(t => t.is_master)?.id || group.tracks[0]?.id
  );
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const badge = DETECTION_BADGES[group.detection_type as DetectionType] || DETECTION_BADGES.fuzzy_metadata;
  const BadgeIcon = badge.icon;

  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (ms: number) => {
    if (!ms) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const handleMerge = async (deleteFiles: boolean) => {
    setIsLoading(true);
    try {
      await onMerge(group.id, selectedKeepId, deleteFiles);
      setShowMergeModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIgnore = async () => {
    setIsLoading(true);
    try {
      await onIgnore(group.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 rounded-xl border border-white/5 overflow-hidden"
      >
        <div
          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-white/50" />
          ) : (
            <ChevronRight className="w-5 h-5 text-white/50" />
          )}

          <span className={cn('px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1', badge.color)}>
            <BadgeIcon className="w-3 h-3" />
            {badge.label}
          </span>

          <span className="text-white/50 text-sm flex-1">{group.detection_reason}</span>

          <span className="text-white/40 text-sm">{group.tracks.length} tracks</span>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 pb-4 space-y-2">
                {group.tracks.map(track => (
                  <div
                    key={track.id}
                    onClick={() => setSelectedKeepId(track.id)}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all',
                      selectedKeepId === track.id
                        ? 'bg-emerald-500/20 border border-emerald-500/50 ring-1 ring-emerald-500/30'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                        selectedKeepId === track.id ? 'bg-emerald-500 border-emerald-500' : 'border-white/30'
                      )}
                    >
                      {selectedKeepId === track.id && <Check className="w-3 h-3 text-white" />}
                    </div>

                    <div className="w-12 h-12 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                      {track.artwork_path ? (
                        <img src={getArtworkUrl(track.id)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 className="w-6 h-6 text-white/20" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{track.title}</p>
                      <p className="text-sm text-white/50 truncate">{track.artist || 'Unknown Artist'}</p>
                      <p className="text-xs text-white/30 truncate mt-0.5">{track.file_path}</p>
                    </div>

                    <div className="text-right text-sm space-y-1">
                      <p className="text-white/70">{track.bitrate ? `${track.bitrate} kbps` : 'Unknown'}</p>
                      <p className="text-white/40">{formatSize(track.file_size)}</p>
                    </div>

                    <div className="text-right text-sm text-white/50 w-14">{formatDuration(track.duration_ms)}</div>

                    <div className="w-20 text-right">
                      <div className={cn('text-sm font-medium', getQualityColor(track.quality_score))}>
                        {Math.round(track.quality_score)}%
                      </div>
                      <div className="text-xs text-white/40">Quality</div>
                    </div>

                    {track.is_master && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded font-medium flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Best
                      </span>
                    )}
                  </div>
                ))}

                <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setShowMergeModal(true)}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <GitMerge className="w-4 h-4" />
                    Merge (Keep Selected)
                  </button>
                  <button
                    onClick={handleIgnore}
                    disabled={isLoading}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeOff className="w-4 h-4" />}
                    Not Duplicates
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showMergeModal && (
          <MergeModal
            group={group}
            selectedKeepId={selectedKeepId}
            onClose={() => setShowMergeModal(false)}
            onConfirm={handleMerge}
            isLoading={isLoading}
          />
        )}
      </AnimatePresence>
    </>
  );
}

interface ScanProgress {
  is_running: boolean;
  phase: string;
  total_tracks: number;
  processed_tracks: number;
  current_track: string;
  progress: number;
  groups_found: number;
  duplicates_found: number;
  error: string | null;
}

const PHASE_LABELS: Record<string, string> = {
  idle: 'Idle',
  initializing: 'Initializing...',
  hash_matching: 'Finding exact matches...',
  fuzzy_matching: 'Comparing metadata...',
  duration_matching: 'Checking durations...',
  creating_groups: 'Creating groups...',
  complete: 'Complete',
  error: 'Error',
};

export function Duplicates() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [stats, setStats] = useState<DuplicateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [filter, setFilter] = useState<'all' | DetectionType>('all');
  const [showMergeAllModal, setShowMergeAllModal] = useState(false);
  const [mergeAllLoading, setMergeAllLoading] = useState(false);

  useEffect(() => {
    loadDuplicates();
    loadStats();
  }, []);

  // Poll for progress while scanning
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (scanning) {
      interval = setInterval(async () => {
        try {
          const progress = await libraryApi.getDuplicateScanProgress();
          setScanProgress(progress);

          // Check if scan completed
          if (!progress.is_running && progress.phase === 'complete') {
            setScanning(false);
            // Fetch the results
            const result = await libraryApi.getDuplicates(false);
            if (result.groups) {
              setGroups(result.groups);
            }
            await loadStats();
          } else if (progress.error) {
            setScanning(false);
          }
        } catch (error) {
          console.error('Error fetching progress:', error);
        }
      }, 300);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scanning]);

  const loadDuplicates = async (refresh = false) => {
    setLoading(true);
    try {
      const result = await libraryApi.getDuplicates(refresh);

      // Check if a scan was started
      if ('scanning' in result && result.scanning) {
        setScanning(true);
        setScanProgress(result.progress as ScanProgress);
        setLoading(false);
        return;
      }

      if (result.groups) {
        setGroups(result.groups);
      }
    } catch (error) {
      console.error('Error loading duplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await libraryApi.getDuplicateStats();
      setStats(result);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleRescan = async () => {
    setScanning(true);
    setScanProgress(null);
    try {
      const result = await libraryApi.rescanDuplicates();

      // Check if scan started in background
      if ('scanning' in result && result.scanning) {
        setScanProgress(result.progress as ScanProgress);
        return;
      }

      // Synchronous result (unlikely with new API)
      if (result.groups) {
        setGroups(result.groups);
        setScanning(false);
      }
      await loadStats();
    } catch (error) {
      console.error('Error rescanning:', error);
      setScanning(false);
    }
  };

  const handleMerge = async (groupId: number, keepTrackId: number, deleteFiles: boolean) => {
    try {
      await libraryApi.mergeDuplicates(groupId, keepTrackId, deleteFiles);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      await loadStats();
    } catch (error) {
      console.error('Error merging:', error);
      throw error;
    }
  };

  const handleIgnore = async (groupId: number) => {
    try {
      await libraryApi.ignoreDuplicateGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      await loadStats();
    } catch (error) {
      console.error('Error ignoring group:', error);
      throw error;
    }
  };

  const handleMergeAll = async (deleteFiles: boolean) => {
    setMergeAllLoading(true);
    try {
      // Build merge requests, selecting the highest quality track for each group
      const merges = groups.map(group => {
        // Find the track with highest quality_score, or fall back to first track
        const bestTrack = group.tracks.reduce((best, track) =>
          track.quality_score > best.quality_score ? track : best,
          group.tracks[0]
        );
        return {
          group_id: group.id,
          keep_track_id: bestTrack.id,
          delete_files: deleteFiles,
        };
      });

      await libraryApi.bulkMergeDuplicates(merges);
      setGroups([]);
      setShowMergeAllModal(false);
      await loadStats();
    } catch (error) {
      console.error('Error merging all:', error);
    } finally {
      setMergeAllLoading(false);
    }
  };

  const filteredGroups = useMemo(() => {
    if (filter === 'all') return groups;
    return groups.filter(g => g.detection_type === filter);
  }, [groups, filter]);

  const totalDuplicates = useMemo(() => {
    return groups.reduce((sum, g) => sum + g.tracks.length - 1, 0);
  }, [groups]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm">Analyzing library for duplicates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Duplicates</h1>
          <p className="text-white/50 mt-1">
            {groups.length} duplicate groups found ({totalDuplicates} extra copies)
          </p>
        </div>

        <div className="flex gap-2">
          {groups.length > 0 && (
            <button
              onClick={() => setShowMergeAllModal(true)}
              disabled={scanning || mergeAllLoading}
              className="px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <GitMerge className="w-4 h-4" />
              Merge All ({groups.length})
            </button>
          )}
          <button
            onClick={handleRescan}
            disabled={scanning}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Rescan Library
          </button>
        </div>
      </div>

      {scanning && scanProgress && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-xl p-6 border border-pink-500/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
              <div>
                <h3 className="text-lg font-semibold">Analyzing Library for Duplicates</h3>
                <p className="text-white/50 text-sm">{PHASE_LABELS[scanProgress.phase] || scanProgress.phase}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-pink-500">{scanProgress.progress.toFixed(1)}%</div>
              <p className="text-white/50 text-sm">
                {scanProgress.processed_tracks} / {scanProgress.total_tracks} tracks
              </p>
            </div>
          </div>

          <div className="mb-4">
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${scanProgress.progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
              />
            </div>
          </div>

          {scanProgress.current_track && (
            <div className="mb-4 bg-black/20 rounded-lg p-3">
              <p className="text-white/40 text-xs mb-1">Currently analyzing:</p>
              <p className="text-sm font-medium truncate">{scanProgress.current_track}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-black/20 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Fingerprint className="w-5 h-5 text-emerald-400" />
                <p className="text-2xl font-bold">{scanProgress.groups_found}</p>
              </div>
              <p className="text-white/50 text-sm">Groups Found</p>
            </div>
            <div className="bg-black/20 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <p className="text-2xl font-bold">{scanProgress.duplicates_found}</p>
              </div>
              <p className="text-white/50 text-sm">Duplicates Found</p>
            </div>
            <div className="bg-black/20 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-blue-400" />
                <p className="text-2xl font-bold">
                  {scanProgress.total_tracks > 0 && scanProgress.processed_tracks > 0
                    ? `${(scanProgress.processed_tracks / Math.max(scanProgress.total_tracks, 1) * 100).toFixed(0)}%`
                    : '0%'}
                </p>
              </div>
              <p className="text-white/50 text-sm">Progress</p>
            </div>
          </div>

          {scanProgress.error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm font-medium mb-2">Error during scan:</p>
              <p className="text-white/70 text-sm">{scanProgress.error}</p>
            </div>
          )}
        </motion.div>
      )}

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <p className="text-2xl font-bold">{stats.total_groups}</p>
            <p className="text-white/50 text-sm">Duplicate Groups</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <p className="text-2xl font-bold">{stats.total_duplicate_tracks}</p>
            <p className="text-white/50 text-sm">Total Duplicates</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <p className="text-2xl font-bold">{stats.resolved_groups}</p>
            <p className="text-white/50 text-sm">Resolved</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <p className="text-2xl font-bold">
              {((stats.potential_space_savings || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB
            </p>
            <p className="text-white/50 text-sm">Potential Savings</p>
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filter === 'all' ? 'bg-pink-500 text-white' : 'bg-white/10 hover:bg-white/20'
            )}
          >
            All ({groups.length})
          </button>
          {(['exact_hash', 'fuzzy_metadata', 'duration_match'] as DetectionType[]).map(type => {
            const count = groups.filter(g => g.detection_type === type).length;
            if (count === 0) return null;
            const badge = DETECTION_BADGES[type];
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
                  filter === type ? 'bg-pink-500 text-white' : 'bg-white/10 hover:bg-white/20'
                )}
              >
                {badge.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="text-center py-16 bg-white/5 rounded-xl">
          <Check className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Duplicates Found</h2>
          <p className="text-white/50">Your library is clean!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(group => (
            <GroupCard key={group.id} group={group} onMerge={handleMerge} onIgnore={handleIgnore} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showMergeAllModal && (
          <MergeAllModal
            groups={groups}
            onClose={() => setShowMergeAllModal(false)}
            onConfirm={handleMergeAll}
            isLoading={mergeAllLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
