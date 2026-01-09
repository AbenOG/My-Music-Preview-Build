import { Outlet, Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { PlayerBar } from './PlayerBar';
import { QueuePanel } from './QueuePanel';
import { BottomNavigation } from './BottomNavigation';
import { MobileMenu } from './MobileMenu';
import { AudioProvider } from '../audio/AudioProvider';
import { useUIStore } from '../../stores/uiStore';
import { GlobalSearch } from '../ui/GlobalSearch';
import { LyricsFullScreen } from '../ui/LyricsFullScreen';
import { Settings, Menu } from 'lucide-react';

export function Layout() {
    const isQueueOpen = useUIStore((state) => state.isQueueOpen);
    const isLyricsOpen = useUIStore((state) => state.isLyricsOpen);
    const isMobileMenuOpen = useUIStore((state) => state.isMobileMenuOpen);
    const openMobileMenu = useUIStore((state) => state.openMobileMenu);
    const closeMobileMenu = useUIStore((state) => state.closeMobileMenu);

    return (
        <AudioProvider>
            <div className="flex w-full h-screen bg-black text-white overflow-hidden selection:bg-pink-500/30">
                <div className="relative z-20 hidden md:block h-full">
                    <Sidebar />
                </div>

                <main className="flex-1 relative h-full overflow-hidden flex flex-col">
                    <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-md border-b border-white/5 px-4 md:px-8 py-4 flex items-center justify-between">
                        <button
                            onClick={openMobileMenu}
                            className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="hidden md:block w-10" />
                        <div className="hidden md:flex flex-1 justify-center max-w-xl">
                            <GlobalSearch />
                        </div>
                        <Link
                            to="/settings"
                            className="hidden md:flex w-10 h-10 items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            title="Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </Link>
                    </div>
                    
                    <div data-scroll-container className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth pb-32 md:pb-32">
                        <Outlet />
                    </div>

                    <div className="pointer-events-none fixed top-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen z-0" />
                    <div className="pointer-events-none fixed bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px] mix-blend-screen z-0" />
                </main>

                <AnimatePresence>
                    {isQueueOpen && <QueuePanel />}
                </AnimatePresence>

                <AnimatePresence>
                    {isLyricsOpen && <LyricsFullScreen />}
                </AnimatePresence>

                <BottomNavigation />

                <MobileMenu 
                    isOpen={isMobileMenuOpen} 
                    onClose={closeMobileMenu}
                />

                <PlayerBar />
            </div>
        </AudioProvider>
    );
}
