import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Shuffle, User, Disc } from 'lucide-react';
import { artistsApi, type ArtistDetail as ArtistDetailType } from '../api/artists';
import { usePlayerStore } from '../stores/playerStore';
import { TrackList } from '../components/ui/TrackList';
import { getArtworkUrl } from '../api/client';

export function ArtistDetail() {
    const { artistName } = useParams<{ artistName: string }>();
    const navigate = useNavigate();
    const [artist, setArtist] = useState<ArtistDetailType | null>(null);
    const [loading, setLoading] = useState(true);

    const { play } = usePlayerStore();

    useEffect(() => {
        if (artistName) {
            loadArtist(decodeURIComponent(artistName));
        }
    }, [artistName]);

    const loadArtist = async (name: string) => {
        try {
            setLoading(true);
            const data = await artistsApi.get(name);
            setArtist(data);
        } catch (error) {
            console.error('Failed to load artist:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlayAll = () => {
        if (artist?.top_tracks && artist.top_tracks.length > 0) {
            play(artist.top_tracks[0], artist.top_tracks, 0);
        }
    };

    const handleShufflePlay = () => {
        if (artist?.top_tracks && artist.top_tracks.length > 0) {
            const shuffled = [...artist.top_tracks].sort(() => Math.random() - 0.5);
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

    if (!artist) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <User className="w-20 h-20 text-white/20 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Artist not found</h2>
                <button 
                    onClick={() => navigate('/artists')}
                    className="text-pink-500 hover:underline"
                >
                    Go to Artists
                </button>
            </div>
        );
    }

    const artworkUrl = artist.top_tracks?.[0]?.id ? getArtworkUrl(artist.top_tracks[0].id) : null;

    return (
        <div className="flex flex-col">
            <div className="relative h-80 bg-gradient-to-b from-zinc-700 to-transparent overflow-hidden">
                {artworkUrl && (
                    <div 
                        className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-110"
                        style={{ backgroundImage: `url(${artworkUrl})` }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                
                <div className="absolute bottom-8 left-8 flex items-end gap-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-48 h-48 shadow-2xl rounded-full overflow-hidden bg-zinc-800 flex-shrink-0"
                    >
                        {artworkUrl ? (
                            <img 
                                src={artworkUrl}
                                alt={artist.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                                <User className="w-20 h-20 text-white/20" />
                            </div>
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col gap-2 mb-4"
                    >
                        <span className="text-sm font-bold uppercase tracking-widest text-white/80">Artist</span>
                        <h1 className="text-6xl font-bold text-white tracking-tight">{artist.name}</h1>
                        <div className="flex items-center gap-2 text-white/70 text-sm font-medium mt-2">
                            <span>{artist.track_count} songs</span>
                            <span>•</span>
                            <span>{artist.album_count} albums</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="px-8 py-6 flex items-center gap-4">
                <button 
                    onClick={handlePlayAll}
                    disabled={!artist.top_tracks || artist.top_tracks.length === 0}
                    className="w-14 h-14 rounded-full bg-pink-500 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-pink-500/20 disabled:opacity-50"
                >
                    <Play className="w-6 h-6 fill-current ml-1" />
                </button>
                <button 
                    onClick={handleShufflePlay}
                    disabled={!artist.top_tracks || artist.top_tracks.length === 0}
                    className="w-12 h-12 rounded-full border border-white/20 text-white flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                    <Shuffle className="w-5 h-5" />
                </button>
            </div>

            <div className="px-8 pb-8 space-y-10">
                {artist.top_tracks && artist.top_tracks.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold mb-6">Popular</h2>
                        <TrackList 
                            tracks={artist.top_tracks}
                            onPlay={(track, index) => play(track, artist.top_tracks, index)}
                        />
                    </section>
                )}

                {artist.albums && artist.albums.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold mb-6">Discography</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {artist.albums.map((album: any) => {
                                const albumArtwork = album.tracks?.[0]?.id 
                                    ? getArtworkUrl(album.tracks[0].id) 
                                    : null;
                                
                                return (
                                    <div 
                                        key={album.name}
                                        onClick={() => navigate(`/album/${encodeURIComponent(album.name)}`)}
                                        className="group cursor-pointer"
                                    >
                                        <div className="aspect-square rounded-xl overflow-hidden bg-zinc-800 mb-3 relative">
                                            {albumArtwork ? (
                                                <img 
                                                    src={albumArtwork}
                                                    alt={album.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                                                    <Disc className="w-12 h-12 text-white/20" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                        </div>
                                        <h3 className="font-medium text-white truncate">{album.name}</h3>
                                        <p className="text-white/50 text-sm">
                                            {album.year || 'Unknown Year'} • {album.tracks?.length || 0} tracks
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
