import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Shuffle, Disc } from 'lucide-react';
import { albumsApi } from '../api/albums';
import { usePlayerStore } from '../stores/playerStore';
import { TrackList } from '../components/ui/TrackList';
import { getArtworkUrl } from '../api/client';
import type { Album } from '../types';

function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours} hr ${mins} min`;
    }
    return `${minutes} min`;
}

export function AlbumDetail() {
    const { albumName } = useParams<{ albumName: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [album, setAlbum] = useState<Album | null>(null);
    const [loading, setLoading] = useState(true);
    
    const highlightTrackId = searchParams.get('highlight');

    const { play } = usePlayerStore();

    useEffect(() => {
        if (albumName) {
            loadAlbum(decodeURIComponent(albumName));
        }
    }, [albumName]);

    const loadAlbum = async (name: string) => {
        try {
            setLoading(true);
            const data = await albumsApi.get(name);
            setAlbum(data);
        } catch (error) {
            console.error('Failed to load album:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlayAll = () => {
        if (album?.tracks && album.tracks.length > 0) {
            play(album.tracks[0], album.tracks, 0);
        }
    };

    const handleShufflePlay = () => {
        if (album?.tracks && album.tracks.length > 0) {
            const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
            play(shuffled[0], shuffled, 0);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!album) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Disc className="w-20 h-20 text-white/20 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Album not found</h2>
                <button 
                    onClick={() => navigate('/albums')}
                    className="text-pink-500 hover:underline"
                >
                    Go to Albums
                </button>
            </div>
        );
    }

    const artworkUrl = album.tracks?.[0]?.id ? getArtworkUrl(album.tracks[0].id) : null;

    return (
        <div className="flex flex-col">
            <div className="p-8 pb-4 flex items-end gap-8 bg-gradient-to-b from-zinc-800/80 to-transparent">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-56 h-56 shadow-2xl rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0"
                >
                    {artworkUrl ? (
                        <img 
                            src={artworkUrl}
                            alt={album.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                            <Disc className="w-20 h-20 text-white/20" />
                        </div>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-2 mb-2"
                >
                    <span className="text-sm font-bold uppercase tracking-widest text-white/80">Album</span>
                    <h1 className="text-6xl font-bold text-white tracking-tight">{album.name}</h1>
                    <div className="flex items-center gap-2 text-white/70 text-sm font-medium mt-2">
                        <span 
                            className="text-white hover:underline cursor-pointer"
                            onClick={() => navigate(`/artist/${encodeURIComponent(album.artist || '')}`)}
                        >
                            {album.artist || 'Unknown Artist'}
                        </span>
                        {album.year && (
                            <>
                                <span>•</span>
                                <span>{album.year}</span>
                            </>
                        )}
                        <span>•</span>
                        <span>{album.track_count} songs</span>
                        <span>•</span>
                        <span>{formatDuration(album.total_duration_ms)}</span>
                    </div>
                </motion.div>
            </div>

            <div className="px-8 py-4 flex items-center gap-4">
                <button 
                    onClick={handlePlayAll}
                    disabled={!album.tracks || album.tracks.length === 0}
                    className="w-14 h-14 rounded-full bg-pink-500 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-pink-500/20 disabled:opacity-50"
                >
                    <Play className="w-6 h-6 fill-current ml-1" />
                </button>
                <button 
                    onClick={handleShufflePlay}
                    disabled={!album.tracks || album.tracks.length === 0}
                    className="w-12 h-12 rounded-full border border-white/20 text-white flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                    <Shuffle className="w-5 h-5" />
                </button>
            </div>

            <div className="px-8 pb-8">
                {album.tracks && album.tracks.length > 0 ? (
                    <TrackList 
                        tracks={album.tracks}
                        showAlbum={false}
                        highlightTrackId={highlightTrackId ? parseInt(highlightTrackId) : undefined}
                        onPlay={(track, index) => play(track, album.tracks!, index)}
                    />
                ) : (
                    <div className="text-center py-20">
                        <p className="text-white/50">No tracks found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
