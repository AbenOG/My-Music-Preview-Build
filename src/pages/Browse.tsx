import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../stores/libraryStore';
import { cn } from '../lib/utils';
import { getArtworkUrl } from '../api/client';

const GENRE_COLORS: Record<string, string> = {
    'Pop': 'bg-pink-500',
    'Rock': 'bg-red-600',
    'Hip Hop': 'bg-orange-500',
    'Hip-Hop': 'bg-orange-500',
    'R&B': 'bg-purple-500',
    'Electronic': 'bg-blue-500',
    'Jazz': 'bg-yellow-600',
    'Classical': 'bg-indigo-500',
    'Indie': 'bg-emerald-500',
    'Country': 'bg-amber-600',
    'Metal': 'bg-zinc-700',
    'Folk': 'bg-green-600',
    'Blues': 'bg-blue-700',
    'Soul': 'bg-violet-600',
    'Reggae': 'bg-lime-600',
    'Punk': 'bg-rose-600',
    'Alternative': 'bg-cyan-600',
};

function getGenreColor(genre: string): string {
    for (const [key, color] of Object.entries(GENRE_COLORS)) {
        if (genre.toLowerCase().includes(key.toLowerCase())) {
            return color;
        }
    }
    const colors = ['bg-pink-500', 'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500'];
    const index = genre.charCodeAt(0) % colors.length;
    return colors[index];
}

export function Browse() {
    const navigate = useNavigate();
    const { stats, tracks } = useLibraryStore();

    const genres = stats?.genres || [];

    const getGenreArtwork = (genreName: string) => {
        const genreTracks = tracks.filter(t => 
            t.genre?.toLowerCase().includes(genreName.toLowerCase())
        );
        
        const tracksWithArtwork = genreTracks.filter(t => t.artwork_path);
        if (tracksWithArtwork.length > 0) {
            const randomTrack = tracksWithArtwork[Math.floor(Math.random() * tracksWithArtwork.length)];
            return getArtworkUrl(randomTrack.id);
        }
        return null;
    };

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-4xl font-bold mb-6">Browse by Genre</h1>
            
            {genres.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-white/50">No genres found. Add music to your library to see genres here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {genres.map((genre, i) => {
                        const artworkUrl = getGenreArtwork(genre.name);
                        return (
                            <motion.div
                                key={genre.name}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => navigate(`/genre/${encodeURIComponent(genre.name)}`)}
                                className="aspect-[1.5] rounded-xl relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-300 group"
                            >
                                {artworkUrl ? (
                                    <>
                                        <div 
                                            className="absolute inset-0 bg-cover bg-center"
                                            style={{ backgroundImage: `url(${artworkUrl})` }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/80" />
                                    </>
                                ) : (
                                    <div className={cn(
                                        "absolute inset-0",
                                        getGenreColor(genre.name)
                                    )}>
                                        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/30" />
                                    </div>
                                )}
                                <span className="absolute bottom-4 left-4 text-2xl font-bold text-white tracking-tight drop-shadow-lg">
                                    {genre.name}
                                </span>
                                <span className="absolute top-4 right-4 text-sm text-white/80 drop-shadow-md">
                                    {genre.count} tracks
                                </span>
                                <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
