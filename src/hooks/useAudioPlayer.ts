import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../stores/playerStore';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
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
  } = usePlayerStore();

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
    setAudioElement(audio);

    const initAudioContext = () => {
      if (audioContextRef.current) return;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaElementSource(audio);
      sourceNodeRef.current = source;
      
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      compressorRef.current = compressor;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.4;
      gainNodeRef.current = gainNode;
      
      source.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(audioContext.destination);
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

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (compressorRef.current && gainNodeRef.current && sourceNodeRef.current && audioContextRef.current) {
      if (normalizationEnabled) {
        compressorRef.current.threshold.value = -24;
        compressorRef.current.ratio.value = 12;
        gainNodeRef.current.gain.value = 1.4;
      } else {
        compressorRef.current.threshold.value = 0;
        compressorRef.current.ratio.value = 1;
        gainNodeRef.current.gain.value = 1.0;
      }
    }
  }, [normalizationEnabled]);

  return audioRef;
}
