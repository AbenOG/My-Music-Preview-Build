import { motion, AnimatePresence } from 'framer-motion';
import { Play, Music2, Shuffle, Clock, Heart, Mic2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ImageCard } from '../components/ui/Card3D';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { getArtworkUrl } from '../api/client';
import { statsApi } from '../api/stats';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Track } from '../types';

export function Home() {
    const navigate = useNavigate();
    const { albums, tracks, artists, likedTrackIds } = useLibraryStore();
    const { play } = usePlayerStore();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [continueListening, setContinueListening] = useState<Track[]>([]);

    useEffect(() => {
        // Only need 1, but fetching a few just in case
        statsApi.getContinueListening(5).then(setContinueListening).catch(console.error);
    }, []);

    const likedTracks = useMemo(() =>
        tracks.filter(t => likedTrackIds.has(t.id)),
        [tracks, likedTrackIds]
    );

    const topArtists = useMemo(() => {
        const artistCounts = new Map<string, { count: number; artwork?: string }>();
        tracks.forEach(t => {
            if (t.artist) {
                const existing = artistCounts.get(t.artist) || { count: 0 };
                artistCounts.set(t.artist, {
                    count: existing.count + 1,
                    artwork: existing.artwork || (t.artwork_path ? String(t.id) : undefined)
                });
            }
        });
        return Array.from(artistCounts.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 6);
    }, [tracks]);

    const displayAlbums = albums.slice(0, 12); // Show more albums since we have space now

    const carouselAlbums = useMemo(() => {
        if (albums.length === 0) return [];
        return [...albums].sort(() => Math.random() - 0.5).slice(0, 5);
    }, [albums.length > 0]);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const nextSlide = useCallback(() => {
        if (carouselAlbums.length > 0) {
            setCurrentSlide((prev) => (prev + 1) % carouselAlbums.length);
        }
    }, [carouselAlbums.length]);

    useEffect(() => {
        if (carouselAlbums.length > 1) {
            intervalRef.current = setInterval(nextSlide, 5000);
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [carouselAlbums.length, nextSlide]);

    const handlePlayAlbum = (albumName: string) => {
        const albumTracks = tracks.filter(t => t.album === albumName);
        if (albumTracks.length > 0) {
            play(albumTracks[0], albumTracks, 0);
        }
    };

    const handlePlayTrack = (track: any, allTracks: any[]) => {
        const index = allTracks.findIndex(t => t.id === track.id);
        play(track, allTracks, index);
    };

    return (
        <div className="p-8 space-y-12 w-full">
            {/* Hero Carousel */}
            {carouselAlbums.length > 0 ? (
                <div className="relative w-full h-[500px] rounded-3xl overflow-hidden shadow-2xl group ring-1 ring-white/10">
                    <AnimatePresence mode="wait">
                        {carouselAlbums.map((album, index) => {
                            if (index !== currentSlide) return null;
                            const albumTrack = tracks.find(t => t.album === album.name);
                            const bgImage = album.artwork_path && albumTrack ? getArtworkUrl(albumTrack.id) : '';

                            return (
                                <motion.div
                                    key={`carousel-${album.name}-${index}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.7 }}
                                    className="absolute inset-0"
                                >
                                    {bgImage && (
                                        <div
                                            className="absolute inset-0 bg-cover bg-center transition-transform duration-[10s] ease-linear scale-100"
                                            style={{
                                                backgroundImage: `url(${bgImage})`,
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
                                        </div>
                                    )}
                                    {!bgImage && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-pink-900 to-purple-900" />
                                    )}

                                    <div className="relative h-full flex items-center px-16 gap-16">
                                        <div className="flex-1 z-10 space-y-6">
                                            <motion.div
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.2 }}
                                            >
                                                <h1 className="text-7xl font-bold tracking-tight mb-2 text-white drop-shadow-xl line-clamp-2">
                                                    {album.name}
                                                </h1>
                                                <p className="text-2xl text-white/90 font-medium drop-shadow-md">
                                                    {album.artist || 'Unknown Artist'}
                                                </p>
                                            </motion.div>

                                            <motion.div
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.3 }}
                                                className="flex items-center gap-4 text-white/70"
                                            >
                                                <span className="px-3 py-1 bg-white/10 rounded-full text-sm font-medium backdrop-blur-md">
                                                    {album.track_count} tracks
                                                </span>
                                                <span className="px-3 py-1 bg-white/10 rounded-full text-sm font-medium backdrop-blur-md">
                                                    {album.year || 'Unknown Year'}
                                                </span>
                                            </motion.div>

                                            <motion.div
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.4 }}
                                                className="pt-4"
                                            >
                                                <button
                                                    onClick={() => handlePlayAlbum(album.name)}
                                                    className="px-10 py-4 bg-white text-black font-bold text-lg rounded-full hover:bg-gray-200 transition-colors shadow-xl flex items-center gap-3"
                                                >
                                                    <Play className="w-6 h-6 fill-current" /> Play Now
                                                </button>
                                            </motion.div>
                                        </div>

                                        {bgImage && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.3, duration: 0.5 }}
                                                className="hidden lg:block relative"
                                            >
                                                <div className="w-[350px] h-[350px] rounded-lg shadow-2xl overflow-hidden ring-1 ring-white/10 relative z-10">
                                                    <img
                                                        src={bgImage}
                                                        alt={album.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                {/* Reflection/Glow behind */}
                                                <div
                                                    className="absolute inset-0 blur-3xl opacity-40 -z-10"
                                                    style={{
                                                        backgroundImage: `url(${bgImage})`,
                                                        backgroundSize: 'cover'
                                                    }}
                                                />
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
                        {carouselAlbums.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${index === currentSlide ? 'bg-white w-8' : 'bg-white/30 w-1.5 hover:bg-white/60'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            ) : artists.length > 0 && (
                <div className="relative w-full h-[400px] rounded-3xl overflow-hidden shadow-2xl group bg-gradient-to-r from-pink-800 to-purple-900 border border-white/10">
                    <div className="absolute inset-0 z-10 flex flex-col justify-center px-12 text-white w-[60%]">
                        <h1 className="text-6xl font-bold tracking-tight mb-4 drop-shadow-md">
                            {tracks.length > 0 ? 'Your Music Library' : 'Welcome to Music'}
                        </h1>
                        <p className="text-lg opacity-90 leading-relaxed max-w-lg drop-shadow-sm font-light text-white/80">
                            {tracks.length > 0
                                ? `${tracks.length} tracks • ${albums.length} albums • ${artists.length} artists`
                                : 'Add your music folders in Settings to get started'
                            }
                        </p>
                        <div className="mt-8 flex gap-4">
                            {tracks.length > 0 ? (
                                <button
                                    onClick={() => {
                                        const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                                        play(shuffled[0], shuffled, 0);
                                    }}
                                    className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors shadow-lg flex items-center gap-2"
                                >
                                    <Play className="w-4 h-4 fill-current" /> Shuffle Play
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors shadow-lg"
                                >
                                    Add Music Folder
                                </button>
                            )}
                        </div>
                    </div>
                    {artists[0]?.artwork_path && (
                        <div
                            className="absolute bottom-0 right-0 w-[55%] h-[110%] bg-contain bg-no-repeat bg-bottom opacity-60 mix-blend-overlay"
                            style={{
                                backgroundImage: `url(${getArtworkUrl(tracks.find(t => t.artist === artists[0]?.name)?.id || 0)})`,
                                maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
                            }}
                        />
                    )}
                </div>
            )}

            {tracks.length === 0 && (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/5">
                    <Music2 className="w-20 h-20 text-white/20 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-2">No music yet</h2>
                    <p className="text-white/50 mb-6">Add your music folders in Settings to start listening</p>
                    <button
                        onClick={() => navigate('/settings')}
                        className="px-6 py-3 bg-pink-600 text-white font-semibold rounded-full hover:bg-pink-500 transition-colors"
                    >
                        Go to Settings
                    </button>
                </div>
            )}

            {tracks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Quick Access Cards */}
                    <div
                        onClick={() => {
                            const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                            play(shuffled[0], shuffled, 0);
                        }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-pink-900/50 to-rose-900/50 border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center mb-4 group-hover:bg-pink-500/30 transition-colors">
                            <Shuffle className="w-6 h-6 text-pink-400 group-hover:text-pink-300" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">Shuffle All</h3>
                        <p className="text-white/50 text-sm">Rediscover your library</p>
                    </div>

                    <div
                        onClick={() => {
                            if (likedTracks.length > 0) {
                                const shuffled = [...likedTracks].sort(() => Math.random() - 0.5);
                                play(shuffled[0], shuffled, 0);
                            } else {
                                navigate('/liked');
                            }
                        }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-amber-900/50 to-orange-900/50 border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 group-hover:bg-amber-500/30 transition-colors">
                            <Heart className="w-6 h-6 text-amber-400 group-hover:text-amber-300" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">Favorites Mix</h3>
                        <p className="text-white/50 text-sm">{likedTracks.length} liked songs</p>
                    </div>

                    {/* Single Continue Listening Card occupying 2 slots if possible, or just next in grid */}
                    {continueListening.length > 0 && (
                        <div
                            onClick={() => handlePlayTrack(continueListening[0], continueListening)}
                            className="col-span-1 md:col-span-2 relative overflow-hidden rounded-2xl border border-white/10 cursor-pointer group"
                        >
                            {/* Background Image with Blur */}
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-all duration-700 group-hover:opacity-60"
                                style={{
                                    backgroundImage: continueListening[0].artwork_path
                                        ? `url(${getArtworkUrl(continueListening[0].id)})`
                                        : undefined,
                                }}
                            >
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
                            </div>

                            <div className="relative z-10 p-6 flex items-center gap-6 h-full">
                                <div className="w-20 h-20 rounded-lg shadow-lg overflow-hidden flex-shrink-0 ring-1 ring-white/10 group-hover:ring-white/30 transition-all">
                                    {continueListening[0].artwork_path ? (
                                        <img
                                            src={getArtworkUrl(continueListening[0].id)}
                                            alt={continueListening[0].title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                            <Music2 className="w-8 h-8 text-white/20" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-4 h-4 text-pink-400" />
                                        <span className="text-pink-400 text-xs font-bold uppercase tracking-wider">Continue Listening</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white truncate pr-4">{continueListening[0].title}</h3>
                                    <p className="text-white/70 text-sm truncate">{continueListening[0].artist || 'Unknown Artist'}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shadow-xl">
                                    <Play className="w-5 h-5 fill-current ml-1" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Top Artists - Horizontal Scroll but cleaner */}
            {topArtists.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">Top Artists</h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
                        {topArtists.map(([artistName, data]) => (
                            <div
                                key={artistName}
                                onClick={() => navigate(`/artist/${encodeURIComponent(artistName)}`)}
                                className="group cursor-pointer p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                            >
                                <div className="aspect-square rounded-full overflow-hidden mb-4 bg-zinc-800 shadow-lg ring-2 ring-transparent group-hover:ring-pink-500/50 transition-all">
                                    {data.artwork ? (
                                        <img
                                            src={getArtworkUrl(parseInt(data.artwork))}
                                            alt={artistName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                                            <Mic2 className="w-8 h-8 text-white/20" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-white font-semibold text-center truncate">{artistName}</p>
                                <p className="text-white/40 text-xs text-center">{data.count} tracks</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Albums - Grid */}
            {displayAlbums.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">Your Albums</h2>
                        <button
                            onClick={() => navigate('/albums')}
                            className="text-sm font-medium text-white/50 hover:text-white transition-colors px-4 py-2 hover:bg-white/5 rounded-full"
                        >
                            View All
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {displayAlbums.map((album, i) => (
                            <div
                                key={`albums-${i}-${album.name}`}
                                onClick={() => navigate(`/album/${encodeURIComponent(album.name)}`)}
                                className="cursor-pointer group"
                            >
                                <ImageCard
                                    title={album.name}
                                    subtitle={album.artist || 'Unknown Artist'}
                                    image={album.artwork_path ? getArtworkUrl(tracks.find(t => t.album === album.name)?.id || 0) : ''}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

