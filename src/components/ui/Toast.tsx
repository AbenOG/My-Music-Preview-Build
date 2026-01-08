import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Loader2, Check, X, Music, AlertCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNotificationStore } from '../../stores/notificationStore';

function AnimatedNumber({ value }: { value: number }) {
  const prevValue = useRef(value);
  const isIncreasing = value > prevValue.current;

  useEffect(() => {
    prevValue.current = value;
  }, [value]);

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.5, y: isIncreasing ? 5 : -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="inline-block tabular-nums"
    >
      {value}
    </motion.span>
  );
}

export function AutoScanToast() {
  const { autoScan, dismissAutoScan } = useNotificationStore();

  // Auto-dismiss after completion
  useEffect(() => {
    if (autoScan.phase === 'complete') {
      const timer = setTimeout(() => {
        dismissAutoScan();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [autoScan.phase, dismissAutoScan]);

  const getIcon = () => {
    switch (autoScan.phase) {
      case 'detecting':
        return <Music className="w-5 h-5 text-pink-400 animate-pulse" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />;
      case 'complete':
        return autoScan.errors > 0
          ? <AlertCircle className="w-5 h-5 text-yellow-400" />
          : <Check className="w-5 h-5 text-green-400" />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (autoScan.phase) {
      case 'detecting':
        return (
          <>
            <AnimatedNumber value={autoScan.filesDetected} /> new file{autoScan.filesDetected !== 1 ? 's' : ''} detected
          </>
        );
      case 'processing':
        return `Processing ${autoScan.total} file${autoScan.total !== 1 ? 's' : ''}...`;
      case 'complete':
        if (autoScan.errors > 0) {
          return `Added ${autoScan.added} track${autoScan.added !== 1 ? 's' : ''} (${autoScan.errors} error${autoScan.errors !== 1 ? 's' : ''})`;
        }
        return `Added ${autoScan.added} new track${autoScan.added !== 1 ? 's' : ''}`;
      default:
        return '';
    }
  };

  const getSubtitle = () => {
    switch (autoScan.phase) {
      case 'detecting':
        return `Waiting for files to finish copying...`;
      case 'processing':
        return autoScan.currentFile;
      case 'complete':
        return autoScan.folderName ? `From ${autoScan.folderName}` : null;
      default:
        return null;
    }
  };

  return createPortal(
    <AnimatePresence>
      {autoScan.isActive && (
        <motion.div
          initial={{ opacity: 0, x: 100, y: 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 100, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-24 right-4 z-50"
        >
          <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[280px] max-w-[340px]">
            {/* Header */}
            <div className="flex items-start gap-3 p-4">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">
                  {getTitle()}
                </p>
                {getSubtitle() && (
                  <p className="text-white/50 text-xs mt-0.5 truncate">
                    {getSubtitle()}
                  </p>
                )}
              </div>
              <button
                onClick={dismissAutoScan}
                className="flex-shrink-0 text-white/30 hover:text-white/60 transition-colors p-1 -m-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress bar (only during processing) */}
            {autoScan.phase === 'processing' && (
              <div className="px-4 pb-3">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${autoScan.progress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-white/40 text-xs">
                    {autoScan.processed} / {autoScan.total}
                  </span>
                  <span className="text-white/40 text-xs">
                    {Math.round(autoScan.progress)}%
                  </span>
                </div>
              </div>
            )}

            {/* Complete state - animated check */}
            {autoScan.phase === 'complete' && (
              <div className="px-4 pb-3">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${autoScan.errors > 0 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
