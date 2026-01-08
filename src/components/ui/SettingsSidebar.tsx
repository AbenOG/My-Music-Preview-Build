import { motion } from 'framer-motion';
import { HardDrive, Volume2, Wrench, Database, Info } from 'lucide-react';

export type SettingsCategory = 'library' | 'audio' | 'tools' | 'metadata' | 'about';

interface Category {
  id: SettingsCategory;
  label: string;
  icon: typeof HardDrive;
}

const CATEGORIES: Category[] = [
  { id: 'library', label: 'Library', icon: HardDrive },
  { id: 'audio', label: 'Audio', icon: Volume2 },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'metadata', label: 'Metadata', icon: Database },
  { id: 'about', label: 'About', icon: Info },
];

interface SettingsSidebarProps {
  activeCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
  isMobile?: boolean;
}

export function SettingsSidebar({ activeCategory, onCategoryChange, isMobile = false }: SettingsSidebarProps) {
  return (
    <div 
      className={`
        ${isMobile ? 'w-full border-b border-white/5 p-4 overflow-x-auto no-scrollbar' : 'w-72 p-6'} 
        flex-shrink-0 relative z-20
      `}
    >
      {!isMobile && (
        <div className="mb-8 px-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Settings
          </h2>
          <p className="text-sm text-white/40 mt-1">
            Manage your music experience
          </p>
        </div>
      )}

      <nav className={`${isMobile ? 'flex gap-2' : 'space-y-2'}`}>
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`
                relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200
                ${isMobile ? 'flex-shrink-0' : 'w-full'}
                group
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="activeCategory"
                  className="absolute inset-0 bg-white/10 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              
              <div className={`relative z-10 p-2 rounded-lg transition-colors ${isActive ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-white/5 text-white/40 group-hover:text-white group-hover:bg-white/10'}`}>
                <Icon className="w-5 h-5" />
              </div>

              {!isMobile && (
                <span className={`relative z-10 font-medium transition-colors ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                  {category.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

