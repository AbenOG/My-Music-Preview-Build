import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Shuffle, Dumbbell, Brain, Moon, PartyPopper } from 'lucide-react';
import { tracksApi } from '../api/tracks';
import { usePlayerStore } from '../stores/playerStore';
import { TrackList } from '../components/ui/TrackList';
import type { Track } from '../types';

const ACTIVITY_ICONS: Record<string, any> = {
    'Workout': Dumbbell,
    'Focus': Brain,
    'Sleep': Moon,
    'Party': PartyPopper,
};

const ACTIVITY_COLORS: Record<string, { from: string; to: string }> = {
    'Workout': { from: '#ef4444', to: '#f97316' },
    'Focus': { from: '#6366f1', to: '#8b5cf6' },
    'Sleep': { from: '#1e3a5f', to: '#312e81' },
    'Party': { from: '#ec4899', to: '#f59e0b' },
};

const ACTIVITY_DESCRIPTIONS: Record<string, string> = {
    'Workout': 'High-energy tracks to power your workout',
    'Focus': 'Calm and instrumental music for concentration',
    'Sleep': 'Relaxing sounds to help you unwind',
    'Party': 'Upbeat tracks to get the party started',
};

export function Activity() {
    const { activityName } = useParams<{ activityName: string }>();
    const { play } = usePlayerStore();
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);

    const decodedActivity = decodeURIComponent(activityName || '');
    const Icon = ACTIVITY_ICONS[decodedActivity] || Dumbbell;
    const colors = ACTIVITY_COLORS[decodedActivity] || { from: '#6b7280', to: '#4b5563' };
    const description = ACTIVITY_DESCRIPTIONS[decodedActivity] || '';

    useEffect(() => {
        loadTracks();
    }, [activityName]);

    const loadTracks = async () => {
        if (!activityName) return;
        setLoading(true);
        try {
            const data = await tracksApi.getTracksByActivity(decodeURIComponent(activityName), 100);
            setTracks(data);
        } catch (error) {
            console.error('Error loading activity tracks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlayAll = () => {
        if (tracks.length > 0) {
            play(tracks[0], tracks, 0);
        }
    };

    const handleShuffle = () => {
        if (tracks.length > 0) {
            const shuffled = [...tracks].sort(() => Math.random() - 0.5);
            play(shuffled[0], shuffled, 0);
        }
    };

    const formatDuration = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes} min`;
    };

    const totalDuration = tracks.reduce((acc, t) => acc + (t.duration_ms || 0), 0);

    return (
        <div>
            <div
                className="relative h-96 pt-16 overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-8 left-8 right-8"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Icon className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <p className="text-sm text-white/60 uppercase tracking-wider font-medium mb-2">Activity Mix</p>
                    <h1 className="text-5xl font-bold mb-2">{decodedActivity}</h1>
                    <p className="text-white/70 mb-1">{description}</p>
                    <p className="text-white/60">{tracks.length} tracks · {formatDuration(totalDuration)}</p>
                    
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handlePlayAll}
                            disabled={tracks.length === 0}
                            className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-white/90 disabled:opacity-50 rounded-full font-medium transition-colors"
                        >
                            <Play className="w-5 h-5 fill-current" />
                            Play All
                        </button>
                        <button
                            onClick={handleShuffle}
                            disabled={tracks.length === 0}
                            className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 disabled:opacity-50 rounded-full font-medium transition-colors"
                        >
                            <Shuffle className="w-5 h-5" />
                            Shuffle
                        </button>
                    </div>
                </motion.div>
            </div>
            
            <div className="p-8">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : tracks.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-white/50">No tracks found for this activity</p>
                    </div>
                ) : (
                    <TrackList tracks={tracks} />
                )}
            </div>
        </div>
    );
}
