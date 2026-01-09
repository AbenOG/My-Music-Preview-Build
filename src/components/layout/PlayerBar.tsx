import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1, Mic2, ListMusic, Heart, Loader2, Radio, ChevronDown } from 'lucide-react';
import { motion, type PanInfo, useAnimation } from 'framer-motion';
import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUIStore } from '../../stores/uiStore';
import { getArtworkUrl } from '../../api/client';
import { cn } from '../../lib/utils';
import { vibrate, HapticPatterns } from '../../lib/haptics';

function formatTime(seconds: number): string {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PlayerBar() {
    const navigate = useNavigate();
    const {
        currentTrack,
        currentRadioStation,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        volume,
        isMuted,
        shuffleEnabled,
        repeatMode,
        isRadioMode,
        togglePlay,
        next,
        previous,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeat,
        stopRadio,
        isPlayerExpanded,
        togglePlayerExpanded
    } = usePlayerStore();

    const { toggleLike, isLiked } = useLibraryStore();
    const { toggleQueue, toggleLyrics, isLyricsOpen } = useUIStore();
    
    const volumeRef = useRef<HTMLDivElement>(null);
    const isDraggingVolume = useRef(false);

    const liked = currentTrack ? isLiked(currentTrack.id) : false;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const isRadioPlaying = !!currentRadioStation;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const controls = useAnimation();

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.y > 100) {
            togglePlayerExpanded();
        } else {
            controls.start({ y: 0 });
        }
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        seek(percent * duration);
    };

    const updateVolume = (e: MouseEvent | React.MouseEvent) => {
        if (!volumeRef.current) return;
        const rect = volumeRef.current.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        setVolume(Math.max(0, Math.min(1, percent)));
    };

    const handleVolumeMouseDown = (e: React.MouseEvent) => {
        isDraggingVolume.current = true;
        updateVolume(e);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setVolume(Math.max(0, Math.min(1, volume + delta)));
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingVolume.current) {
                updateVolume(e);
            }
        };

        const handleMouseUp = () => {
            isDraggingVolume.current = false;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const handleGoToAlbum = () => {
        if (currentTrack?.album) {
            navigate(`/album/${encodeURIComponent(currentTrack.album)}?highlight=${currentTrack.id}`);
        }
    };

    if (isMobile) {
        return (
            <>
                {/* Mini-player - only visible when NOT expanded */}
                {!isPlayerExpanded && (
                    <div className="bg-black/60 backdrop-blur-xl border-t border-white/5 z-[200] fixed bottom-16 left-0 right-0">
                        {/* Compact Mini-Player */}
                        <div
                            className="h-16 flex items-center justify-between px-4 relative z-[150] cursor-pointer"
                            onClick={(e) => {
                                // Only expand if clicking on non-button areas
                                const target = e.target as HTMLElement;
                                if (!target.closest('button')) {
                                    togglePlayerExpanded();
                                }
                            }}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0 pointer-events-none">
                                {isRadioPlaying ? (
                                    <>
                                        <div className="w-12 h-12 rounded bg-gradient-to-br from-pink-500 to-purple-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                                            {currentRadioStation.favicon || currentRadioStation.logo_url ? (
                                                <img
                                                    src={currentRadioStation.favicon || currentRadioStation.logo_url}
                                                    alt={currentRadioStation.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                />
                                            ) : (
                                                <Radio className="w-5 h-5 text-white" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-semibold text-white truncate">{currentRadioStation.name}</h4>
                                            <p className="text-xs text-white/50 truncate">Radio</p>
                                        </div>
                                    </>
                                ) : currentTrack ? (
                                    <>
                                        <div className="w-12 h-12 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                                            {currentTrack.artwork_path ? (
                                                <img
                                                    src={getArtworkUrl(currentTrack.id)}
                                                    alt={currentTrack.title}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-semibold text-white truncate">{currentTrack.title}</h4>
                                            <p className="text-xs text-white/50 truncate">{currentTrack.artist || 'Unknown Artist'}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded bg-zinc-800" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-white/30">No track playing</h4>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePlay();
                                        vibrate(HapticPatterns.light);
                                    }}
                                    disabled={!currentTrack && !isRadioPlaying && isLoading}
                                    className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : isPlaying ? (
                                        <Pause className="w-5 h-5 fill-current" />
                                    ) : (
                                        <Play className="w-5 h-5 fill-current ml-0.5" />
                                    )}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        next();
                                        vibrate(HapticPatterns.light);
                                    }}
                                    disabled={(!currentTrack && !isRadioPlaying) || isRadioPlaying}
                                    className="w-8 h-8 flex items-center justify-center text-white hover:text-white transition-colors"
                                >
                                    <SkipForward className="w-5 h-5 fill-current" />
                                </button>
                            </div>
                        </div>

                        {/* Thin Progress Bar (only visible on mini-player) */}
                        {!isRadioPlaying && currentTrack && (
                            <div
                                className="h-0.5 bg-white/10 relative cursor-pointer group"
                                onClick={handleProgressClick}
                            >
                                <div
                                    className="absolute inset-y-0 left-0 bg-pink-500 transition-colors"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Backdrop overlay for expanded player - at root level to avoid stacking context issues */}
                {isPlayerExpanded && (
                    <div
                        className="fixed inset-0 bg-black/60 z-[150]"
                        onClick={togglePlayerExpanded}
                    />
                )}

                {/* Expanded Full Player - at root level to avoid stacking context issues */}
                {isPlayerExpanded && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.2 }}
                        onDragEnd={handleDragEnd}
                        className="fixed inset-0 bg-black/95 z-[200] flex flex-col pointer-events-auto"
                    >
                        {/* Drag Handle & Close Button */}
                        <div className="flex items-center justify-between px-6 pt-12 pb-4">
                            <button 
                                onClick={togglePlayerExpanded}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/50 hover:text-white"
                            >
                                <ChevronDown className="w-6 h-6" />
                            </button>
                            <div className="w-12 h-1 bg-white/20 rounded-full" />
                            <div className="w-10" /> {/* Spacer */}
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto px-6 pb-12">
                            {isRadioPlaying ? (
                                <div className="text-center py-4">
                                    <div className="w-64 h-64 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 overflow-hidden mx-auto mb-8 flex items-center justify-center shadow-2xl ring-1 ring-white/10">
                                        {currentRadioStation.favicon || currentRadioStation.logo_url ? (
                                            <img 
                                                src={currentRadioStation.favicon || currentRadioStation.logo_url}
                                                alt={currentRadioStation.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                            />
                                        ) : (
                                            <Radio className="w-20 h-20 text-white" />
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{currentRadioStation.name}</h3>
                                    <p className="text-white/60 mb-8 text-lg">{currentRadioStation.genre || 'Radio'}</p>
                                    
                                    <div className="flex justify-center gap-6 mb-8">
                                        <button
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                togglePlay(); 
                                                vibrate(HapticPatterns.light);
                                            }}
                                            disabled={isLoading}
                                            className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 disabled:opacity-50"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-10 h-10 animate-spin" />
                                            ) : isPlaying ? (
                                                <Pause className="w-10 h-10 fill-current" />
                                            ) : (
                                                <Play className="w-10 h-10 fill-current ml-1.5" />
                                            )}
                                        </button>
                                    </div>
                                    
                                    <button
                                        onClick={() => {
                                            stopRadio();
                                            vibrate(HapticPatterns.medium);
                                        }}
                                        className="px-6 py-3 bg-pink-500/20 text-pink-400 font-medium rounded-full hover:bg-pink-500/30 transition-colors"
                                    >
                                        Stop Radio
                                    </button>
                                </div>
                            ) : currentTrack ? (
                                <div className="text-center py-4">
                                    <div 
                                        className="w-72 h-72 rounded-2xl overflow-hidden mx-auto mb-8 shadow-2xl ring-1 ring-white/10"
                                        onClick={handleGoToAlbum}
                                    >
                                        {currentTrack.artwork_path ? (
                                            <img 
                                                src={getArtworkUrl(currentTrack.id)} 
                                                alt={currentTrack.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600" />
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center justify-between mb-8 text-left">
                                        <div className="min-w-0 flex-1 pr-4">
                                            <h3 className="text-2xl font-bold text-white mb-1 truncate leading-tight">{currentTrack.title}</h3>
                                            <p className="text-white/60 text-lg truncate" onClick={handleGoToAlbum}>{currentTrack.artist || 'Unknown Artist'}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                toggleLike(currentTrack.id);
                                                vibrate(HapticPatterns.light);
                                            }}
                                            className={cn(
                                                "transition-colors p-2 rounded-full hover:bg-white/10",
                                                liked ? "text-pink-500" : "text-white/40 hover:text-pink-500"
                                            )}
                                        >
                                            <Heart className={cn("w-7 h-7", liked && "fill-current")} />
                                        </button>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full mb-2">
                                        <div 
                                            className="h-1.5 w-full bg-white/10 rounded-full relative group cursor-pointer overflow-hidden mb-2"
                                            onClick={handleProgressClick}
                                        >
                                            <div 
                                                className="absolute inset-y-0 left-0 bg-white group-hover:bg-pink-500 transition-colors rounded-full"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-white/40 font-medium font-mono">
                                            <span>{formatTime(currentTime)}</span>
                                            <span>{formatTime(duration)}</span>
                                        </div>
                                    </div>

                                    {/* Controls */}
                                    <div className="flex items-center justify-center gap-6 mb-8 mt-4">
                                        <button 
                                            onClick={() => { toggleShuffle(); vibrate(HapticPatterns.light); }}
                                            className={cn(
                                                "transition-colors p-2",
                                                shuffleEnabled ? "text-pink-500" : "text-white/40 hover:text-white"
                                            )}
                                        >
                                            <Shuffle className="w-6 h-6" />
                                        </button>
                                        <button 
                                            onClick={() => { previous(); vibrate(HapticPatterns.light); }}
                                            className="text-white hover:text-white transition-colors p-2"
                                        >
                                            <SkipBack className="w-8 h-8 fill-current" />
                                        </button>
                                        <button
                                            onClick={() => { togglePlay(); vibrate(HapticPatterns.light); }}
                                            disabled={isLoading}
                                            className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 disabled:opacity-50"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-10 h-10 animate-spin" />
                                            ) : isPlaying ? (
                                                <Pause className="w-10 h-10 fill-current" />
                                            ) : (
                                                <Play className="w-10 h-10 fill-current ml-1.5" />
                                            )}
                                        </button>
                                        <button 
                                            onClick={() => { next(); vibrate(HapticPatterns.light); }}
                                            className="text-white hover:text-white transition-colors p-2"
                                        >
                                            <SkipForward className="w-8 h-8 fill-current" />
                                        </button>
                                        <button 
                                            onClick={() => { cycleRepeat(); vibrate(HapticPatterns.light); }}
                                            className={cn(
                                                "transition-colors relative p-2",
                                                repeatMode !== 'none' ? "text-pink-500" : "text-white/40 hover:text-white"
                                            )}
                                        >
                                            {repeatMode === 'one' ? (
                                                <Repeat1 className="w-6 h-6" />
                                            ) : (
                                                <Repeat className="w-6 h-6" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Bottom Actions */}
                                    <div className="flex items-center justify-center gap-8 px-4">
                                        <button
                                            onClick={toggleLyrics}
                                            className={`p-3 rounded-full hover:bg-white/10 transition-colors ${isLyricsOpen ? 'text-pink-500 bg-pink-500/10' : 'text-white/50'}`}
                                        >
                                            <Mic2 className="w-6 h-6" />
                                        </button>
                                        <button
                                            onClick={toggleQueue}
                                            className="p-3 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                        >
                                            <ListMusic className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20">
                                    <h3 className="text-lg font-semibold text-white/30">No track playing</h3>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </>
        );
    }

    return (
        <div className="h-24 bg-black/60 backdrop-blur-xl border-t border-white/5 z-[100] flex items-center justify-between px-6 fixed bottom-0 left-0 right-0">
            <div className="flex items-center gap-4 w-[30%]">
                {isRadioPlaying ? (
                    <>
                        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 overflow-hidden shadow-lg flex items-center justify-center">
                            {currentRadioStation.favicon || currentRadioStation.logo_url ? (
                                <img 
                                    src={currentRadioStation.favicon || currentRadioStation.logo_url}
                                    alt={currentRadioStation.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                            ) : (
                                <Radio className="w-6 h-6 text-white" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-white leading-tight truncate max-w-[180px]">
                                    {currentRadioStation.name}
                                </h4>
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-pink-500 text-white rounded uppercase">Live</span>
                            </div>
                            <p className="text-xs text-white/50 mt-1 truncate max-w-[200px]">
                                {currentRadioStation.genre || currentRadioStation.tags?.join(', ') || 'Radio'}
                                {currentRadioStation.country && ` • ${currentRadioStation.country}`}
                            </p>
                        </div>
                    </>
                ) : currentTrack ? (
                    <>
                        <div 
                            onClick={handleGoToAlbum}
                            className={cn(
                                "w-14 h-14 rounded-lg bg-zinc-800 overflow-hidden shadow-lg group relative",
                                currentTrack.album && "cursor-pointer hover:opacity-80 transition-opacity"
                            )}
                        >
                            {currentTrack.artwork_path ? (
                                <img 
                                    src={getArtworkUrl(currentTrack.id)} 
                                    alt={currentTrack.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600" />
                            )}
                        </div>
                        <div 
                            onClick={handleGoToAlbum}
                            className={cn(
                                "min-w-0",
                                currentTrack.album && "cursor-pointer hover:opacity-80 transition-opacity"
                            )}
                        >
                            <h4 className="text-sm font-semibold text-white leading-tight truncate max-w-[200px]">
                                {currentTrack.title}
                            </h4>
                            <p className="text-xs text-white/50 mt-1 truncate max-w-[200px]">
                                {currentTrack.artist || 'Unknown Artist'}
                            </p>
                        </div>
                        <button 
                            onClick={() => toggleLike(currentTrack.id)}
                            className={cn(
                                "ml-2 transition-colors",
                                liked ? "text-pink-500" : "text-white/40 hover:text-pink-500"
                            )}
                        >
                            <Heart className={cn("w-5 h-5", liked && "fill-current")} />
                        </button>
                    </>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg bg-zinc-800" />
                        <div>
                            <h4 className="text-sm font-semibold text-white/30">No track playing</h4>
                            <p className="text-xs text-white/20 mt-1">Select a song to play</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center gap-2 w-[40%]">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={toggleShuffle}
                        disabled={isRadioPlaying}
                        className={cn(
                            "transition-colors",
                            isRadioPlaying ? "text-white/20 cursor-not-allowed" :
                            shuffleEnabled ? "text-pink-500" : "text-white/40 hover:text-white"
                        )}
                    >
                        <Shuffle className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={previous}
                        className={cn(
                            "transition-colors",
                            isRadioPlaying ? "text-white/20 cursor-not-allowed" : "text-white hover:text-white"
                        )}
                        disabled={(!currentTrack && !isRadioPlaying) || isRadioPlaying}
                    >
                        <SkipBack className="w-5 h-5 fill-current" />
                    </button>

                    <button
                        onClick={togglePlay}
                        disabled={!currentTrack && !isRadioPlaying && isLoading}
                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                        ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                        )}
                    </button>

                    <button 
                        onClick={next}
                        className={cn(
                            "transition-colors",
                            isRadioPlaying ? "text-white/20 cursor-not-allowed" : "text-white hover:text-white"
                        )}
                        disabled={(!currentTrack && !isRadioPlaying) || isRadioPlaying}
                    >
                        <SkipForward className="w-5 h-5 fill-current" />
                    </button>
                    <button 
                        onClick={cycleRepeat}
                        disabled={isRadioPlaying}
                        className={cn(
                            "transition-colors relative",
                            isRadioPlaying ? "text-white/20 cursor-not-allowed" :
                            repeatMode !== 'none' ? "text-pink-500" : "text-white/40 hover:text-white"
                        )}
                    >
                        {repeatMode === 'one' ? (
                            <Repeat1 className="w-4 h-4" />
                        ) : (
                            <Repeat className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {isRadioPlaying ? (
                    <div className="w-full max-w-md flex items-center justify-center gap-2 text-xs text-white/40 font-medium">
                        <span className="animate-pulse">Streaming live radio</span>
                    </div>
                ) : (
                    <div className="w-full max-w-md flex items-center gap-2 text-xs text-white/40 font-medium font-mono">
                        <span className="w-10 text-right">{formatTime(currentTime)}</span>
                        <div 
                            className="h-1 flex-1 bg-white/10 rounded-full relative group cursor-pointer overflow-hidden"
                            onClick={handleProgressClick}
                        >
                            <div 
                                className="absolute inset-y-0 left-0 bg-white/40 group-hover:bg-pink-500 transition-colors rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                            <div 
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ left: `calc(${progress}% - 6px)` }}
                            />
                        </div>
                        <span className="w-10">{formatTime(duration)}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-end gap-3 w-[30%]">
                {(isRadioMode || isRadioPlaying) && (
                    <button 
                        onClick={stopRadio}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-pink-500/20 text-pink-400 text-xs font-medium rounded-full hover:bg-pink-500/30 transition-colors"
                        title="Stop Radio"
                    >
                        <Radio className="w-3.5 h-3.5" />
                        Radio
                    </button>
                )}
                <button 
                    onClick={toggleLyrics}
                    className={`hover:text-white transition-colors ${isLyricsOpen ? 'text-pink-500' : 'text-white/40'}`}
                    title="Lyrics"
                >
                    <Mic2 className="w-4 h-4" />
                </button>
                <button 
                    onClick={toggleQueue}
                    className="text-white/40 hover:text-white"
                >
                    <ListMusic className="w-4 h-4" />
                </button>
                <div 
                    className="flex items-center gap-2 w-28 pl-2"
                    onWheel={handleWheel}
                >
                    <button onClick={toggleMute} className="text-white/60 hover:text-white">
                        {isMuted || volume === 0 ? (
                            <VolumeX className="w-4 h-4" />
                        ) : (
                            <Volume2 className="w-4 h-4" />
                        )}
                    </button>
                    <div 
                        ref={volumeRef}
                        className="flex-1 h-4 relative group cursor-pointer flex items-center"
                        onMouseDown={handleVolumeMouseDown}
                    >
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden pointer-events-none">
                            <div 
                                className="h-full bg-white/40 group-hover:bg-pink-500 transition-colors rounded-full"
                                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
