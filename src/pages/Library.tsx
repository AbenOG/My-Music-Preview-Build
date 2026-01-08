import { motion } from 'framer-motion';
import { Plus, Music2, Clock, Play, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { ImageCard } from '../components/ui/Card3D';
import { CreatePlaylistModal } from '../components/ui/CreatePlaylistModal';
import { getArtworkUrl } from '../api/client';
import type { Track, RecentlyPlayedAlbum, RecentlyPlayedArtist, Playlist } from '../types';

function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatTimeAgo(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

interface SectionProps {
    title: string;
    children: React.ReactNode;
    onSeeAll?: () => void;
}

function Section({ title, children, onSeeAll }: SectionProps) {
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                {onSeeAll && (
                    <button
                        onClick={onSeeAll}
                        className="text-sm text-white/60 hover:text-white flex items-center gap-1 transition-colors"
                    >
                        See all <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>
            {children}
        </section>
    );
}

interface ContinueListeningCardProps {
    track: Track;
    onPlay: () => void;
}

function ContinueListeningCard({ track, onPlay }: ContinueListeningCardProps) {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
            onClick={onPlay}
        >
            <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                {track.artwork_path ? (
                    <img
                        src={getArtworkUrl(track.id)}
                        alt={track.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                        <Music2 className="w-6 h-6 text-white/30" />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white truncate">{track.title}</h3>
                <p className="text-sm text-white/50 truncate">{track.artist || 'Unknown Artist'}</p>
            </div>
            <span className="text-sm text-white/40">{formatDuration(track.duration_ms || 0)}</span>
        </motion.div>
    );
}

interface JumpBackInCardProps {
    type: 'album' | 'artist';
    name: string;
    subtitle: string;
    artworkPath: string | null;
    lastPlayed: string | null;
    onClick: () => void;
}

function JumpBackInCard({ type, name, subtitle, artworkPath, lastPlayed, onClick }: JumpBackInCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onClick}
            className="group cursor-pointer"
        >
            <div className={`aspect-square mb-3 overflow-hidden relative ${type === 'artist' ? 'rounded-full' : 'rounded-xl'}`}>
                {artworkPath ? (
                    <img
                        src={artworkPath}
                        alt={name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                        <Music2 className="w-10 h-10 text-white/20" />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center shadow-xl">
                        <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                    </div>
                </div>
            </div>
            <h3 className={`font-medium text-white truncate ${type === 'artist' ? 'text-center' : ''}`}>{name}</h3>
            <div className={`flex items-center gap-2 text-sm ${type === 'artist' ? 'justify-center' : ''}`}>
                <span className="text-white/50 truncate">{subtitle}</span>
                {lastPlayed && (
                    <>
                        <span className="text-white/30">·</span>
                        <span className="text-white/40 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(lastPlayed)}
                        </span>
                    </>
                )}
            </div>
        </motion.div>
    );
}

export function Library() {
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const {
        tracks,
        recentTracks,
        continueListening,
        recentlyPlayedAlbums,
        recentlyPlayedArtists,
        recentPlaylists,
        likedTracks,
        fetchActivityHub,
        fetchRecentTracks
    } = useLibraryStore();

    const { play, setQueue } = usePlayerStore();

    useEffect(() => {
        fetchActivityHub();
        fetchRecentTracks();
    }, []);

    const handlePlayTrack = (track: Track, index: number, trackList: Track[]) => {
        play(track, trackList, index);
    };

    const getArtworkUrlForAlbum = (album: RecentlyPlayedAlbum) => {
        if (album.artwork_path) return album.artwork_path;
        const albumTrack = tracks.find(t => t.album === album.name && t.artwork_path);
        return albumTrack ? getArtworkUrl(albumTrack.id) : null;
    };

    const getArtworkUrlForArtist = (artist: RecentlyPlayedArtist) => {
        if (artist.artwork_path) return artist.artwork_path;
        const artistTrack = tracks.find(t => t.artist === artist.name && t.artwork_path);
        return artistTrack ? getArtworkUrl(artistTrack.id) : null;
    };

    const hasActivity = continueListening.length > 0 ||
                        recentTracks.length > 0 ||
                        recentPlaylists.length > 0 ||
                        recentlyPlayedAlbums.length > 0;

    return (
        <div className="p-8 space-y-10">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-white">Your Library</h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white transition-colors"
                    title="Create Playlist"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {!hasActivity && tracks.length === 0 && (
                <div className="text-center py-16">
                    <Music2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/50 mb-4">Your library is empty. Add music folders in Settings.</p>
                    <button
                        onClick={() => navigate('/settings')}
                        className="px-6 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors"
                    >
                        Go to Settings
                    </button>
                </div>
            )}

            {continueListening.length > 0 && (
                <Section title="Continue Listening">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {continueListening.slice(0, 6).map((track, index) => (
                            <ContinueListeningCard
                                key={track.id}
                                track={track}
                                onPlay={() => handlePlayTrack(track, index, continueListening)}
                            />
                        ))}
                    </div>
                </Section>
            )}

            {recentTracks.length > 0 && (
                <Section title="Recently Added">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                        {recentTracks.slice(0, 6).map((track, index) => (
                            <motion.div
                                key={track.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handlePlayTrack(track, index, recentTracks)}
                                className="cursor-pointer"
                            >
                                <ImageCard
                                    title={track.title}
                                    subtitle={track.artist || 'Unknown Artist'}
                                    image={track.artwork_path ? getArtworkUrl(track.id) : ''}
                                />
                            </motion.div>
                        ))}
                    </div>
                </Section>
            )}

            {recentPlaylists.length > 0 && (
                <Section
                    title="Recent Playlists"
                    onSeeAll={() => {}}
                >
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => navigate('/liked')}
                            className="aspect-square rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-4 flex flex-col justify-end relative group cursor-pointer overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                            <h3 className="text-lg font-bold text-white">Liked Songs</h3>
                            <p className="text-white/80 text-sm">{likedTracks.length} songs</p>
                        </motion.div>

                        {recentPlaylists.slice(0, 5).map((playlist, i) => (
                            <motion.div
                                key={playlist.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + (i * 0.05) }}
                                onClick={() => navigate(`/playlist/${playlist.id}`)}
                                className="group cursor-pointer"
                            >
                                <div className="aspect-square bg-white/5 rounded-xl mb-3 flex items-center justify-center group-hover:bg-white/10 transition-colors relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-800" />
                                    <Music2 className="w-10 h-10 text-white/20 relative z-10" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Play className="w-8 h-8 text-white fill-white" />
                                    </div>
                                </div>
                                <h3 className="font-medium text-white truncate">{playlist.name}</h3>
                                <p className="text-white/50 text-sm">{playlist.track_count} tracks</p>
                            </motion.div>
                        ))}
                    </div>
                </Section>
            )}

            {(recentlyPlayedAlbums.length > 0 || recentlyPlayedArtists.length > 0) && (
                <Section title="Jump Back In">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                        {recentlyPlayedAlbums.slice(0, 4).map((album, i) => (
                            <JumpBackInCard
                                key={`album-${album.name}-${i}`}
                                type="album"
                                name={album.name}
                                subtitle={album.artist || 'Various Artists'}
                                artworkPath={getArtworkUrlForAlbum(album)}
                                lastPlayed={album.last_played}
                                onClick={() => navigate(`/album/${encodeURIComponent(album.name)}`)}
                            />
                        ))}
                        {recentlyPlayedArtists.slice(0, 2).map((artist, i) => (
                            <JumpBackInCard
                                key={`artist-${artist.name}-${i}`}
                                type="artist"
                                name={artist.name}
                                subtitle={`${artist.track_count} tracks`}
                                artworkPath={getArtworkUrlForArtist(artist)}
                                lastPlayed={artist.last_played}
                                onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
                            />
                        ))}
                    </div>
                </Section>
            )}

            <CreatePlaylistModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
