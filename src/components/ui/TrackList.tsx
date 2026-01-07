import { useState, useEffect, useRef } from 'react';
import { Play, Clock, MoreHorizontal, Heart } from 'lucide-react';
import type { Track } from '../../types';
import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { getArtworkUrl } from '../../api/client';
import { cn } from '../../lib/utils';
import { ContextMenu } from './ContextMenu';

interface TrackListProps {
    tracks: Track[];
    showAlbum?: boolean;
    showArtwork?: boolean;
    highlightTrackId?: number;
    onPlay?: (track: Track, index: number) => void;
}

function formatDuration(ms: number | null): string {
    if (!ms) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function TrackRow({ 
    track, 
    index, 
    isCurrentTrack, 
    isPlaying, 
    liked, 
    showAlbum, 
    showArtwork,
    isHighlighted,
    onPlay,
    onToggleLike,
    onContextMenu,
    onMoreClick
}: {
    track: Track;
    index: number;
    isCurrentTrack: boolean;
    isPlaying: boolean;
    liked: boolean;
    showAlbum: boolean;
    showArtwork: boolean;
    isHighlighted: boolean;
    onPlay: () => void;
    onToggleLike: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onMoreClick: (e: React.MouseEvent) => void;
}) {
    return (
        <div
            data-track-id={track.id}
            className={cn(
                "grid gap-4 items-center p-3 rounded-lg hover:bg-white/10 group transition-all cursor-pointer",
                showAlbum ? "grid-cols-[auto_1fr_1fr_auto]" : "grid-cols-[auto_1fr_auto]",
                isCurrentTrack && "bg-white/5",
                isHighlighted && "animate-highlight-flash"
            )}
            style={{ contentVisibility: 'auto', containIntrinsicSize: '0 52px' }}
            onClick={onPlay}
            onContextMenu={onContextMenu}
        >
            <div className="w-8 text-center">
                {isCurrentTrack && isPlaying ? (
                    <div className="flex items-center justify-center">
                        <div className="flex items-end justify-center gap-0.5 h-4">
                            <span className="w-0.5 bg-pink-500 rounded-full animate-equalizer-1" />
                            <span className="w-0.5 bg-pink-500 rounded-full animate-equalizer-2" />
                            <span className="w-0.5 bg-pink-500 rounded-full animate-equalizer-3" />
                            <span className="w-0.5 bg-pink-500 rounded-full animate-equalizer-4" />
                        </div>
                    </div>
                ) : (
                    <>
                        <span className={cn(
                            "tabular-nums group-hover:hidden",
                            isCurrentTrack ? "text-pink-500" : ""
                        )}>
                            {index + 1}
                        </span>
                        <div className="hidden group-hover:flex items-center justify-center text-white">
                            <Play className="w-4 h-4 fill-current" />
                        </div>
                    </>
                )}
            </div>

            <div className="flex items-center gap-4 min-w-0">
                {showArtwork && (
                    <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                        {track.artwork_path ? (
                            <img 
                                src={getArtworkUrl(track.id)} 
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800" />
                        )}
                    </div>
                )}
                <div className="min-w-0">
                    <div className={cn(
                        "font-medium truncate",
                        isCurrentTrack ? "text-pink-500" : "text-white"
                    )}>
                        {track.title}
                    </div>
                    <div className="text-white/40 text-xs truncate group-hover:text-white/60">
                        {track.artist || 'Unknown Artist'}
                    </div>
                </div>
            </div>

            {showAlbum && (
                <div className="truncate hidden md:block group-hover:text-white/60 transition-colors text-white/40">
                    {track.album || 'Unknown Album'}
                </div>
            )}

            <div className="flex items-center gap-4 justify-end">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike();
                    }}
                    className={cn(
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        liked ? "text-pink-500 opacity-100" : "text-white/40 hover:text-white"
                    )}
                >
                    <Heart className={cn("w-4 h-4", liked && "fill-current")} />
                </button>
                <span className="tabular-nums text-white/40 text-sm">
                    {formatDuration(track.duration_ms)}
                </span>
                <button 
                    onClick={onMoreClick}
                    className="opacity-0 group-hover:opacity-100 text-white/60 hover:text-white transition-opacity"
                >
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export function TrackList({ tracks, showAlbum = true, showArtwork = true, highlightTrackId, onPlay }: TrackListProps) {
    const { currentTrack, isPlaying, play } = usePlayerStore();
    const { toggleLike, isLiked } = useLibraryStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const [flashingTrackId, setFlashingTrackId] = useState<number | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        track: Track | null;
        trackIndex: number;
    }>({ isOpen: false, position: { x: 0, y: 0 }, track: null, trackIndex: 0 });

    useEffect(() => {
        if (highlightTrackId && containerRef.current) {
            const element = containerRef.current.querySelector(`[data-track-id="${highlightTrackId}"]`);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
            setFlashingTrackId(highlightTrackId);
            const timer = setTimeout(() => {
                setFlashingTrackId(null);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [highlightTrackId, tracks]);

    const handlePlay = (track: Track, index: number) => {
        if (onPlay) {
            onPlay(track, index);
        } else {
            play(track, tracks, index);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, track: Track, index: number) => {
        e.preventDefault();
        setContextMenu({
            isOpen: true,
            position: { x: e.clientX, y: e.clientY },
            track,
            trackIndex: index
        });
    };

    const handleMoreClick = (e: React.MouseEvent, track: Track, index: number) => {
        e.stopPropagation();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setContextMenu({
            isOpen: true,
            position: { x: rect.left, y: rect.bottom + 5 },
            track,
            trackIndex: index
        });
    };

    return (
        <div className="flex flex-col" ref={containerRef}>
            <div className={cn(
                "grid gap-4 text-sm text-white/40 font-medium border-b border-white/5 pb-2 mb-4 px-4 uppercase tracking-wider",
                showAlbum ? "grid-cols-[auto_1fr_1fr_auto]" : "grid-cols-[auto_1fr_auto]"
            )}>
                <span>#</span>
                <span>Title</span>
                {showAlbum && <span>Album</span>}
                <Clock className="w-4 h-4" />
            </div>

            <div className="flex flex-col">
                {tracks.map((track, i) => (
                    <TrackRow
                        key={track.id}
                        track={track}
                        index={i}
                        isCurrentTrack={currentTrack?.id === track.id}
                        isPlaying={isPlaying}
                        liked={isLiked(track.id)}
                        showAlbum={showAlbum}
                        showArtwork={showArtwork}
                        isHighlighted={flashingTrackId === track.id}
                        onPlay={() => handlePlay(track, i)}
                        onToggleLike={() => toggleLike(track.id)}
                        onContextMenu={(e) => handleContextMenu(e, track, i)}
                        onMoreClick={(e) => handleMoreClick(e, track, i)}
                    />
                ))}
            </div>
            
            <ContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
                track={contextMenu.track}
                allTracks={tracks}
                trackIndex={contextMenu.trackIndex}
            />
        </div>
    );
}
