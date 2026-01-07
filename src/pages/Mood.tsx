import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Shuffle, Coffee, Zap, Cloud, Sun, Flame, Heart, Brain, PartyPopper } from 'lucide-react';
import { tracksApi } from '../api/tracks';
import { usePlayerStore } from '../stores/playerStore';
import { TrackList } from '../components/ui/TrackList';
import type { Track } from '../types';

const MOOD_ICONS: Record<string, any> = {
    'Chill': Coffee,
    'Energetic': Zap,
    'Melancholic': Cloud,
    'Happy': Sun,
    'Intense': Flame,
    'Romantic': Heart,
    'Focus': Brain,
    'Party': PartyPopper,
};

const MOOD_COLORS: Record<string, { from: string; to: string }> = {
    'Chill': { from: '#06b6d4', to: '#0891b2' },
    'Energetic': { from: '#f59e0b', to: '#ef4444' },
    'Melancholic': { from: '#6366f1', to: '#4f46e5' },
    'Happy': { from: '#fbbf24', to: '#f59e0b' },
    'Intense': { from: '#dc2626', to: '#991b1b' },
    'Romantic': { from: '#ec4899', to: '#db2777' },
    'Focus': { from: '#8b5cf6', to: '#7c3aed' },
    'Party': { from: '#f472b6', to: '#ec4899' },
};

export function Mood() {
    const { moodName } = useParams<{ moodName: string }>();
    const { play } = usePlayerStore();
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);

    const decodedMood = decodeURIComponent(moodName || '');
    const Icon = MOOD_ICONS[decodedMood] || Coffee;
    const colors = MOOD_COLORS[decodedMood] || { from: '#6b7280', to: '#4b5563' };

    useEffect(() => {
        loadTracks();
    }, [moodName]);

    const loadTracks = async () => {
        if (!moodName) return;
        setLoading(true);
        try {
            const data = await tracksApi.getTracksByMood(decodeURIComponent(moodName), 100);
            setTracks(data);
        } catch (error) {
            console.error('Error loading mood tracks:', error);
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
                        <Icon className="w-12 h-12 text-white" />
                    </div>
                    <p className="text-sm text-white/60 uppercase tracking-wider font-medium mb-2">Mood</p>
                    <h1 className="text-5xl font-bold mb-2">{decodedMood}</h1>
                    <p className="text-white/60">{tracks.length} tracks</p>
                    
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
                        <p className="text-white/50">No tracks found for this mood</p>
                    </div>
                ) : (
                    <TrackList tracks={tracks} />
                )}
            </div>
        </div>
    );
}
