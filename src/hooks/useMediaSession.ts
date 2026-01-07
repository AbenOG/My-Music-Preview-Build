import { useEffect } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { getArtworkUrl } from '../api/client';

export function useMediaSession() {
  const { currentTrack, isPlaying, next, previous, togglePlay, seek, currentTime, duration } = usePlayerStore();

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentTrack) {
      const artwork = currentTrack.artwork_path 
        ? [{ src: getArtworkUrl(currentTrack.id), sizes: '512x512', type: 'image/jpeg' }]
        : [];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || 'Unknown Album',
        artwork,
      });
    }
  }, [currentTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => previous());
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
    
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      seek(Math.max(currentTime - (details.seekOffset || 10), 0));
    });
    
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      seek(Math.min(currentTime + (details.seekOffset || 10), duration));
    });
    
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        seek(details.seekTime);
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [togglePlay, previous, next, seek, currentTime, duration]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    
    if ('setPositionState' in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: 1,
          position: currentTime,
        });
      } catch (e) {
      }
    }
  }, [currentTime, duration]);
}
