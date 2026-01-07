import { motion } from 'framer-motion';
import { Plus, Grid, Music2, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { ImageCard } from '../components/ui/Card3D';
import { CreatePlaylistModal } from '../components/ui/CreatePlaylistModal';
import { getArtworkUrl } from '../api/client';

type FilterType = 'all' | 'playlists' | 'albums' | 'artists';

export function Library() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<FilterType>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const { albums, playlists, likedTracks, artists, tracks } = useLibraryStore();

    const getAlbumArtwork = (albumName: string) => {
        const albumTrack = tracks.find(t => t.album === albumName && t.artwork_path);
        return albumTrack ? getArtworkUrl(albumTrack.id) : '';
    };

    const filters: { key: FilterType; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'playlists', label: 'Playlists' },
        { key: 'albums', label: 'Albums' },
        { key: 'artists', label: 'Artists' },
    ];

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-white">Your Library</h1>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white transition-colors"
                    >
                        {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            <div className="flex gap-3">
                {filters.map(f => (
                    <button 
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                            filter === f.key 
                                ? 'bg-white text-black border-white' 
                                : 'bg-white/5 hover:bg-white/10 text-white border-white/5'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {(filter === 'all' || filter === 'playlists') && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate('/liked')}
                        className="aspect-square rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 flex flex-col justify-end relative group cursor-pointer overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                        <h3 className="text-2xl font-bold text-white mb-2">Liked Songs</h3>
                        <p className="text-white/80 font-medium">{likedTracks.length} songs</p>
                        <div className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider opacity-60">Auto Playlist</div>
                    </motion.div>
                )}

                {(filter === 'all' || filter === 'playlists') && playlists.map((playlist, i) => (
                    <motion.div
                        key={playlist.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + (i * 0.05) }}
                        onClick={() => navigate(`/playlist/${playlist.id}`)}
                        className="group cursor-pointer"
                    >
                        <div className="aspect-square bg-white/5 rounded-xl mb-3 flex items-center justify-center group-hover:bg-white/10 transition-colors relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Music2 className="w-12 h-12 text-white/20" />
                        </div>
                        <h3 className="font-medium text-white truncate">{playlist.name}</h3>
                        <p className="text-white/50 text-sm truncate">{playlist.track_count} tracks</p>
                    </motion.div>
                ))}

                {(filter === 'all' || filter === 'albums') && albums.slice(0, filter === 'all' ? 6 : undefined).map((album, i) => (
                    <motion.div
                        key={`${album.name}-${i}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + (i * 0.05) }}
                        onClick={() => navigate(`/album/${encodeURIComponent(album.name)}`)}
                        className="cursor-pointer"
                    >
                        <ImageCard
                            title={album.name}
                            subtitle={album.artist || 'Unknown Artist'}
                            image={getAlbumArtwork(album.name)}
                        />
                    </motion.div>
                ))}

                {(filter === 'artists') && artists.map((artist, i) => {
                    const artworkUrl = tracks.find(t => t.artist === artist.name && t.artwork_path);
                    return (
                        <motion.div
                            key={artist.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + (i * 0.05) }}
                            onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
                            className="group cursor-pointer flex flex-col items-center"
                        >
                            <div className="w-full aspect-square rounded-full bg-zinc-800 mb-3 overflow-hidden">
                                {artworkUrl ? (
                                    <img 
                                        src={getArtworkUrl(artworkUrl.id)}
                                        alt={artist.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800" />
                                )}
                            </div>
                            <h3 className="font-medium text-white truncate text-center w-full">{artist.name}</h3>
                            <p className="text-white/50 text-sm">Artist</p>
                        </motion.div>
                    );
                })}
            </div>

            {tracks.length === 0 && (
                <div className="text-center py-12">
                    <Music2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/50">Your library is empty. Add music folders in Settings.</p>
                    <button 
                        onClick={() => navigate('/settings')}
                        className="mt-4 px-6 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors"
                    >
                        Go to Settings
                    </button>
                </div>
            )}
            
            <CreatePlaylistModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
            />
        </div>
    );
}
