import { useEffect, type ReactNode } from 'react';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useMediaSession } from '../../hooks/useMediaSession';
import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';

interface AudioProviderProps {
  children: ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  useAudioPlayer();
  useWebSocket();
  useKeyboardShortcuts();
  useMediaSession();

  const loadState = usePlayerStore((state) => state.loadState);
  const setAllTracks = usePlayerStore((state) => state.setAllTracks);
  const fetchAll = useLibraryStore((state) => state.fetchAll);
  const tracks = useLibraryStore((state) => state.tracks);

  useEffect(() => {
    loadState();
    fetchAll();
  }, []);

  useEffect(() => {
    if (tracks.length > 0) {
      setAllTracks(tracks);
    }
  }, [tracks, setAllTracks]);

  useEffect(() => {
    const saveState = usePlayerStore.getState().saveState;
    const interval = setInterval(() => {
      saveState();
    }, 30000);

    const handleBeforeUnload = () => {
      saveState();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return <>{children}</>;
}
