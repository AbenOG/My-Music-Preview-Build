import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

interface SettingsCardProps extends HTMLMotionProps<'div'> {
  title?: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  gradient?: string;
}

export function SettingsCard({
  title,
  description,
  icon,
  gradient = 'from-pink-500/20 to-purple-500/20',
  children,
  className = '',
  ...props
}: SettingsCardProps) {
  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/5 
        hover:bg-white/[0.05] hover:border-white/10 transition-colors group
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
      {...props}
    >
      {/* Subtle Gradient Glow */}
      <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 blur-[80px] transition-opacity duration-700 pointer-events-none`} />
      
      <div className="relative z-10 p-6">
        {(icon || title) && (
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-5">
              {icon && (
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white shadow-lg ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300">
                  {icon}
                </div>
              )}
              <div className="pt-1">
                <h3 className="text-lg font-bold text-white group-hover:text-pink-100 transition-colors">{title}</h3>
                {description && (
                  <p className="text-sm text-white/50 mt-1 leading-relaxed max-w-md">{description}</p>
                )}
              </div>
            </div>
            {children && (
              <div className="flex items-center pl-4">{children}</div>
            )}
          </div>
        )}
        {!icon && !title && children}
      </div>
    </motion.div>
  );
}

