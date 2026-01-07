import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Shuffle } from 'lucide-react';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { TrackList } from '../components/ui/TrackList';
import { getArtworkUrl } from '../api/client';

export function Genre() {
    const { genreName } = useParams<{ genreName: string }>();
    const { tracks } = useLibraryStore();
    const { play } = usePlayerStore();

    const decodedGenre = decodeURIComponent(genreName || '');
    const genreTracks = tracks.filter(t => 
        t.genre?.toLowerCase().includes(decodedGenre.toLowerCase())
    );

    const heroTrack = genreTracks.find(t => t.artwork_path);
    const heroImage = heroTrack ? getArtworkUrl(heroTrack.id) : null;

    const handlePlayAll = () => {
        if (genreTracks.length > 0) {
            play(genreTracks[0], genreTracks, 0);
        }
    };

    const handleShuffle = () => {
        if (genreTracks.length > 0) {
            const shuffled = [...genreTracks].sort(() => Math.random() - 0.5);
            play(shuffled[0], shuffled, 0);
        }
    };

    return (
        <div>
            <div className="relative h-72 overflow-hidden">
                {heroImage && (
                    <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${heroImage})` }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black" />
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20" />
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-8 left-8 right-8"
                >
                    <p className="text-sm text-white/60 uppercase tracking-wider font-medium mb-2">Genre</p>
                    <h1 className="text-5xl font-bold mb-2">{decodedGenre}</h1>
                    <p className="text-white/60">{genreTracks.length} tracks</p>
                    
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handlePlayAll}
                            disabled={genreTracks.length === 0}
                            className="flex items-center gap-2 px-6 py-3 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 rounded-full font-medium transition-colors"
                        >
                            <Play className="w-5 h-5 fill-current" />
                            Play All
                        </button>
                        <button
                            onClick={handleShuffle}
                            disabled={genreTracks.length === 0}
                            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-full font-medium transition-colors"
                        >
                            <Shuffle className="w-5 h-5" />
                            Shuffle
                        </button>
                    </div>
                </motion.div>
            </div>
            
            <div className="p-8">
                {genreTracks.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-white/50">No tracks found in this genre</p>
                    </div>
                ) : (
                    <TrackList tracks={genreTracks} />
                )}
            </div>
        </div>
    );
}
