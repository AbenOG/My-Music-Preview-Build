import React, { useState } from "react";
import { Disc } from "lucide-react";
import { motion } from "framer-motion";

type CardProps = {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
};

// Renamed internally but kept export as Card3D to maintain compatibility
export function Card3D({ children, className, onClick }: CardProps) {
    return (
        <div
            onClick={onClick}
            className={`relative group rounded-2xl bg-surface overflow-hidden transition-all duration-300 ring-1 ring-white/5 hover:ring-white/20 hover:bg-white/5 cursor-pointer ${className}`}
        >
            {children}
        </div>
    );
}

export function ImageCard({
    title,
    subtitle,
    image,
    price
}: {
    title: string;
    subtitle: string;
    image: string;
    price?: string
}) {
    const [imgError, setImgError] = useState(false);
    const showFallback = !image || imgError;

    return (
        <Card3D className="w-full aspect-square relative">
            {showFallback ? (
                <div className="absolute inset-0 bg-gradient-to-br from-pink-900/20 via-purple-900/20 to-zinc-900 flex items-center justify-center">
                    <Disc className="w-16 h-16 text-white/10 group-hover:text-white/20 transition-colors" />
                </div>
            ) : (
                <div className="absolute inset-0">
                    <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover transition-opacity duration-300"
                        onError={() => setImgError(true)}
                    />
                    {/* Gradient Overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />
                </div>
            )}

            <div className="absolute bottom-0 left-0 w-full p-4 z-20">
                <h3 className="text-white font-bold text-lg leading-tight truncate drop-shadow-sm group-hover:text-pink-400 transition-colors">{title}</h3>
                <p className="text-white/60 text-sm mt-1 truncate group-hover:text-white/80 transition-colors">{subtitle}</p>
                {price && (
                    <span className="absolute right-4 bottom-4 text-xs font-semibold px-2 py-1 bg-white/10 backdrop-blur-md rounded-full text-white/90">
                        {price}
                    </span>
                )}
            </div>
        </Card3D>
    )
}
