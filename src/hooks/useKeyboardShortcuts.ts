import { useEffect } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useUIStore } from '../stores/uiStore';

export function useKeyboardShortcuts() {
  const {
    togglePlay,
    next,
    previous,
    seek,
    currentTime,
    setVolume,
    volume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    currentTrack,
  } = usePlayerStore();

  const { toggleLike, isLiked } = useLibraryStore();
  const { toggleQueue, openSearch, closeSearch, isSearchOpen, closeModal, activeModal } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || 
                             target.tagName === 'TEXTAREA' || 
                             target.isContentEditable;

      if (e.key === 'Escape') {
        if (isSearchOpen) {
          closeSearch();
          return;
        }
        if (activeModal) {
          closeModal();
          return;
        }
      }

      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && !isInputFocused) {
        e.preventDefault();
        openSearch();
        return;
      }

      if (isInputFocused) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
          
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            next();
          } else {
            seek(Math.min(currentTime + 5, 999999));
          }
          break;
          
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            previous();
          } else {
            seek(Math.max(currentTime - 5, 0));
          }
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(volume + 0.05, 1));
          break;
          
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(volume - 0.05, 0));
          break;
          
        case 'n':
        case 'N':
          if (!e.ctrlKey && !e.metaKey) {
            next();
          }
          break;
          
        case 'p':
        case 'P':
          if (!e.ctrlKey && !e.metaKey) {
            previous();
          }
          break;
          
        case 's':
        case 'S':
          if (!e.ctrlKey && !e.metaKey) {
            toggleShuffle();
          }
          break;
          
        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) {
            cycleRepeat();
          }
          break;
          
        case 'm':
        case 'M':
          toggleMute();
          break;
          
        case 'l':
        case 'L':
          if (currentTrack && !e.ctrlKey && !e.metaKey) {
            toggleLike(currentTrack.id);
          }
          break;
          
        case 'q':
        case 'Q':
          if (!e.ctrlKey && !e.metaKey) {
            toggleQueue();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay, next, previous, seek, currentTime, setVolume, volume,
    toggleMute, toggleShuffle, cycleRepeat, currentTrack, toggleLike,
    isLiked, toggleQueue, openSearch, closeSearch, isSearchOpen, 
    closeModal, activeModal
  ]);
}
