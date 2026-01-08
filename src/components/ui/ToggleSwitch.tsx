import { motion } from 'framer-motion';

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  color?: 'pink' | 'purple' | 'emerald' | 'blue';
}

const COLOR_CLASSES = {
  pink: 'bg-pink-500 shadow-pink-500/50',
  purple: 'bg-purple-500 shadow-purple-500/50',
  emerald: 'bg-emerald-500 shadow-emerald-500/50',
  blue: 'bg-blue-500 shadow-blue-500/50',
};

export function ToggleSwitch({ enabled, onChange, disabled, color = 'pink' }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`
        relative w-14 h-8 rounded-full transition-all duration-300
        ${enabled ? `${COLOR_CLASSES[color]} shadow-lg` : 'bg-white/10 hover:bg-white/20'} 
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        border border-transparent ${!enabled && 'border-white/10'}
      `}
    >
      <motion.div
        className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-sm"
        initial={false}
        animate={{ 
          x: enabled ? 24 : 0,
          scale: enabled ? 1 : 0.8
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

