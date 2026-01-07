import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../stores/libraryStore';
import { ImageCard } from '../components/ui/Card3D';
import { getArtworkUrl } from '../api/client';
import { Disc } from 'lucide-react';

export function Albums() {
    const navigate = useNavigate();
    const { albums, tracks } = useLibraryStore();

    const getAlbumArtwork = (albumName: string) => {
        const albumTrack = tracks.find(t => t.album === albumName && t.artwork_path);
        return albumTrack ? getArtworkUrl(albumTrack.id) : '';
    };

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-4xl font-bold mb-6">Albums</h1>
            
            {albums.length === 0 ? (
                <div className="text-center py-20">
                    <Disc className="w-20 h-20 text-white/20 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-2">No albums yet</h2>
                    <p className="text-white/50">Add music to your library to see albums here</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {albums.map((album, i) => (
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
    );
}
