import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, 
    ListPlus, 
    Heart, 
    Disc, 
    User, 
    SkipForward,
    ListMusic,
    ChevronRight,
    Plus,
    Radio
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { CreatePlaylistModal } from './CreatePlaylistModal';
import type { Track } from '../../types';
import { cn } from '../../lib/utils';

interface ContextMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    track: Track | null;
    allTracks?: Track[];
    trackIndex?: number;
}

export function ContextMenu({ 
    isOpen, 
    position, 
    onClose, 
    track,
    allTracks = [],
    trackIndex = 0
}: ContextMenuProps) {
    const navigate = useNavigate();
    const menuRef = useRef<HTMLDivElement>(null);
    const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);
    const [adjustedPosition, setAdjustedPosition] = useState(position);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [pendingTrackForPlaylist, setPendingTrackForPlaylist] = useState<Track | null>(null);
    
    const { play, addToQueue, playNext, startRadio } = usePlayerStore();
    const { playlists, toggleLike, isLiked, addTrackToPlaylist } = useLibraryStore();

    useEffect(() => {
        if (isOpen && menuRef.current) {
            // Mobile check
            if (window.innerWidth < 768) {
                return; // Let mobile styles take over
            }

            const menu = menuRef.current;
            const rect = menu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            let x = position.x;
            let y = position.y;
            
            if (x + rect.width > viewportWidth - 20) {
                x = viewportWidth - rect.width - 20;
            }
            if (y + rect.height > viewportHeight - 20) {
                y = viewportHeight - rect.height - 20;
            }
            
            setAdjustedPosition({ x, y });
        }
    }, [isOpen, position]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) {
            setShowPlaylistSubmenu(false);
        }
    }, [isOpen]);

    if (!track) return null;

    const handlePlay = () => {
        play(track, allTracks.length > 0 ? allTracks : [track], trackIndex);
        onClose();
    };

    const handlePlayNext = () => {
        playNext(track);
        onClose();
    };

    const handleAddToQueue = () => {
        addToQueue(track);
        onClose();
    };

    const handleStartRadio = () => {
        startRadio(track);
        onClose();
    };

    const handleGoToArtist = () => {
        if (track.artist) {
            navigate(`/artist/${encodeURIComponent(track.artist)}`);
        }
        onClose();
    };

    const handleGoToAlbum = () => {
        if (track.album) {
            navigate(`/album/${encodeURIComponent(track.album)}`);
        }
        onClose();
    };

    const handleToggleLike = () => {
        toggleLike(track.id);
        onClose();
    };

    const handleAddToPlaylist = async (playlistId: number) => {
        await addTrackToPlaylist(playlistId, track.id);
        onClose();
    };

    const handleCreatePlaylist = () => {
        setPendingTrackForPlaylist(track);
        setShowCreateModal(true);
        onClose();
    };

    const handlePlaylistCreated = async (playlistId: number) => {
        if (pendingTrackForPlaylist) {
            await addTrackToPlaylist(playlistId, pendingTrackForPlaylist.id);
            setPendingTrackForPlaylist(null);
        }
    };

    const liked = isLiked(track.id);
    const isMobile = window.innerWidth < 768;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {isMobile && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] pointer-events-auto"
                                onClick={onClose}
                            />
                        )}
                        <motion.div
                            ref={menuRef}
                            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
                            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
                            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
                            transition={{ type: isMobile ? "spring" : "tween", damping: 25, stiffness: 300, duration: 0.1 }}
                            className={cn(
                                "fixed bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl z-[101]",
                                isMobile 
                                    ? "bottom-0 left-0 right-0 rounded-t-2xl border-b-0 pb-8 pt-2" 
                                    : "rounded-xl py-2 min-w-[220px]"
                            )}
                            style={!isMobile ? { left: adjustedPosition.x, top: adjustedPosition.y } : undefined}
                        >
                            {isMobile && (
                                <div className="w-full flex justify-center py-2 mb-2">
                                    <div className="w-12 h-1 bg-white/20 rounded-full" />
                                </div>
                            )}

                            {isMobile && (
                                <div className="px-4 mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
                                    <div className="w-12 h-12 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                                         {/* Simple artwork placeholder if available, or just icon */}
                                         <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                                            <Disc className="w-6 h-6 text-white" />
                                         </div>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-white truncate">{track.title}</h3>
                                        <p className="text-sm text-white/50 truncate">{track.artist || 'Unknown Artist'}</p>
                                    </div>
                                </div>
                            )}

                            <MenuItem icon={Play} label="Play" onClick={handlePlay} />
                            <MenuItem icon={SkipForward} label="Play Next" onClick={handlePlayNext} />
                            <MenuItem icon={ListPlus} label="Add to Queue" onClick={handleAddToQueue} />
                            
                            <Divider />
                            
                            <MenuItem icon={Radio} label="Start Radio" onClick={handleStartRadio} />
                            
                            <Divider />
                            
                            <div 
                                className="relative"
                                onMouseEnter={() => !isMobile && setShowPlaylistSubmenu(true)}
                                onMouseLeave={() => !isMobile && setShowPlaylistSubmenu(false)}
                                onClick={() => isMobile && setShowPlaylistSubmenu(!showPlaylistSubmenu)}
                            >
                                <div className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors cursor-pointer">
                                    <ListMusic className="w-4 h-4" />
                                    <span className="flex-1">Add to Playlist</span>
                                    <ChevronRight className={cn("w-4 h-4 text-white/40 transition-transform", isMobile && showPlaylistSubmenu && "rotate-90")} />
                                </div>
                                
                                <AnimatePresence>
                                    {showPlaylistSubmenu && (
                                        <motion.div
                                            initial={isMobile ? { height: 0, opacity: 0 } : { opacity: 0, x: -10 }}
                                            animate={isMobile ? { height: 'auto', opacity: 1 } : { opacity: 1, x: 0 }}
                                            exit={isMobile ? { height: 0, opacity: 0 } : { opacity: 0, x: -10 }}
                                            className={isMobile 
                                                ? "overflow-hidden bg-white/5 mx-4 rounded-lg mb-2"
                                                : "absolute left-full top-0 ml-1 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 min-w-[180px]"
                                            }
                                        >
                                            <button
                                                onClick={handleCreatePlaylist}
                                                className="w-full px-4 py-2.5 text-left text-sm text-pink-400 hover:bg-white/10 hover:text-pink-300 transition-colors flex items-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Create New Playlist
                                            </button>
                                            {playlists.length > 0 && <Divider />}
                                            {playlists.map(playlist => (
                                                <button
                                                    key={playlist.id}
                                                    onClick={() => handleAddToPlaylist(playlist.id)}
                                                    className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors truncate"
                                                >
                                                    {playlist.name}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            
                            <Divider />
                            
                            <MenuItem 
                                icon={User} 
                                label="Go to Artist" 
                                onClick={handleGoToArtist}
                                disabled={!track.artist}
                            />
                            <MenuItem 
                                icon={Disc} 
                                label="Go to Album" 
                                onClick={handleGoToAlbum}
                                disabled={!track.album}
                            />
                            
                            <Divider />
                            
                            <MenuItem 
                                icon={Heart} 
                                label={liked ? "Remove from Liked" : "Add to Liked"}
                                onClick={handleToggleLike}
                                className={liked ? "text-pink-500" : ""}
                                iconFill={liked}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <CreatePlaylistModal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setPendingTrackForPlaylist(null);
                }}
                onCreated={handlePlaylistCreated}
            />
        </>
    );
}

function MenuItem({ 
    icon: Icon, 
    label, 
    onClick, 
    disabled = false,
    className = "",
    iconFill = false
}: { 
    icon: any; 
    label: string; 
    onClick: () => void;
    disabled?: boolean;
    className?: string;
    iconFill?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
                className
            )}
        >
            <Icon className={cn("w-4 h-4", iconFill && "fill-current")} />
            {label}
        </button>
    );
}

function Divider() {
    return <div className="h-px bg-white/10 my-1.5" />;
}
