import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Loader2,
  Check,
  X,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { libraryApi } from '../api/library';
import { cn } from '../lib/utils';
import type { Track, MusicBrainzLookupResult } from '../types';

interface MusicBrainzLookupProps {
  track: Track;
  onApply?: () => void;
}

interface FieldCompareProps {
  label: string;
  current: string | number | null | undefined;
  suggested: string | number | null | undefined;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function FieldCompare({ label, current, suggested, selected, onToggle, disabled }: FieldCompareProps) {
  const hasChange = current !== suggested && suggested != null;
  const displayCurrent = current ?? 'Unknown';
  const displaySuggested = suggested ?? 'Unknown';

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-colors',
        hasChange ? 'bg-white/5' : 'bg-white/[0.02]',
        hasChange && !disabled && 'cursor-pointer hover:bg-white/10'
      )}
      onClick={() => hasChange && !disabled && onToggle()}
    >
      {hasChange && !disabled && (
        <div
          className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
            selected ? 'bg-pink-500 border-pink-500' : 'border-white/30'
          )}
        >
          {selected && <Check className="w-3 h-3 text-white" />}
        </div>
      )}

      <div className="flex-1 min-w-0 grid grid-cols-[100px_1fr_auto_1fr] gap-2 items-center">
        <span className="text-white/50 text-sm">{label}</span>
        <span className={cn('truncate', hasChange ? 'text-white/70' : 'text-white/40')}>{displayCurrent}</span>
        {hasChange ? (
          <>
            <ArrowRight className="w-4 h-4 text-pink-400" />
            <span className="truncate text-pink-400 font-medium">{displaySuggested}</span>
          </>
        ) : (
          <>
            <span />
            <span className="text-white/30 text-sm italic">No change</span>
          </>
        )}
      </div>
    </div>
  );
}

export function MusicBrainzLookup({ track, onApply }: MusicBrainzLookupProps) {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<MusicBrainzLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [applyFields, setApplyFields] = useState({
    artist: true,
    title: true,
    album: true,
    year: true,
    genre: true,
  });

  const handleLookup = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await libraryApi.lookupMusicBrainz(track.id);
      setResult(data);

      if (!data.found) {
        setError('No match found in MusicBrainz database');
      }
    } catch (err) {
      setError('Failed to lookup track. Please try again.');
      console.error('MusicBrainz lookup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!result?.found || !result.data) return;

    setApplying(true);
    try {
      await libraryApi.applyMusicBrainzMetadata(track.id, {
        apply_artist: applyFields.artist,
        apply_title: applyFields.title,
        apply_album: applyFields.album,
        apply_year: applyFields.year,
        apply_genre: applyFields.genre,
      });
      onApply?.();
    } catch (err) {
      console.error('Error applying metadata:', err);
    } finally {
      setApplying(false);
    }
  };

  const toggleField = (field: keyof typeof applyFields) => {
    setApplyFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const hasAnyChanges =
    result?.found &&
    result.data &&
    (result.data.artist !== track.artist ||
      result.data.title !== track.title ||
      result.data.album !== track.album ||
      result.data.year !== track.year ||
      result.data.genre !== track.genre);

  const selectedCount = Object.values(applyFields).filter(Boolean).length;

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <img
            src="https://musicbrainz.org/static/images/entity/recording.svg"
            alt="MusicBrainz"
            className="w-5 h-5 opacity-70"
          />
          <h3 className="font-medium">MusicBrainz Lookup</h3>
        </div>

        {!result && (
          <button
            onClick={handleLookup}
            disabled={loading}
            className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Searching...' : 'Search'}
          </button>
        )}

        {result && (
          <button
            onClick={handleLookup}
            disabled={loading}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title="Search again"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {error && !result?.found && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-yellow-400 text-sm p-3 bg-yellow-500/10 rounded-lg"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {result?.found && result.data && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <div className="space-y-1">
              <FieldCompare
                label="Artist"
                current={track.artist}
                suggested={result.data.artist}
                selected={applyFields.artist}
                onToggle={() => toggleField('artist')}
              />
              <FieldCompare
                label="Title"
                current={track.title}
                suggested={result.data.title}
                selected={applyFields.title}
                onToggle={() => toggleField('title')}
              />
              <FieldCompare
                label="Album"
                current={track.album}
                suggested={result.data.album}
                selected={applyFields.album}
                onToggle={() => toggleField('album')}
              />
              <FieldCompare
                label="Year"
                current={track.year}
                suggested={result.data.year}
                selected={applyFields.year}
                onToggle={() => toggleField('year')}
              />
              <FieldCompare
                label="Genre"
                current={track.genre}
                suggested={result.data.genre}
                selected={applyFields.genre}
                onToggle={() => toggleField('genre')}
              />
            </div>

            {result.data.recording_mbid && (
              <a
                href={`https://musicbrainz.org/recording/${result.data.recording_mbid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors mt-3"
              >
                <ExternalLink className="w-3 h-3" />
                View on MusicBrainz
              </a>
            )}

            {hasAnyChanges && (
              <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-3">
                <span className="text-sm text-white/50">
                  {selectedCount} field{selectedCount !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={handleApply}
                  disabled={applying || selectedCount === 0}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                    selectedCount > 0
                      ? 'bg-pink-500 hover:bg-pink-600'
                      : 'bg-white/10 text-white/40 cursor-not-allowed'
                  )}
                >
                  {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Apply Selected
                </button>
              </div>
            )}

            {!hasAnyChanges && (
              <div className="text-center py-3 text-white/50 text-sm">
                <Check className="w-5 h-5 inline mr-2 text-emerald-400" />
                Metadata matches MusicBrainz
              </div>
            )}
          </motion.div>
        )}

        {!loading && !result && !error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/40 text-sm text-center py-4">
            Click Search to look up this track on MusicBrainz
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

interface BatchMusicBrainzLookupProps {
  onComplete?: () => void;
}

export function BatchMusicBrainzLookup({ onComplete }: BatchMusicBrainzLookupProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'complete'>('idle');
  const [progress, setProgress] = useState({ processed: 0, total: 0, found: 0, not_found: 0 });

  const handleBatchLookup = async () => {
    setStatus('running');

    // This would be called with specific track IDs in practice
    // For now we just show the UI structure
    try {
      // Poll for progress
      const pollProgress = async () => {
        const data = await libraryApi.getMusicBrainzProgress();
        setProgress({
          processed: data.processed,
          total: data.total,
          found: data.found,
          not_found: data.not_found,
        });

        if (data.is_running) {
          setTimeout(pollProgress, 1000);
        } else {
          setStatus('complete');
          onComplete?.();
        }
      };

      await pollProgress();
    } catch (error) {
      console.error('Batch lookup error:', error);
      setStatus('idle');
    }
  };

  const progressPercent = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-lg font-bold mb-4">Batch MusicBrainz Lookup</h3>

      {status === 'idle' && (
        <div className="text-center py-4">
          <p className="text-white/50 mb-4">
            Look up all tracks in your library against MusicBrainz to enrich metadata.
          </p>
          <button
            onClick={handleBatchLookup}
            className="px-6 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg font-medium transition-colors"
          >
            Start Batch Lookup
          </button>
        </div>
      )}

      {status === 'running' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Progress</span>
            <span className="font-medium">
              {progress.processed} / {progress.total}
            </span>
          </div>

          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-emerald-500/10 rounded-lg p-3">
              <p className="text-emerald-400 font-medium">{progress.found}</p>
              <p className="text-white/50">Found</p>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-3">
              <p className="text-yellow-400 font-medium">{progress.not_found}</p>
              <p className="text-white/50">Not Found</p>
            </div>
          </div>
        </div>
      )}

      {status === 'complete' && (
        <div className="text-center py-4">
          <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="font-medium mb-2">Lookup Complete</p>
          <p className="text-white/50 text-sm">
            Found {progress.found} matches, {progress.not_found} not found
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
          >
            Run Again
          </button>
        </div>
      )}
    </div>
  );
}
