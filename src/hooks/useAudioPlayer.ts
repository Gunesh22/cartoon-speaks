import { useState, useEffect, useCallback, useRef } from 'react';
import { audioService } from '../services/audio/audioService';

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const rafRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    const loop = () => {
      const t = audioService.getCurrentTime();
      const d = audioService.getDuration();
      setCurrentTime(t);

      if (d > 0 && t >= d - 0.05) {
        setIsPlaying(false);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        setCurrentTime(d);
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const stopTracking = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const loadAudio = useCallback(async (blob: Blob) => {
    const info = await audioService.loadAudioBlob(blob);
    setDuration(info.duration);
    setCurrentTime(0);
    setIsPlaying(false);
    return info;
  }, []);

  const play = useCallback(async () => {
    const d = audioService.getDuration();
    const curr = audioService.getCurrentTime();
    // If playback reached the end, rewind to start and play again
    if (d > 0 && curr >= d - 0.05) {
      audioService.seek(0);
      setCurrentTime(0);
    }
    await audioService.play();
    setIsPlaying(true);
    startTracking();
  }, [startTracking]);

  const pause = useCallback(() => {
    audioService.pause();
    setIsPlaying(false);
    stopTracking();
    setCurrentTime(audioService.getCurrentTime());
  }, [stopTracking]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const seek = useCallback((time: number) => {
    audioService.seek(time);
    setCurrentTime(time);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    audioService.setMuted(next);
  }, [isMuted]);

  useEffect(() => {
    const unsubscribe = audioService.onEnded(() => {
      setIsPlaying(false);
      stopTracking();
      setCurrentTime(audioService.getDuration());
    });

    return () => {
      unsubscribe();
      stopTracking();
    };
  }, [stopTracking]);

  return {
    isPlaying,
    currentTime,
    duration,
    isMuted,
    loadAudio,
    play,
    pause,
    togglePlay,
    seek,
    toggleMute,
  };
}
