import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Music, Disc, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../../stores/libraryStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useUIStore } from '../../stores/uiStore';
import { getArtworkUrl } from '../../api/client';
import { cn } from '../../lib/utils';

interface SearchResult {
  type: 'track' | 'album' | 'artist';
  id: string;
  title: string;
  subtitle: string;
  image?: string;
  data: any;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const { tracks, albums, artists } = useLibraryStore();
  const { play } = usePlayerStore();
  const { isSearchOpen, closeSearch } = useUIStore();

  // Sync with uiStore's isSearchOpen (for mobile search button)
  useEffect(() => {
    if (isSearchOpen) {
      setIsOpen(true);
    }
  }, [isSearchOpen]);

  // Helper to close search and sync with store
  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    closeSearch();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const searchQuery = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    const matchingTracks = tracks
      .filter(track => 
        track.title.toLowerCase().includes(searchQuery) ||
        track.artist?.toLowerCase().includes(searchQuery) ||
        track.album?.toLowerCase().includes(searchQuery)
      )
      .slice(0, 5)
      .map(track => ({
        type: 'track' as const,
        id: `track-${track.id}`,
        title: track.title,
        subtitle: `${track.artist || 'Unknown Artist'} • ${track.album || 'Unknown Album'}`,
        image: track.artwork_path ? getArtworkUrl(track.id) : undefined,
        data: track,
      }));

    const matchingAlbums = albums
      .filter(album => 
        album.name.toLowerCase().includes(searchQuery) ||
        album.artist?.toLowerCase().includes(searchQuery)
      )
      .slice(0, 5)
      .map(album => {
        const albumTrack = tracks.find(t => t.album === album.name);
        return {
          type: 'album' as const,
          id: `album-${album.name}`,
          title: album.name,
          subtitle: `${album.artist || 'Unknown Artist'} • ${album.track_count} tracks`,
          image: album.artwork_path && albumTrack ? getArtworkUrl(albumTrack.id) : undefined,
          data: album,
        };
      });

    const matchingArtists = artists
      .filter(artist => artist.name.toLowerCase().includes(searchQuery))
      .slice(0, 5)
      .map(artist => {
        const artistTrack = tracks.find(t => t.artist === artist.name);
        return {
          type: 'artist' as const,
          id: `artist-${artist.name}`,
          title: artist.name,
          subtitle: `${artist.album_count} albums • ${artist.track_count} tracks`,
          image: artist.artwork_path && artistTrack ? getArtworkUrl(artistTrack.id) : undefined,
          data: artist,
        };
      });

    searchResults.push(...matchingTracks, ...matchingAlbums, ...matchingArtists);
    setResults(searchResults);
    setSelectedIndex(0);
  }, [query, tracks, albums, artists]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'track') {
      play(result.data, [result.data], 0);
    } else if (result.type === 'album') {
      navigate(`/album/${encodeURIComponent(result.data.name)}`);
    } else if (result.type === 'artist') {
      navigate(`/artist/${encodeURIComponent(result.data.name)}`);
    }

    handleClose();
  };

  const groupedResults = {
    tracks: results.filter(r => r.type === 'track'),
    albums: results.filter(r => r.type === 'album'),
    artists: results.filter(r => r.type === 'artist'),
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 min-w-[300px]"
      >
        <Search className="w-4 h-4 text-white/50" />
        <span className="text-sm text-white/50 flex-1 text-left">Search music...</span>
        <kbd className="hidden md:inline-flex px-2 py-1 text-xs font-semibold bg-white/10 rounded border border-white/10">
          ⌘K
        </kbd>
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
              />

              <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-0 md:pt-32 px-0 md:px-4">
                <motion.div
                  ref={containerRef}
                  initial={{ opacity: 0, scale: 0.95, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  className="w-full h-full md:h-auto md:max-w-2xl bg-black md:bg-black/95 md:backdrop-blur-xl md:rounded-xl border-none md:border md:border-white/10 shadow-2xl overflow-hidden flex flex-col"
                >
                <div className="flex items-center gap-3 px-4 py-4 md:py-3 border-b border-white/10 pt-safe-top md:pt-3">
                  <button
                    onClick={handleClose}
                    className="md:hidden p-2 -ml-2 text-white/50 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <Search className="w-5 h-5 text-white/50 hidden md:block" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search songs, albums, artists..."
                    className="flex-1 bg-transparent text-white text-lg md:text-base placeholder:text-white/40 outline-none h-10"
                  />
                  <button
                    onClick={handleClose}
                    className="p-1 hover:bg-white/10 rounded transition-colors hidden md:block"
                  >
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>

                {results.length > 0 ? (
                  <div className="flex-1 overflow-y-auto">
                    {groupedResults.tracks.length > 0 && (
                      <div className="px-4 py-3">
                        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                          Songs
                        </h3>
                        {groupedResults.tracks.map((result) => {
                          const globalIndex = results.indexOf(result);
                          return (
                            <div
                              key={result.id}
                              onClick={() => handleSelect(result)}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                globalIndex === selectedIndex ? "bg-white/10" : "hover:bg-white/5"
                              )}
                            >
                              <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {result.image ? (
                                  <img src={result.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Music className="w-4 h-4 text-white/30" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{result.title}</p>
                                <p className="text-xs text-white/50 truncate">{result.subtitle}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {groupedResults.albums.length > 0 && (
                      <div className="px-4 py-3">
                        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                          Albums
                        </h3>
                        {groupedResults.albums.map((result) => {
                          const globalIndex = results.indexOf(result);
                          return (
                            <div
                              key={result.id}
                              onClick={() => handleSelect(result)}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                globalIndex === selectedIndex ? "bg-white/10" : "hover:bg-white/5"
                              )}
                            >
                              <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {result.image ? (
                                  <img src={result.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Disc className="w-4 h-4 text-white/30" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{result.title}</p>
                                <p className="text-xs text-white/50 truncate">{result.subtitle}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {groupedResults.artists.length > 0 && (
                      <div className="px-4 py-3">
                        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                          Artists
                        </h3>
                        {groupedResults.artists.map((result) => {
                          const globalIndex = results.indexOf(result);
                          return (
                            <div
                              key={result.id}
                              onClick={() => handleSelect(result)}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                globalIndex === selectedIndex ? "bg-white/10" : "hover:bg-white/5"
                              )}
                            >
                              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {result.image ? (
                                  <img src={result.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-4 h-4 text-white/30" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{result.title}</p>
                                <p className="text-xs text-white/50 truncate">{result.subtitle}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : query.trim() ? (
                  <div className="px-4 py-12 text-center">
                    <p className="text-white/40 text-sm">No results found for "{query}"</p>
                  </div>
                ) : (
                  <div className="px-4 py-12 text-center">
                    <p className="text-white/40 text-sm">Start typing to search your library</p>
                  </div>
                )}
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
