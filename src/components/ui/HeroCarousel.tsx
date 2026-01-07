import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { FEATURED_ARTISTS } from '../../lib/data';
import { cn } from '../../lib/utils';

export function HeroCarousel() {
    const [current, setCurrent] = useState(0);

    const next = () => setCurrent((c) => (c + 1) % FEATURED_ARTISTS.length);
    const prev = () => setCurrent((c) => (c - 1 + FEATURED_ARTISTS.length) % FEATURED_ARTISTS.length);

    // Auto slide
    useEffect(() => {
        const timer = setInterval(next, 6000);
        return () => clearInterval(timer);
    }, []);

    const artist = FEATURED_ARTISTS[current];

    return (
        <div className="relative w-full h-[400px] rounded-3xl overflow-hidden shadow-2xl group">
            <AnimatePresence mode='wait'>
                <motion.div
                    key={artist.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className={cn("absolute inset-0 bg-gradient-to-r", artist.gradient)}
                />
            </AnimatePresence>

            {/* Content Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col justify-center px-12 text-white w-[60%]">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={artist.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <h1 className="text-6xl font-bold tracking-tight mb-4 drop-shadow-md">{artist.name}</h1>
                        <p className="text-sm opacity-90 leading-relaxed max-w-lg drop-shadow-sm line-clamp-3">
                            {artist.description}
                        </p>

                        <div className="mt-8 flex gap-4">
                            <button className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                                <Play className="w-4 h-4 fill-current" /> Play Radio
                            </button>
                            <button className="px-8 py-3 bg-black/20 backdrop-blur-md text-white font-semibold rounded-full hover:bg-black/30 transition-all active:scale-95 border border-white/10">
                                Follow
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Image Cutout */}
            <AnimatePresence mode='wait'>
                <motion.div
                    key={artist.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ duration: 0.6 }}
                    className="absolute bottom-0 right-0 w-[55%] h-[110%] bg-contain bg-no-repeat bg-bottom mask-image-gradient pointer-events-none"
                    style={{
                        backgroundImage: `url(${artist.image})`,
                        maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
                    }}
                />
            </AnimatePresence>

            {/* Controls */}
            <div className="absolute bottom-6 right-6 flex gap-2 z-20">
                <button onClick={prev} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 text-white transition-all">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={next} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 text-white transition-all">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Indicators */}
            <div className="absolute bottom-6 left-12 flex gap-2 z-20">
                {FEATURED_ARTISTS.map((_, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "h-1 rounded-full transition-all duration-300",
                            idx === current ? "w-8 bg-white" : "w-2 bg-white/30"
                        )}
                    />
                ))}
            </div>
        </div>
    );
}
