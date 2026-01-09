import { AnimatePresence, motion } from 'framer-motion';
import { Radio, Disc, User, Heart, Bookmark, X, Compass, PlusSquare } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useLibraryStore } from '../../stores/libraryStore';
import { CreatePlaylistModal } from '../ui/CreatePlaylistModal';
import { useState } from 'react';

export function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { playlists, likedTracks, savedAlbums } = useLibraryStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] md:hidden pointer-events-auto"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl z-[250] md:hidden pb-16"
                        >
                            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-white">More</h3>
                                    <button
                                        onClick={onClose}
                                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    <MobileNavLink icon={Compass} label="Discover" path="/discover" onClose={onClose} />
                                    <MobileNavLink icon={Radio} label="Radio" path="/radio" onClose={onClose} />
                                </div>

                                <div className="pt-4 border-t border-white/5 space-y-1">
                                    <MobileNavLink icon={User} label="Artists" path="/artists" onClose={onClose} />
                                    <MobileNavLink icon={Disc} label="Albums" path="/albums" onClose={onClose} />
                                    <MobileNavLink
                                        icon={Heart}
                                        label="Liked Songs"
                                        path="/liked"
                                        onClose={onClose}
                                        badge={likedTracks.length}
                                        isPink
                                    />
                                    <MobileNavLink
                                        icon={Bookmark}
                                        label="Saved Albums"
                                        path="/saved-albums"
                                        onClose={onClose}
                                        badge={savedAlbums.length}
                                        isPink
                                    />
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between px-3 mb-3">
                                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Playlists</p>
                                        <button
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                                        >
                                            <PlusSquare className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {playlists.length === 0 ? (
                                            <p className="px-3 text-sm text-white/30">No playlists yet</p>
                                        ) : (
                                            playlists.map((playlist) => (
                                                <NavLink
                                                    key={playlist.id}
                                                    to={`/playlist/${playlist.id}`}
                                                    onClick={onClose}
                                                    className="px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                                >
                                                    {playlist.name}
                                                </NavLink>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <CreatePlaylistModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </>
    );
}

function MobileNavLink({
    icon: Icon,
    label,
    path,
    onClose,
    badge,
    isPink
}: {
    icon: any;
    label: string;
    path: string;
    onClose: () => void;
    badge?: number;
    isPink?: boolean;
}) {
    return (
        <NavLink
            to={path}
            onClick={onClose}
            className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
            )}
        >
            {isPink ? (
                <div className="w-5 h-5 rounded-sm bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3 h-3 text-white" />
                </div>
            ) : (
                <Icon className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="flex-1">{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className="text-xs text-white/40">{badge}</span>
            )}
        </NavLink>
    );
}
