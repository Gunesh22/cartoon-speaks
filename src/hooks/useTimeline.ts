import { useState, useCallback } from 'react';
import { TimelineCue } from '../types/timeline';
import { generateId } from '../utils/ids';
import { sanitizeCues, modifyCueTiming } from '../services/lipsync/cueParser';

export function useTimeline(initialDuration: number = 5.0) {
  const [cues, setCues] = useState<TimelineCue[]>([]);
  const [duration, setDuration] = useState<number>(initialDuration);
  const [zoom, setZoom] = useState<number>(100); // pixels per second
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);

  const loadCues = useCallback((newCues: TimelineCue[], newDuration?: number) => {
    setCues(sanitizeCues(newCues));
    if (newDuration && newDuration > 0) {
      setDuration(newDuration);
    }
  }, []);

  const updateCue = useCallback((cueId: string, updates: Partial<TimelineCue>) => {
    setCues((prev) => {
      const updated = prev.map((c) => (c.id === cueId ? { ...c, ...updates } : c));
      return sanitizeCues(updated);
    });
  }, []);

  const updateCueTiming = useCallback(
    (cueId: string, newStart?: number, newEnd?: number) => {
      setCues((prev) => modifyCueTiming(prev, cueId, newStart, newEnd, duration));
    },
    [duration]
  );

  const adjustCueDuration = useCallback(
    (cueId: string, deltaSeconds: number) => {
      setCues((prev) => {
        const target = prev.find((c) => c.id === cueId);
        if (!target) return prev;
        const curDur = target.end - target.start;
        const targetDur = Math.max(0.04, curDur + deltaSeconds);
        const newEnd = target.start + targetDur;
        return modifyCueTiming(prev, cueId, undefined, newEnd, duration);
      });
    },
    [duration]
  );

  const setCueDuration = useCallback(
    (cueId: string, durationSeconds: number) => {
      setCues((prev) => {
        const target = prev.find((c) => c.id === cueId);
        if (!target) return prev;
        const targetDur = Math.max(0.04, durationSeconds);
        const newEnd = target.start + targetDur;
        return modifyCueTiming(prev, cueId, undefined, newEnd, duration);
      });
    },
    [duration]
  );

  const addCue = useCallback((start: number, end: number, shape: string) => {
    const newCue: TimelineCue = {
      id: generateId('cue'),
      start,
      end,
      shape,
    };
    setCues((prev) => sanitizeCues([...prev, newCue]));
    setSelectedCueId(newCue.id);
  }, []);

  const deleteCue = useCallback((cueId: string) => {
    setCues((prev) => prev.filter((c) => c.id !== cueId));
    setSelectedCueId(null);
  }, []);

  const setCueShape = useCallback((cueId: string, shape: string) => {
    updateCue(cueId, { shape });
  }, [updateCue]);

  return {
    cues,
    duration,
    zoom,
    selectedCueId,
    setZoom,
    setSelectedCueId,
    loadCues,
    updateCue,
    updateCueTiming,
    adjustCueDuration,
    setCueDuration,
    addCue,
    deleteCue,
    setCueShape,
    setDuration,
  };
}
