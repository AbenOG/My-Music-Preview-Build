import { NavLink } from 'react-router-dom';
import { Home, Search, Library, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUIStore } from '../../stores/uiStore';

const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Library, label: 'Library', path: '/library' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

export function BottomNavigation() {
    const openSearch = useUIStore((state) => state.openSearch);

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-xl border-t border-white/5 z-40">
            <div className="flex items-center justify-around h-full">
                {/* Home */}
                <NavLink
                    to="/"
                    className={({ isActive }) => cn(
                        "flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-200",
                        isActive ? "text-pink-500" : "text-white/50 hover:text-white"
                    )}
                >
                    <Home className="w-6 h-6 transition-all duration-200 active:scale-95" />
                    <span className="text-[10px] font-medium">Home</span>
                </NavLink>

                {/* Search - opens modal instead of navigating */}
                <button
                    onClick={openSearch}
                    className="flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-200 text-white/50 hover:text-white"
                >
                    <Search className="w-6 h-6 transition-all duration-200 active:scale-95" />
                    <span className="text-[10px] font-medium">Search</span>
                </button>

                {/* Library */}
                <NavLink
                    to="/library"
                    className={({ isActive }) => cn(
                        "flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-200",
                        isActive ? "text-pink-500" : "text-white/50 hover:text-white"
                    )}
                >
                    <Library className="w-6 h-6 transition-all duration-200 active:scale-95" />
                    <span className="text-[10px] font-medium">Library</span>
                </NavLink>

                {/* Settings */}
                <NavLink
                    to="/settings"
                    className={({ isActive }) => cn(
                        "flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-200",
                        isActive ? "text-pink-500" : "text-white/50 hover:text-white"
                    )}
                >
                    <Settings className="w-6 h-6 transition-all duration-200 active:scale-95" />
                    <span className="text-[10px] font-medium">Settings</span>
                </NavLink>
            </div>
        </div>
    );
}
