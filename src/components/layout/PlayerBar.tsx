import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1, Mic2, ListMusic, Heart, Loader2, Radio } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUIStore } from '../../stores/uiStore';
import { getArtworkUrl } from '../../api/client';
import { cn } from '../../lib/utils';

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
    } = usePlayerStore();

    const { toggleLike, isLiked } = useLibraryStore();
    const { toggleQueue, toggleLyrics, isLyricsOpen } = useUIStore();
    
    const volumeRef = useRef<HTMLDivElement>(null);
    const isDraggingVolume = useRef(false);

    const liked = currentTrack ? isLiked(currentTrack.id) : false;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const isRadioPlaying = !!currentRadioStation;

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

    return (
        <div className="h-24 bg-black/60 backdrop-blur-xl border-t border-white/5 flex items-center justify-between px-6 z-50 fixed bottom-0 left-0 right-0">
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
