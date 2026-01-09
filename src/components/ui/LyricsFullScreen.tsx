import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic2, Loader2, Music2, ChevronDown } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useUIStore } from '../../stores/uiStore';
import { useLyrics } from '../../hooks/useLyrics';
import { getArtworkUrl } from '../../api/client';

export function LyricsFullScreen() {
    const { isLyricsOpen, closeLyrics } = useUIStore();
    const { currentTrack } = usePlayerStore();
    const { parsedLyrics, currentLineIndex, isLoading, error, lyrics } = useLyrics();
    const containerRef = useRef<HTMLDivElement>(null);
    const activeLineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeLineRef.current && containerRef.current) {
            activeLineRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, [currentLineIndex]);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <AnimatePresence>
            {isLyricsOpen && (
                <motion.div
                    initial={isMobile ? { y: '100%' } : { opacity: 0 }}
                    animate={isMobile ? { y: 0 } : { opacity: 1 }}
                    exit={isMobile ? { y: '100%' } : { opacity: 0 }}
                    transition={isMobile ? { type: 'spring', damping: 25, stiffness: 200 } : { duration: 0.3 }}
                    className="fixed inset-0 z-[250] bg-black"
                >
                    {currentTrack?.artwork_path && (
                        <div
                            className="absolute inset-0 opacity-30"
                            style={{
                                backgroundImage: `url(${getArtworkUrl(currentTrack.id)})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                filter: 'blur(100px) saturate(1.5)',
                            }}
                        />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

                    {/* Header with track info and close button */}
                    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-6">
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                            {currentTrack?.artwork_path && (
                                <img
                                    src={getArtworkUrl(currentTrack.id)}
                                    alt=""
                                    className="w-12 h-12 rounded-lg shadow-2xl flex-shrink-0"
                                />
                            )}
                            <div className="min-w-0">
                                <h2 className="text-base font-bold text-white truncate">{currentTrack?.title}</h2>
                                <p className="text-sm text-white/60 truncate">{currentTrack?.artist}</p>
                            </div>
                        </div>
                        <button
                            onClick={closeLyrics}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
                        >
                            <ChevronDown className="w-6 h-6 text-white" />
                        </button>
                    </div>

                    <div
                        ref={containerRef}
                        className="relative h-full flex flex-col items-center justify-start overflow-y-auto pt-32 pb-40"
                    >
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
                                <p className="text-white/50 mt-4">Finding lyrics...</p>
                            </div>
                        ) : error || !lyrics?.found ? (
                            <div className="flex flex-col items-center justify-center h-full text-white/40">
                                <Mic2 className="w-16 h-16 mb-4" />
                                <p className="text-xl">{error || 'No lyrics found'}</p>
                            </div>
                        ) : !currentTrack ? (
                            <div className="flex flex-col items-center justify-center h-full text-white/40">
                                <Music2 className="w-16 h-16 mb-4" />
                                <p className="text-xl">No track playing</p>
                            </div>
                        ) : parsedLyrics ? (
                            <div className="w-full max-w-4xl px-8 space-y-6">
                                {parsedLyrics.map((line, index) => {
                                    const isActive = index === currentLineIndex;
                                    const isPast = index < currentLineIndex;

                                    return (
                                        <div
                                            key={index}
                                            ref={isActive ? activeLineRef : null}
                                            className={`text-center transition-all duration-300 ${
                                                isActive
                                                    ? 'text-4xl font-bold text-white scale-105'
                                                    : isPast
                                                    ? 'text-2xl text-white/30'
                                                    : 'text-2xl text-white/50'
                                            }`}
                                        >
                                            {line.text}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : lyrics?.plainLyrics ? (
                            <div className="max-w-2xl px-8 text-center text-white/80 text-xl leading-relaxed whitespace-pre-wrap">
                                {lyrics.plainLyrics}
                            </div>
                        ) : null}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
