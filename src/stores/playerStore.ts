import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import type { Track, RepeatMode } from '../types';
import { getStreamUrl } from '../api/client';
import { tracksApi } from '../api/tracks';
import { playerApi } from '../api/player';
import { playlistsApi } from '../api/playlists';

export interface RadioStation {
  id?: number;
  stationuuid?: string;
  name: string;
  url: string;
  favicon?: string;
  genre?: string;
  country?: string;
  logo_url?: string;
  tags?: string[];
}

interface PlayerStore {
  currentTrack: Track | null;
  currentRadioStation: RadioStation | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  pendingSeekTime: number | null;

  queue: Track[];
  queueIndex: number;
  originalQueue: Track[];

  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  isRadioMode: boolean;
  radioSeedTrack: Track | null;
  radioPlaylistId: number | null;

  audioElement: HTMLAudioElement | null;

  // Audio processing settings
  limiterEnabled: boolean;
  limiterCeiling: number;  // dB: -0.1, -1, -3
  targetLufs: number;      // LUFS: -14, -16, -23

  setAudioElement: (element: HTMLAudioElement | null) => void;
  play: (track?: Track, queue?: Track[], index?: number) => void;
  playRadio: (station: RadioStation) => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLoading: (loading: boolean) => void;

  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (from: number, to: number) => void;

  handleTrackEnd: () => void;
  saveState: () => void;
  loadState: () => Promise<void>;
  
  generateSmartQueue: () => Promise<void>;
  startRadio: (seedTrack: Track) => Promise<void>;
  stopRadio: () => void;
  setAllTracks: (tracks: Track[]) => void;
  allTracks: Track[];
  
  normalizationEnabled: boolean;
  toggleNormalization: () => void;
  toggleLimiter: () => void;
  setLimiterCeiling: (ceiling: number) => void;
  setTargetLufs: (lufs: number) => void;
}

const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const shuffleWithCurrentFirst = <T extends { id: number }>(
  array: T[],
  currentItem: T | null
): T[] => {
  if (!currentItem) return shuffleArray(array);
  const others = array.filter(t => t.id !== currentItem.id);
  return [currentItem, ...shuffleArray(others)];
};

export const usePlayerStore = create<PlayerStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
    currentTrack: null,
    currentRadioStation: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    isLoading: false,
    pendingSeekTime: null,

    queue: [],
    queueIndex: 0,
    originalQueue: [],
    allTracks: [],

    shuffleEnabled: false,
    repeatMode: 'none',
    isRadioMode: false,
    radioSeedTrack: null,
    radioPlaylistId: null,
    normalizationEnabled: true,
    limiterEnabled: true,
    limiterCeiling: -1,    // -1 dB default
    targetLufs: -14,       // Spotify standard

    audioElement: null,

    setAudioElement: (element) => set({ audioElement: element }),
    setAllTracks: (tracks) => set({ allTracks: tracks }),

    playRadio: (station) => {
      const audio = get().audioElement;
      if (!audio) return;
      
      set({ 
        currentRadioStation: station,
        currentTrack: null,
        isRadioMode: true,
        isLoading: true,
        currentTime: 0,
        duration: 0
      });
      
      audio.src = station.url;
      audio.load();
      audio.play().catch(console.error);
    },

    play: (track, queue, index) => {
      const state = get();
      const audio = state.audioElement;

      if (track) {
        if (queue) {
          // Always store the original queue order
          const originalQueue = [...queue];

          let finalQueue: Track[];
          let finalIndex: number;

          if (state.shuffleEnabled) {
            // Shuffle the queue, keeping current track at position 0
            finalQueue = shuffleWithCurrentFirst(queue, track);
            finalIndex = 0;
          } else {
            finalQueue = queue;
            finalIndex = index ?? 0;
          }

          set({
            queue: finalQueue,
            originalQueue: originalQueue,
            queueIndex: finalIndex,
            isRadioMode: false,
            radioSeedTrack: null,
            currentRadioStation: null,
            pendingSeekTime: null
          });
        } else {
          set({ currentRadioStation: null, isRadioMode: false });
        }
        
        set({ currentTrack: track, isLoading: true, pendingSeekTime: null });
        
        if (audio) {
          audio.src = getStreamUrl(track.id);
          audio.load();
          audio.play().catch(console.error);
        }
        // Note: logPlay is now called from useAudioPlayer when audio actually starts
      } else if (audio && state.currentTrack) {
        if (!audio.src || audio.src === '') {
          set({ isLoading: true });
          const seekTime = state.pendingSeekTime ?? state.currentTime;
          set({ pendingSeekTime: seekTime > 0 ? seekTime : null });
          audio.src = getStreamUrl(state.currentTrack.id);
          audio.load();
          
          const handleCanPlay = () => {
            const currentState = get();
            if (currentState.pendingSeekTime && currentState.pendingSeekTime > 0) {
              audio.currentTime = currentState.pendingSeekTime;
              set({ pendingSeekTime: null });
            }
            audio.play().catch(console.error);
            audio.removeEventListener('canplay', handleCanPlay);
          };
          audio.addEventListener('canplay', handleCanPlay);
        } else {
          audio.play().catch(console.error);
        }
      } else if (audio && state.currentRadioStation) {
        // Resume radio station stream
        audio.play().catch(console.error);
      }
    },

    pause: () => {
      const audio = get().audioElement;
      if (audio) {
        audio.pause();
      }
    },

    togglePlay: () => {
      const state = get();
      if (state.isPlaying) {
        state.pause();
      } else {
        state.play();
      }
    },

    next: () => {
      const state = get();
      const { queue, queueIndex, repeatMode, isRadioMode } = state;
      
      if (queue.length === 0) return;
      
      let nextIndex = queueIndex + 1;
      
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else if (isRadioMode) {
          state.generateSmartQueue().then(() => {
            const newState = get();
            if (newState.queue.length > nextIndex) {
              set({ queueIndex: nextIndex });
              state.play(newState.queue[nextIndex]);
            }
          });
          return;
        } else {
          set({ isPlaying: false });
          return;
        }
      }
      
      set({ queueIndex: nextIndex });
      state.play(queue[nextIndex]);
    },

    previous: () => {
      const state = get();
      const { queue, queueIndex, currentTime } = state;
      
      if (currentTime > 3) {
        state.seek(0);
        return;
      }
      
      if (queue.length === 0) return;
      
      let prevIndex = queueIndex - 1;
      if (prevIndex < 0) {
        prevIndex = queue.length - 1;
      }
      
      set({ queueIndex: prevIndex });
      state.play(queue[prevIndex]);
    },

    seek: (time) => {
      const audio = get().audioElement;
      if (audio) {
        audio.currentTime = time;
        set({ currentTime: time });
      }
    },

    setVolume: (volume) => {
      const audio = get().audioElement;
      const clampedVolume = Math.max(0, Math.min(1, volume));
      
      if (audio) {
        audio.volume = clampedVolume;
      }
      
      set({ volume: clampedVolume, isMuted: clampedVolume === 0 });
    },

    toggleMute: () => {
      const state = get();
      const audio = state.audioElement;
      
      if (audio) {
        if (state.isMuted) {
          audio.volume = state.volume || 0.8;
          set({ isMuted: false });
        } else {
          audio.volume = 0;
          set({ isMuted: true });
        }
      }
    },

    toggleShuffle: () => {
      const state = get();
      const { shuffleEnabled, queue, originalQueue, currentTrack } = state;
      
      if (shuffleEnabled) {
        const currentIndex = originalQueue.findIndex(t => t.id === currentTrack?.id);
        set({ 
          shuffleEnabled: false, 
          queue: originalQueue,
          queueIndex: currentIndex >= 0 ? currentIndex : 0
        });
      } else {
        const shuffled = shuffleArray(queue.filter(t => t.id !== currentTrack?.id));
        const newQueue = currentTrack ? [currentTrack, ...shuffled] : shuffled;
        set({ 
          shuffleEnabled: true, 
          queue: newQueue,
          queueIndex: 0
        });
      }
    },

    cycleRepeat: () => {
      const { repeatMode } = get();
      const modes: RepeatMode[] = ['none', 'all', 'one'];
      const currentIndex = modes.indexOf(repeatMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      set({ repeatMode: nextMode });
    },

    setCurrentTime: (time) => set({ currentTime: time }),
    setDuration: (duration) => set({ duration }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setIsLoading: (loading) => set({ isLoading: loading }),

    setQueue: (tracks, startIndex = 0) => {
      const state = get();
      const originalQueue = [...tracks];

      let finalQueue: Track[];
      let finalIndex: number;

      if (state.shuffleEnabled && tracks.length > 0) {
        const currentTrack = tracks[startIndex];
        finalQueue = shuffleWithCurrentFirst(tracks, currentTrack);
        finalIndex = 0;
      } else {
        finalQueue = tracks;
        finalIndex = startIndex;
      }

      set({
        queue: finalQueue,
        originalQueue: originalQueue,
        queueIndex: finalIndex
      });
    },

    addToQueue: (track) => {
      const { queue, originalQueue } = get();
      set({
        queue: [...queue, track],
        originalQueue: [...originalQueue, track]
      });
    },

    playNext: (track) => {
      const { queue, queueIndex, originalQueue, currentTrack } = get();

      // Add to shuffled queue right after current position
      const newQueue = [...queue];
      newQueue.splice(queueIndex + 1, 0, track);

      // Add to original queue after the current track's position
      const newOriginalQueue = [...originalQueue];
      if (currentTrack) {
        const originalIndex = originalQueue.findIndex(t => t.id === currentTrack.id);
        if (originalIndex >= 0) {
          newOriginalQueue.splice(originalIndex + 1, 0, track);
        } else {
          newOriginalQueue.push(track);
        }
      } else {
        newOriginalQueue.push(track);
      }

      set({ queue: newQueue, originalQueue: newOriginalQueue });
    },

    removeFromQueue: (index) => {
      const { queue, queueIndex, originalQueue } = get();
      const trackToRemove = queue[index];

      const newQueue = queue.filter((_, i) => i !== index);
      const newOriginalQueue = originalQueue.filter(t => t.id !== trackToRemove?.id);

      let newIndex = queueIndex;
      if (index < queueIndex) {
        newIndex = queueIndex - 1;
      } else if (index === queueIndex && index >= newQueue.length) {
        newIndex = Math.max(0, newQueue.length - 1);
      }

      set({ queue: newQueue, originalQueue: newOriginalQueue, queueIndex: newIndex });
    },

    clearQueue: () => {
      set({ queue: [], originalQueue: [], queueIndex: 0 });
    },

    reorderQueue: (from, to) => {
      const { queue, queueIndex } = get();
      const newQueue = [...queue];
      const [removed] = newQueue.splice(from, 1);
      newQueue.splice(to, 0, removed);
      
      let newIndex = queueIndex;
      if (from === queueIndex) {
        newIndex = to;
      } else if (from < queueIndex && to >= queueIndex) {
        newIndex = queueIndex - 1;
      } else if (from > queueIndex && to <= queueIndex) {
        newIndex = queueIndex + 1;
      }
      
      set({ queue: newQueue, queueIndex: newIndex });
    },

    handleTrackEnd: () => {
      const state = get();
      const { repeatMode, next, seek, play, currentTrack, queue, queueIndex, isRadioMode } = state;
      
      if (repeatMode === 'one') {
        seek(0);
        if (currentTrack) play(currentTrack);
      } else {
        const isLastTrack = queueIndex >= queue.length - 1;
        
        if (isLastTrack && repeatMode === 'none' && !isRadioMode) {
          state.generateSmartQueue().then(() => {
            next();
          });
        } else {
          next();
        }
      }
    },

    generateSmartQueue: async () => {
      const { currentTrack, allTracks, queue, isRadioMode, radioPlaylistId, radioSeedTrack } = get();
      if (!currentTrack || allTracks.length === 0) return;

      // If in radio mode with a backend playlist, extend via API
      if (isRadioMode && radioPlaylistId && radioSeedTrack) {
        try {
          const queuedIds = queue.map(t => t.id);
          const newTracks = await playlistsApi.extendRadio(
            radioPlaylistId,
            radioSeedTrack.id,
            queuedIds,
            20
          );

          if (newTracks && newTracks.length > 0) {
            set({
              queue: [...queue, ...newTracks],
              originalQueue: [...queue, ...newTracks]
            });
          }
          return;
        } catch (error) {
          console.error('Failed to extend radio playlist:', error);
          // Fall through to local generation
        }
      }

      // Local fallback for non-radio mode or when API fails
      const queuedIds = new Set(queue.map(t => t.id));
      const availableTracks = allTracks.filter(t => !queuedIds.has(t.id) && t.id !== currentTrack.id);

      if (availableTracks.length === 0) return;

      const smartQueue: Track[] = [];

      const sameArtist = shuffleArray(
        availableTracks.filter(t => t.artist === currentTrack.artist)
      ).slice(0, 8);
      smartQueue.push(...sameArtist);

      const usedIds = new Set(smartQueue.map(t => t.id));

      if (currentTrack.genre) {
        const sameGenre = shuffleArray(
          availableTracks.filter(t =>
            t.genre === currentTrack.genre &&
            !usedIds.has(t.id)
          )
        ).slice(0, 8);
        smartQueue.push(...sameGenre);
        sameGenre.forEach(t => usedIds.add(t.id));
      }

      if (currentTrack.album) {
        const sameAlbum = shuffleArray(
          availableTracks.filter(t =>
            t.album === currentTrack.album &&
            !usedIds.has(t.id)
          )
        ).slice(0, 4);
        smartQueue.push(...sameAlbum);
      }

      if (smartQueue.length < 10) {
        const remaining = shuffleArray(
          availableTracks.filter(t => !usedIds.has(t.id))
        ).slice(0, 10 - smartQueue.length);
        smartQueue.push(...remaining);
      }

      if (smartQueue.length > 0) {
        set({ queue: [...queue, ...smartQueue] });
      }
    },

    startRadio: async (seedTrack: Track) => {
      const { play } = get();

      try {
        // Generate radio playlist via backend API
        const playlist = await playlistsApi.generateRadio(seedTrack.id, 40);

        // Extract tracks from playlist response
        const radioQueue = playlist.tracks || [];

        if (radioQueue.length === 0) {
          console.error('Radio playlist generated with no tracks');
          return;
        }

        set({
          isRadioMode: true,
          radioSeedTrack: seedTrack,
          radioPlaylistId: playlist.id,
          queue: radioQueue,
          originalQueue: radioQueue,
          queueIndex: 0
        });

        // Start playing the first track (seed track)
        play(radioQueue[0]);

        // Trigger library refresh to show the new playlist in sidebar
        // This is done by dispatching a custom event that libraryStore can listen to
        window.dispatchEvent(new CustomEvent('radio-playlist-created'));
      } catch (error) {
        console.error('Failed to generate radio playlist:', error);
        // Fallback to local generation if backend fails
        const { allTracks } = get();
        if (allTracks.length === 0) return;

        const availableTracks = allTracks.filter(t => t.id !== seedTrack.id);
        const radioQueue: Track[] = [seedTrack];

        const sameArtist = shuffleArray(
          availableTracks.filter(t => t.artist === seedTrack.artist)
        ).slice(0, 10);
        radioQueue.push(...sameArtist);

        const usedIds = new Set(radioQueue.map(t => t.id));

        if (seedTrack.genre) {
          const sameGenre = shuffleArray(
            availableTracks.filter(t =>
              t.genre === seedTrack.genre &&
              !usedIds.has(t.id)
            )
          ).slice(0, 15);
          radioQueue.push(...sameGenre);
          sameGenre.forEach(t => usedIds.add(t.id));
        }

        if (seedTrack.album) {
          const sameAlbum = shuffleArray(
            availableTracks.filter(t =>
              t.album === seedTrack.album &&
              !usedIds.has(t.id)
            )
          ).slice(0, 5);
          radioQueue.push(...sameAlbum);
        }

        set({
          isRadioMode: true,
          radioSeedTrack: seedTrack,
          radioPlaylistId: null,
          queue: radioQueue,
          originalQueue: radioQueue,
          queueIndex: 0
        });

        play(seedTrack);
      }
    },

    stopRadio: () => {
      const audio = get().audioElement;
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      set({
        isRadioMode: false,
        radioSeedTrack: null,
        radioPlaylistId: null,
        currentRadioStation: null,
        isPlaying: false
      });
    },

    toggleNormalization: () => {
      set((state) => ({ normalizationEnabled: !state.normalizationEnabled }));
    },

    toggleLimiter: () => {
      set((state) => ({ limiterEnabled: !state.limiterEnabled }));
    },

    setLimiterCeiling: (ceiling: number) => {
      set({ limiterCeiling: ceiling });
    },

    setTargetLufs: (lufs: number) => {
      set({ targetLufs: lufs });
    },

    saveState: async () => {
      const { currentTrack, currentTime, volume, shuffleEnabled, repeatMode } = get();
      
      try {
        await playerApi.saveState({
          current_track_id: currentTrack?.id ?? null,
          position_ms: Math.floor(currentTime * 1000),
          volume,
          shuffle_enabled: shuffleEnabled,
          repeat_mode: repeatMode,
        });
      } catch (error) {
        console.error('Failed to save player state:', error);
      }
    },

    loadState: async () => {
      try {
        const state = await playerApi.getState();

        set({
          volume: state.volume,
          shuffleEnabled: state.shuffle_enabled,
          repeatMode: state.repeat_mode as RepeatMode,
        });

        if (state.current_track_id) {
          const track = await tracksApi.get(state.current_track_id);
          const savedTime = state.position_ms / 1000;
          set({
            currentTrack: track,
            currentTime: savedTime,
            pendingSeekTime: savedTime > 0 ? savedTime : null
          });
        }
      } catch (error) {
        console.error('Failed to load player state:', error);
      }
    },
  }),
      {
        name: 'player-storage',
        partialize: (state) => ({
          queue: state.queue,
          queueIndex: state.queueIndex,
          originalQueue: state.originalQueue,
          currentTrack: state.currentTrack,
          currentTime: state.currentTime,
          volume: state.volume,
          shuffleEnabled: state.shuffleEnabled,
          repeatMode: state.repeatMode,
          isRadioMode: state.isRadioMode,
          radioSeedTrack: state.radioSeedTrack,
          radioPlaylistId: state.radioPlaylistId,
          normalizationEnabled: state.normalizationEnabled,
          limiterEnabled: state.limiterEnabled,
          limiterCeiling: state.limiterCeiling,
          targetLufs: state.targetLufs,
        }),
      }
    )
  )
);
