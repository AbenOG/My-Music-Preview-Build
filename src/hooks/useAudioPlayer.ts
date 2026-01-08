import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { tracksApi } from '../api/tracks';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const lastLoggedTrackIdRef = useRef<number | null>(null);  // Track play logging

  // Audio processing chain nodes
  const normalizationGainRef = useRef<GainNode | null>(null);  // Per-track loudness gain
  const limiterRef = useRef<DynamicsCompressorNode | null>(null);  // Brick-wall limiter
  const outputGainRef = useRef<GainNode | null>(null);  // Master volume

  const {
    setAudioElement,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setIsLoading,
    handleTrackEnd,
    volume,
    isMuted,
    normalizationEnabled,
    limiterEnabled,
    limiterCeiling,
    currentTrack,
  } = usePlayerStore();

  // Initialize audio context and processing chain
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';  // Preload audio data for faster playback
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
    setAudioElement(audio);

    const initAudioContext = () => {
      if (audioContextRef.current) return;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Create source from audio element
      const source = audioContext.createMediaElementSource(audio);
      sourceNodeRef.current = source;

      // Normalization gain node (applies per-track loudness correction)
      const normalizationGain = audioContext.createGain();
      normalizationGain.gain.value = 1.0;
      normalizationGainRef.current = normalizationGain;

      // Brick-wall limiter using DynamicsCompressor
      // Configured as a hard limiter with fast attack
      const limiter = audioContext.createDynamicsCompressor();
      limiter.threshold.value = -1;  // -1 dB ceiling
      limiter.knee.value = 0;        // Hard knee for brick-wall
      limiter.ratio.value = 20;      // Maximum available ratio
      limiter.attack.value = 0.001;  // 1ms attack (instant)
      limiter.release.value = 0.1;   // 100ms release
      limiterRef.current = limiter;

      // Output gain node (master volume, controlled by audio element)
      const outputGain = audioContext.createGain();
      outputGain.gain.value = 1.0;
      outputGainRef.current = outputGain;

      // Connect the chain: Source → NormalizationGain → Limiter → OutputGain → Destination
      source.connect(normalizationGain);
      normalizationGain.connect(limiter);
      limiter.connect(outputGain);
      outputGain.connect(audioContext.destination);
    };

    const handleFirstInteraction = () => {
      initAudioContext();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      // Log play when audio actually starts (deferred from play button press)
      const trackId = usePlayerStore.getState().currentTrack?.id;
      if (trackId && trackId !== lastLoggedTrackIdRef.current) {
        lastLoggedTrackIdRef.current = trackId;
        tracksApi.logPlay(trackId).catch(console.error);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      handleTrackEnd();
    };

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setIsLoading(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
      audio.src = '';
      setAudioElement(null);

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Apply per-track normalization gain when track changes
  useEffect(() => {
    if (!normalizationGainRef.current || !audioContextRef.current) return;

    const gainNode = normalizationGainRef.current;
    const currentTime = audioContextRef.current.currentTime;

    if (normalizationEnabled && currentTrack?.loudness_gain != null) {
      // Convert dB gain to linear gain
      const linearGain = Math.pow(10, currentTrack.loudness_gain / 20);
      // Clamp to reasonable range (0.1 to 4.0, which is ~-20dB to +12dB)
      const clampedGain = Math.max(0.1, Math.min(4.0, linearGain));

      // Smooth transition to prevent clicks (50ms ramp)
      gainNode.gain.cancelScheduledValues(currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
      gainNode.gain.linearRampToValueAtTime(clampedGain, currentTime + 0.05);
    } else {
      // No normalization - unity gain with smooth transition
      gainNode.gain.cancelScheduledValues(currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
      gainNode.gain.linearRampToValueAtTime(1.0, currentTime + 0.05);
    }
  }, [currentTrack, normalizationEnabled]);

  // Update limiter settings
  useEffect(() => {
    if (!limiterRef.current) return;

    const limiter = limiterRef.current;

    if (limiterEnabled) {
      // Apply brick-wall limiter with user-configured ceiling
      limiter.threshold.value = limiterCeiling;
      limiter.knee.value = 0;       // Hard knee
      limiter.ratio.value = 20;     // Maximum ratio for brick-wall
      limiter.attack.value = 0.001; // 1ms attack
      limiter.release.value = 0.1;  // 100ms release
    } else {
      // Disable limiter by setting threshold above 0dB
      limiter.threshold.value = 0;
      limiter.knee.value = 40;
      limiter.ratio.value = 1;  // No compression
    }
  }, [limiterEnabled, limiterCeiling]);

  return audioRef;
}
