import { motion } from 'framer-motion';
import { Play, Heart, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { TrackList } from '../components/ui/TrackList';

export function LikedSongs() {
    const [searchQuery, setSearchQuery] = useState('');
    const { likedTracks } = useLibraryStore();
    const { play } = usePlayerStore();

    const filteredTracks = useMemo(() => {
        if (!searchQuery.trim()) return likedTracks;
        const query = searchQuery.toLowerCase();
        return likedTracks.filter(track => 
            track.title.toLowerCase().includes(query) ||
            (track.artist?.toLowerCase().includes(query)) ||
            (track.album?.toLowerCase().includes(query))
        );
    }, [likedTracks, searchQuery]);

    const handlePlayAll = () => {
        if (filteredTracks.length > 0) {
            play(filteredTracks[0], filteredTracks, 0);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-8 pb-4 flex items-end gap-6 bg-gradient-to-b from-purple-800/50 to-transparent">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-52 h-52 shadow-2xl rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center"
                >
                    <Heart className="w-24 h-24 text-white fill-current" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-2 mb-2"
                >
                    <span className="text-sm font-bold uppercase tracking-widest text-white/80">Playlist</span>
                    <h1 className="text-7xl font-bold text-white tracking-tight">Liked Songs</h1>
                    <div className="flex items-center gap-2 text-white/70 text-sm font-medium mt-2">
                        <span className="text-white">You</span>
                        <span>•</span>
                        <span>{likedTracks.length} songs</span>
                    </div>
                </motion.div>
            </div>

            <div className="px-8 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md bg-black/20">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handlePlayAll}
                        disabled={likedTracks.length === 0}
                        className="w-14 h-14 rounded-full bg-pink-500 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-pink-500/20 disabled:opacity-50"
                    >
                        <Play className="w-6 h-6 fill-current ml-1" />
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Find in Liked Songs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white/10 border border-white/5 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:bg-white/15 transition-colors w-64 placeholder:text-white/30"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-visible px-8 pb-8">
                {likedTracks.length === 0 ? (
                    <div className="text-center py-20">
                        <Heart className="w-16 h-16 text-white/20 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">No liked songs yet</h2>
                        <p className="text-white/50">Start liking songs to see them here</p>
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
