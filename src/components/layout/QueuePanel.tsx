import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Play, GripVertical, Trash2 } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePlayerStore } from '../../stores/playerStore';
import { useUIStore } from '../../stores/uiStore';
import { getArtworkUrl } from '../../api/client';

export function QueuePanel() {
    const closeQueue = useUIStore((state) => state.closeQueue);
    const { queue, queueIndex, currentTrack, play, removeFromQueue, clearQueue } = usePlayerStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: queue.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 64,
        overscan: 5,
    });

    // Scroll to current track on mount
    useEffect(() => {
        if (queueIndex >= 0 && scrollRef.current) {
            setTimeout(() => {
                virtualizer.scrollToIndex(queueIndex, { align: 'center', behavior: 'smooth' });
            }, 100);
        }
    }, []);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                closeQueue();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [closeQueue]);

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/20 z-30"
                onClick={closeQueue}
            />

            {/* Panel */}
            <motion.div
                ref={panelRef}
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-24 w-80 bg-black/60 backdrop-blur-xl border-l border-white/10 z-40 flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold">Queue</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => clearQueue()}
                            className="text-white/40 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title="Clear queue"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={closeQueue}
                            className="text-white/40 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Track count */}
                <div className="px-4 py-2 border-b border-white/5">
                    <p className="text-xs text-white/40">
                        {queue.length} tracks · Playing {queueIndex + 1} of {queue.length}
                    </p>
                </div>

                {/* Unified Queue List */}
                {queue.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm text-white/30">Queue is empty</p>
                    </div>
                ) : (
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto"
                    >
                        <div
                            style={{
                                height: `${virtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {virtualizer.getVirtualItems().map((virtualRow) => {
                                const track = queue[virtualRow.index];
                                const index = virtualRow.index;
                                const isCurrent = index === queueIndex;
                                const isPrevious = index < queueIndex;

                                return (
                                    <div
                                        key={`${track.id}-${index}`}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        <div
                                            className={`flex items-center gap-3 mx-2 p-2 rounded-lg group cursor-pointer transition-all duration-200 ${
                                                isCurrent
                                                    ? 'bg-white/10 ring-1 ring-pink-500/50'
                                                    : 'hover:bg-white/5'
                                            } ${isPrevious ? 'opacity-40 hover:opacity-70' : ''}`}
                                            onClick={() => play(track, queue, index)}
                                        >
                                            {/* Track number or grip */}
                                            <div className="w-6 flex-shrink-0 text-center">
                                                {isCurrent ? (
                                                    <div className="flex items-center justify-center gap-0.5">
                                                        <span className="w-0.5 h-3 bg-pink-500 rounded-full animate-pulse" />
                                                        <span className="w-0.5 h-4 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                                                        <span className="w-0.5 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-white/30 group-hover:hidden">{index + 1}</span>
                                                )}
                                                {!isCurrent && (
                                                    <GripVertical className="w-4 h-4 text-white/20 hidden group-hover:block mx-auto" />
                                                )}
                                            </div>

                                            {/* Artwork */}
                                            <div className={`rounded overflow-hidden flex-shrink-0 relative ${isCurrent ? 'w-12 h-12' : 'w-10 h-10'}`}>
                                                {track.artwork_path ? (
                                                    <img
                                                        src={getArtworkUrl(track.id)}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className={`w-full h-full bg-gradient-to-br ${isCurrent ? 'from-pink-500 to-purple-600' : 'from-zinc-700 to-zinc-800'}`} />
                                                )}
                                                {!isCurrent && (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Play className="w-4 h-4 text-white fill-current" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Track info */}
                                            <div className="min-w-0 flex-1">
                                                <p className={`truncate ${isCurrent ? 'text-sm font-medium text-pink-400' : 'text-sm text-white'}`}>
                                                    {track.title}
                                                </p>
                                                <p className="text-xs text-white/50 truncate">
                                                    {track.artist || 'Unknown Artist'}
                                                </p>
                                            </div>

                                            {/* Remove button (not for current) */}
                                            {!isCurrent && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFromQueue(index);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white p-1 flex-shrink-0 transition-opacity"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </motion.div>
        </>
    );
}
