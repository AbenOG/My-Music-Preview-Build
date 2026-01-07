import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Search, Music2, Trash2, Edit2 } from 'lucide-react';
import { playlistsApi } from '../api/playlists';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { TrackList } from '../components/ui/TrackList';
import type { Playlist as PlaylistType } from '../types';

export function Playlist() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [playlist, setPlaylist] = useState<PlaylistType | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const { play } = usePlayerStore();
    const { deletePlaylist, fetchPlaylists } = useLibraryStore();

    useEffect(() => {
        if (id) {
            loadPlaylist(parseInt(id));
        }
    }, [id]);

    const loadPlaylist = async (playlistId: number) => {
        try {
            setLoading(true);
            const data = await playlistsApi.get(playlistId);
            setPlaylist(data);
        } catch (error) {
            console.error('Failed to load playlist:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlayAll = () => {
        if (playlist?.tracks && playlist.tracks.length > 0) {
            play(playlist.tracks[0], playlist.tracks, 0);
        }
    };

    const handleDelete = async () => {
        if (!playlist) return;
        if (confirm(`Delete playlist "${playlist.name}"?`)) {
            await deletePlaylist(playlist.id);
            await fetchPlaylists();
            navigate('/library');
        }
    };

    const handleRename = async () => {
        if (!playlist) return;
        const newName = prompt('Enter new name:', playlist.name);
        if (newName && newName !== playlist.name) {
            await playlistsApi.update(playlist.id, { name: newName });
            loadPlaylist(playlist.id);
            fetchPlaylists();
        }
    };

    const filteredTracks = playlist?.tracks?.filter(track => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return track.title.toLowerCase().includes(query) ||
               (track.artist?.toLowerCase().includes(query)) ||
               (track.album?.toLowerCase().includes(query));
    }) || [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Music2 className="w-20 h-20 text-white/20 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Playlist not found</h2>
                <button 
                    onClick={() => navigate('/library')}
                    className="text-pink-500 hover:underline"
                >
                    Go to Library
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-8 pb-4 flex items-end gap-6 bg-gradient-to-b from-zinc-800 to-transparent">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-52 h-52 shadow-2xl rounded-xl bg-zinc-700 flex items-center justify-center relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-600 opacity-80" />
                    <Music2 className="w-20 h-20 text-white relative z-10" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-2 mb-2 flex-1"
                >
                    <span className="text-sm font-bold uppercase tracking-widest text-white/80">Playlist</span>
                    <h1 className="text-7xl font-bold text-white tracking-tight">{playlist.name}</h1>
                    {playlist.description && (
                        <p className="text-white/60 text-sm mt-2 max-w-xl">{playlist.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-white/70 text-sm font-medium mt-1">
                        <span>{playlist.track_count} tracks</span>
                        <span>•</span>
                        <span>
                            {playlist.total_duration_ms 
                                ? `${Math.floor(playlist.total_duration_ms / 60000)} min`
                                : '0 min'
                            }
                        </span>
                    </div>
                </motion.div>
            </div>

            <div className="px-8 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md bg-black/20">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handlePlayAll}
                        disabled={!playlist.tracks || playlist.tracks.length === 0}
                        className="w-14 h-14 rounded-full bg-emerald-500 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50"
                    >
                        <Play className="w-6 h-6 fill-current ml-1" />
                    </button>
                    <button 
                        onClick={handleRename}
                        className="w-10 h-10 rounded-full border border-white/20 text-white flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={handleDelete}
                        className="w-10 h-10 rounded-full text-white/60 flex items-center justify-center hover:text-red-500 transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search in playlist"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white/10 border border-white/5 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:bg-white/15 transition-colors w-64 placeholder:text-white/30"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-visible px-8 pb-8">
                {!playlist.tracks || playlist.tracks.length === 0 ? (
                    <div className="text-center py-20">
                        <Music2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">This playlist is empty</h2>
                        <p className="text-white/50">Add songs to get started</p>
                    </div>
                ) : filteredTracks.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-white/50">No songs match "{searchQuery}"</p>
                    </div>
                ) : (
                    <TrackList 
                        tracks={filteredTracks}
                        onPlay={(track, index) => play(track, filteredTracks, index)}
                    />
                )}
            </div>
        </div>
    );
}
