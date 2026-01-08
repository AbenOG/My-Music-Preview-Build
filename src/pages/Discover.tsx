import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Coffee, Zap, Cloud, Sun, Flame, Heart,
    Dumbbell, Brain, Moon, PartyPopper,
    Sparkles, Clock, Play, RefreshCw, Car, BookOpen
} from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { getArtworkUrl } from '../api/client';
import { useMoods, useDecades, useActivities, useNewAdditions, useRecommendations, useRefreshRecommendations } from '../hooks/useDiscoverData';
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

const ACTIVITY_ICONS: Record<string, any> = {
    'Workout': Dumbbell,
    'Studying': BookOpen,
    'Sleep': Moon,
    'Driving': Car,
};

interface Recommendation {
    track: Track;
    reason: string;
}

export function Discover() {
    const navigate = useNavigate();
    const { play } = usePlayerStore();

    const { data: moods = [], isLoading: moodsLoading } = useMoods();
    const { data: decades = [], isLoading: decadesLoading } = useDecades();
    const { data: activities = [], isLoading: activitiesLoading } = useActivities();
    const { data: newAdditions = [], isLoading: newLoading } = useNewAdditions();
    const { data: recommendations = [], isLoading: recsLoading } = useRecommendations(20);
    const refreshRecommendations = useRefreshRecommendations();

    const loading = moodsLoading || decadesLoading || activitiesLoading || newLoading || recsLoading;

    const handlePlayRecommendation = (rec: Recommendation, index: number) => {
        const tracks = recommendations.map((r: Recommendation) => r.track);
        play(rec.track, tracks, index);
    };

    const formatDuration = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes} min`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-12 w-full">
            {recommendations.length > 0 && (
                <section className="relative">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 ring-1 ring-pink-500/30">
                                <Heart className="w-6 h-6 text-pink-500" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">For You</h1>
                                <p className="text-white/50 text-sm">Personalized recommendations based on your listening</p>
                            </div>
                        </div>
                        <button
                            onClick={refreshRecommendations}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/5 hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/20 text-white transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                        {recommendations.slice(0, 10).map((rec: Recommendation, i: number) => (
                            <motion.div
                                key={rec.track.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => handlePlayRecommendation(rec, i)}
                                className={`group cursor-pointer p-4 rounded-2xl transition-colors duration-300 ring-1 ring-transparent hover:ring-white/20 ${i === 0 ? 'bg-gradient-to-br from-pink-500/10 to-purple-500/10 ring-pink-500/20' : 'hover:bg-white/5'}`}
                            >
                                <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 mb-4 shadow-lg ring-1 ring-white/5">
                                    {rec.track.artwork_path ? (
                                        <img
                                            src={getArtworkUrl(rec.track.id)}
                                            alt={rec.track.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-pink-900 to-purple-900" />
                                    )}

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl">
                                            <Play className="w-6 h-6 fill-black text-black ml-1" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold truncate text-white">{rec.track.title}</p>
                                    <p className="text-white/50 text-xs truncate uppercase tracking-wider">{rec.reason}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {newAdditions.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 ring-1 ring-emerald-500/30">
                            <Sparkles className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold">New in Your Library</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
                        {newAdditions.slice(0, 6).map((item: any, i: number) => (
                            <motion.div
                                key={`${item.album}-${i}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => navigate(`/album/${encodeURIComponent(item.album)}`)}
                                className="group cursor-pointer p-4 rounded-2xl hover:bg-white/5 transition-colors duration-300 ring-1 ring-transparent hover:ring-white/15"
                            >
                                <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 shadow-lg mb-4 ring-1 ring-white/5">
                                    {item.cover_track_id ? (
                                        <img
                                            src={getArtworkUrl(item.cover_track_id)}
                                            alt={item.album}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-pink-900 to-purple-900" />
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold truncate text-white">{item.album}</p>
                                    <div className="flex justify-between items-center text-xs text-white/50">
                                        <p className="truncate max-w-[70%]">{item.artist}</p>
                                        <span>{item.track_count} tracks</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}


            <div className="pt-4">
                <div className="flex items-center gap-4 mb-2">
                    <h2 className="text-lg font-semibold text-white/40 uppercase tracking-widest">Explore</h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                </div>
            </div>

            {moods.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 ring-1 ring-violet-500/30">
                            <Sparkles className="w-5 h-5 text-violet-400" />
                        </div>
                        <h2 className="text-2xl font-bold">Browse by Mood</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {moods.map((mood: any, i: number) => {
                            const Icon = MOOD_ICONS[mood.name] || Coffee;
                            const colors = MOOD_COLORS[mood.name] || { from: '#6b7280', to: '#4b5563' };
                            return (
                                <motion.div
                                    key={mood.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => navigate(`/mood/${encodeURIComponent(mood.name)}`)}
                                    className="group cursor-pointer relative aspect-[2/1] rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-white/25 transition-all duration-300"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`
                                    }}
                                >
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
                                    <div className="absolute inset-0 flex items-center justify-between p-5">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl font-bold text-white truncate">{mood.name}</h3>
                                            <p className="text-white/80 text-sm">{mood.track_count} tracks</p>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>
            )}

            {activities.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/30">
                            <Dumbbell className="w-5 h-5 text-amber-400" />
                        </div>
                        <h2 className="text-2xl font-bold">Made for Your Activities</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {activities.map((activity: any, i: number) => {
                            const Icon = ACTIVITY_ICONS[activity.name] || Dumbbell;
                            return (
                                <motion.div
                                    key={activity.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => navigate(`/activity/${encodeURIComponent(activity.name)}`)}
                                    className="group cursor-pointer relative aspect-[2/1] rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-white/25 transition-all duration-300"
                                    style={{
                                        background: `linear-gradient(135deg, ${activity.colors?.from || '#f59e0b'}, ${activity.colors?.to || '#d97706'})`
                                    }}
                                >
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
                                    <div className="absolute inset-0 flex items-center justify-between p-5">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl font-bold text-white truncate">{activity.name}</h3>
                                            <p className="text-white/80 text-sm">
                                                {activity.track_count} tracks · {formatDuration(activity.total_duration_ms)}
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>
            )}

            {decades.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 ring-1 ring-rose-500/30">
                            <Clock className="w-5 h-5 text-rose-400" />
                        </div>
                        <h2 className="text-2xl font-bold">Time Machine</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
                        {decades.map((decade: any, i: number) => (
                            <motion.div
                                key={decade.decade}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => navigate(`/decade/${encodeURIComponent(decade.decade)}`)}
                                className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group ring-1 ring-white/10 hover:ring-white/25 transition-colors duration-300"
                                style={{
                                    background: `linear-gradient(135deg, ${decade.colors.from}, ${decade.colors.to})`
                                }}
                            >
                                {decade.cover_track_id && (
                                    <div
                                        className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-30 transition-opacity duration-300 mix-blend-overlay"
                                        style={{ backgroundImage: `url(${getArtworkUrl(decade.cover_track_id)})` }}
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                    <span className="text-4xl font-black text-white drop-shadow-xl tracking-tighter">
                                        {decade.decade.replace('s', "'s")}
                                    </span>
                                    <span className="text-sm text-white/90 mt-2 font-medium px-3 py-1 bg-white/15 rounded-full backdrop-blur-sm ring-1 ring-white/10">
                                        {decade.track_count} tracks
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
