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

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="fixed bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 min-w-[220px] z-[100]"
                        style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
                    >
                        <MenuItem icon={Play} label="Play" onClick={handlePlay} />
                        <MenuItem icon={SkipForward} label="Play Next" onClick={handlePlayNext} />
                        <MenuItem icon={ListPlus} label="Add to Queue" onClick={handleAddToQueue} />
                        
                        <Divider />
                        
                        <MenuItem icon={Radio} label="Start Radio" onClick={handleStartRadio} />
                        
                        <Divider />
                        
                        <div 
                            className="relative"
                            onMouseEnter={() => setShowPlaylistSubmenu(true)}
                            onMouseLeave={() => setShowPlaylistSubmenu(false)}
                        >
                            <div className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors cursor-pointer">
                                <ListMusic className="w-4 h-4" />
                                <span className="flex-1">Add to Playlist</span>
                                <ChevronRight className="w-4 h-4 text-white/40" />
                            </div>
                            
                            <AnimatePresence>
                                {showPlaylistSubmenu && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="absolute left-full top-0 ml-1 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 min-w-[180px]"
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
