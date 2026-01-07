import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../stores/libraryStore';
import { getArtworkUrl } from '../api/client';
import { User } from 'lucide-react';

export function Artists() {
    const navigate = useNavigate();
    const { artists, tracks } = useLibraryStore();

    const getArtistArtwork = (artistName: string) => {
        const artistTrack = tracks.find(t => t.artist === artistName && t.artwork_path);
        return artistTrack ? getArtworkUrl(artistTrack.id) : null;
    };

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-4xl font-bold mb-6">Artists</h1>
            
            {artists.length === 0 ? (
                <div className="text-center py-20">
                    <User className="w-20 h-20 text-white/20 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-2">No artists yet</h2>
                    <p className="text-white/50">Add music to your library to see artists here</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                    {artists.map((artist, i) => {
                        const artworkUrl = getArtistArtwork(artist.name);
                        
                        return (
                            <motion.div
                                key={artist.name}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                                onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
                                className="flex flex-col items-center group cursor-pointer"
                            >
                                <div className="w-40 h-40 rounded-full overflow-hidden shadow-lg mb-4 ring-2 ring-transparent group-hover:ring-pink-500 transition-all duration-300 bg-zinc-800">
                                    {artworkUrl ? (
                                        <img 
                                            src={artworkUrl} 
                                            alt={artist.name} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                                            <User className="w-16 h-16 text-white/20" />
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-white font-bold text-lg text-center truncate w-full">{artist.name}</h3>
                                <p className="text-white/40 text-sm">
                                    {artist.track_count} track{artist.track_count !== 1 ? 's' : ''} • {artist.album_count} album{artist.album_count !== 1 ? 's' : ''}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
