import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Disc } from 'lucide-react';
import { useLibraryStore } from '../stores/libraryStore';
import { ImageCard } from '../components/ui/Card3D';
import { getArtworkUrl } from '../api/client';

export function SavedAlbums() {
    const navigate = useNavigate();
    const { savedAlbums, tracks } = useLibraryStore();

    const getAlbumArtwork = (albumName: string) => {
        const albumTrack = tracks.find(t => t.album === albumName && t.artwork_path);
        return albumTrack ? getArtworkUrl(albumTrack.id) : '';
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-8 pb-4 flex items-end gap-6 bg-gradient-to-b from-pink-800/50 to-transparent">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-52 h-52 shadow-2xl rounded-xl bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 flex items-center justify-center"
                >
                    <Bookmark className="w-24 h-24 text-white fill-current" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-2 mb-2"
                >
                    <span className="text-sm font-bold uppercase tracking-widest text-white/80">Collection</span>
                    <h1 className="text-7xl font-bold text-white tracking-tight">Saved Albums</h1>
                    <div className="flex items-center gap-2 text-white/70 text-sm font-medium mt-2">
                        <span className="text-white">You</span>
                        <span>-</span>
                        <span>{savedAlbums.length} albums</span>
                    </div>
                </motion.div>
            </div>

            <div className="flex-1 overflow-auto px-8 pb-8 pt-4">
                {savedAlbums.length === 0 ? (
                    <div className="text-center py-20">
                        <Disc className="w-20 h-20 text-white/20 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-white mb-2">No saved albums yet</h2>
                        <p className="text-white/50">Save albums to see them here</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {savedAlbums.map((album, i) => (
                            <motion.div
                                key={`${album.name}-${album.artist}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.03, 0.5) }}
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
                    </div>
                )}
            </div>
        </div>
    );
}
