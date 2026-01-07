import { useState } from 'react';
import { Home, Music, Disc, User, Heart, Settings, Radio, PlusSquare, Library, Loader2, Compass } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useLibraryStore } from '../../stores/libraryStore';
import { CreatePlaylistModal } from '../ui/CreatePlaylistModal';

const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Compass, label: 'Discover', path: '/discover' },
    { icon: Radio, label: 'Radio', path: '/radio' },
];

const libraryItems = [
    { icon: Library, label: 'Your Library', path: '/library' },
    { icon: Disc, label: 'Albums', path: '/albums' },
    { icon: User, label: 'Artists', path: '/artists' },
];

export function Sidebar() {
    const { playlists, likedTracks, isScanning } = useLibraryStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
        <div className="w-60 h-full bg-black/40 backdrop-blur-md flex flex-col border-r border-white/5 p-6 z-20">
            <div className="flex items-center gap-2 px-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
                    <Music className="text-white w-5 h-5 fill-current" />
                </div>
                <span className="text-lg font-bold tracking-tight">Music</span>
                {isScanning && (
                    <Loader2 className="w-4 h-4 text-pink-500 animate-spin ml-auto" />
                )}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-8 -mx-2 px-2">
                <div className="space-y-1">
                    <p className="px-2 text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Discover</p>
                    <NavGroup items={navItems} />
                </div>

                <div className="space-y-1">
                    <p className="px-2 text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Library</p>
                    <NavGroup items={libraryItems} />

                    <NavLink
                        to="/liked"
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 mt-2",
                            isActive
                                ? "bg-white/10 text-white"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <Heart className="w-2.5 h-2.5 text-white fill-current" />
                        </div>
                        Liked Songs
                        <span className="ml-auto text-xs text-white/40">{likedTracks.length}</span>
                    </NavLink>
                </div>

                <div className="space-y-1 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between px-2 mb-2 group cursor-pointer" onClick={() => setIsCreateModalOpen(true)}>
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider group-hover:text-white transition-colors">Playlists</p>
                        <PlusSquare className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                    </div>

                    <div className="flex flex-col gap-1">
                        {playlists.length === 0 ? (
                            <p className="px-2 text-sm text-white/30">No playlists yet</p>
                        ) : (
                            playlists.map((playlist) => (
                                <NavLink
                                    key={playlist.id}
                                    to={`/playlist/${playlist.id}`}
                                    className={({ isActive }) => cn(
                                        "px-2 py-1.5 text-sm transition-colors truncate hover:translate-x-1 duration-200 block",
                                        isActive ? "text-white font-medium" : "text-white/50 hover:text-white"
                                    )}
                                >
                                    {playlist.name}
                                </NavLink>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
                <NavLink
                    to="/settings"
                    className={({ isActive }) => cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                            ? "bg-white/10 text-white"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Settings className="w-4 h-4" />
                    Settings
                </NavLink>
            </div>
            
            <CreatePlaylistModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
            />
        </div>
    );
}

function NavGroup({ items }: { items: typeof navItems }) {
    return (
        <>
            {items.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                            ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                >
                    {({ isActive }) => (
                        <>
                            <item.icon className={cn("w-4 h-4 opacity-70", isActive && "opacity-100 text-pink-500")} />
                            {item.label}
                        </>
                    )}
                </NavLink>
            ))}
        </>
    );
}
