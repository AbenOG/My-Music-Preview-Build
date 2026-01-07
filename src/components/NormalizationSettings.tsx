import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Loader2,
  Check,
  ArrowRight,
  BarChart3,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { libraryApi } from '../api/library';
import { cn } from '../lib/utils';
import type { NormalizationStats, NormalizeProgress } from '../types';

interface PreviewResult {
  original: string;
  normalized: string;
}

export function NormalizationSettings() {
  const [stats, setStats] = useState<NormalizationStats | null>(null);
  const [progress, setProgress] = useState<NormalizeProgress | null>(null);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  // Preview state
  const [previewArtist, setPreviewArtist] = useState('');
  const [previewAlbum, setPreviewAlbum] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewResults, setPreviewResults] = useState<{
    artist?: PreviewResult;
    album?: PreviewResult;
    title?: PreviewResult;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await libraryApi.getNormalizationStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isNormalizing) {
      interval = setInterval(async () => {
        try {
          const data = await libraryApi.getNormalizeProgress();
          setProgress(data);

          if (!data.is_running) {
            setIsNormalizing(false);
            loadStats();
          }
        } catch (error) {
          console.error('Error fetching progress:', error);
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isNormalizing, loadStats]);

  const handleNormalize = async () => {
    setIsNormalizing(true);
    setProgress(null);

    try {
      await libraryApi.normalizeLibrary();
    } catch (error) {
      console.error('Error starting normalization:', error);
      setIsNormalizing(false);
    }
  };

  const handlePreview = async () => {
    if (!previewArtist && !previewAlbum && !previewTitle) return;

    setPreviewLoading(true);
    try {
      const result = await libraryApi.previewNormalization({
        artist: previewArtist || undefined,
        album: previewAlbum || undefined,
        title: previewTitle || undefined,
      });
      setPreviewResults(result);
    } catch (error) {
      console.error('Error previewing:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const progressPercent = progress && progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h3 className="font-bold">Metadata Normalization</h3>
              <p className="text-sm text-white/50">Clean and standardize track metadata</p>
            </div>
          </div>

          {!isNormalizing && (
            <button
              onClick={loadStats}
              disabled={loadingStats}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Refresh stats"
            >
              <RefreshCw className={cn('w-4 h-4', loadingStats && 'animate-spin')} />
            </button>
          )}
        </div>

        {stats && !isNormalizing && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-2xl font-bold">{stats.total_tracks}</p>
              <p className="text-white/50 text-sm">Total Tracks</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-2xl font-bold">{stats.normalized_tracks}</p>
              <p className="text-white/50 text-sm">Normalized</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-2xl font-bold text-yellow-400">
                {stats.total_tracks - stats.normalized_tracks}
              </p>
              <p className="text-white/50 text-sm">Pending</p>
            </div>
          </div>
        )}

        {isNormalizing && progress && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Normalizing...</span>
              <span className="font-medium">
                {progress.processed} / {progress.total}
              </span>
            </div>

            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {progress.current_track && (
              <p className="text-sm text-white/40 truncate">Current: {progress.current_track}</p>
            )}
          </div>
        )}

        {!isNormalizing && (
          <div className="space-y-4">
            <div className="bg-white/[0.03] rounded-lg p-4">
              <h4 className="font-medium mb-2 text-sm">Normalization includes:</h4>
              <ul className="text-sm text-white/50 space-y-1 list-disc list-inside">
                <li>Unicode normalization (NFKC)</li>
                <li>Case standardization</li>
                <li>Whitespace cleanup (trim, collapse multiple spaces)</li>
                <li>Article handling ("The Beatles" → "beatles, the" for sorting)</li>
                <li>Quote and dash normalization</li>
              </ul>
            </div>

            <button
              onClick={handleNormalize}
              className="w-full px-4 py-3 bg-pink-500 hover:bg-pink-600 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Normalize Entire Library
            </button>
          </div>
        )}
      </div>

      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold">Preview Normalization</h3>
            <p className="text-sm text-white/50">Test how text will be normalized</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-white/50 mb-1">Artist</label>
            <input
              type="text"
              value={previewArtist}
              onChange={e => setPreviewArtist(e.target.value)}
              placeholder="e.g., THE BEATLES"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Album</label>
            <input
              type="text"
              value={previewAlbum}
              onChange={e => setPreviewAlbum(e.target.value)}
              placeholder="e.g., Abbey Road (Remastered)"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Title</label>
            <input
              type="text"
              value={previewTitle}
              onChange={e => setPreviewTitle(e.target.value)}
              placeholder="e.g., Come Together - 2019 Mix"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          <button
            onClick={handlePreview}
            disabled={previewLoading || (!previewArtist && !previewAlbum && !previewTitle)}
            className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Preview
          </button>
        </div>

        {previewResults && (
          <div className="mt-4 space-y-2">
            {previewResults.artist && (
              <PreviewResultRow label="Artist" result={previewResults.artist} />
            )}
            {previewResults.album && (
              <PreviewResultRow label="Album" result={previewResults.album} />
            )}
            {previewResults.title && (
              <PreviewResultRow label="Title" result={previewResults.title} />
            )}
          </div>
        )}
      </div>

      {stats && stats.avg_completeness_score !== undefined && (
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h3 className="font-bold mb-4">Metadata Quality</h3>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-white/50">Average Completeness</span>
                <span className={cn(
                  'font-medium',
                  stats.avg_completeness_score >= 80 ? 'text-emerald-400' :
                  stats.avg_completeness_score >= 60 ? 'text-yellow-400' :
                  'text-orange-400'
                )}>
                  {Math.round(stats.avg_completeness_score)}%
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    stats.avg_completeness_score >= 80 ? 'bg-emerald-500' :
                    stats.avg_completeness_score >= 60 ? 'bg-yellow-500' :
                    'bg-orange-500'
                  )}
                  style={{ width: `${stats.avg_completeness_score}%` }}
                />
              </div>
            </div>

            {stats.tracks_missing_artist > 0 && (
              <div className="flex items-center gap-2 text-sm text-yellow-400">
                <AlertCircle className="w-4 h-4" />
                {stats.tracks_missing_artist} tracks missing artist
              </div>
            )}

            {stats.tracks_missing_title > 0 && (
              <div className="flex items-center gap-2 text-sm text-yellow-400">
                <AlertCircle className="w-4 h-4" />
                {stats.tracks_missing_title} tracks missing title
              </div>
            )}

            {stats.tracks_missing_album > 0 && (
              <div className="flex items-center gap-2 text-sm text-white/40">
                <AlertCircle className="w-4 h-4" />
                {stats.tracks_missing_album} tracks missing album
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewResultRow({ label, result }: { label: string; result: PreviewResult }) {
  const hasChange = result.original !== result.normalized;

  return (
    <div className="bg-white/[0.03] rounded-lg p-3">
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-white/70 truncate flex-1">{result.original}</span>
        {hasChange ? (
          <>
            <ArrowRight className="w-4 h-4 text-pink-400 flex-shrink-0" />
            <span className="text-pink-400 truncate flex-1 font-medium">{result.normalized}</span>
          </>
        ) : (
          <span className="text-white/30 text-sm flex-shrink-0 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Already clean
          </span>
        )}
      </div>
    </div>
  );
}
