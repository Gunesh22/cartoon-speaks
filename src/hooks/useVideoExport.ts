import { useState, useRef, useCallback } from 'react';
import { ExportProgress, ExportSettings } from '../types/export';
import { Character } from '../types/character';
import { MouthAsset } from '../types/mouth';
import { AnimationTimeline } from '../types/timeline';
import { exportService } from '../services/export/exportService';

export function useVideoExport() {
  const [progress, setProgress] = useState<ExportProgress>({
    status: 'idle',
    renderedFrames: 0,
    totalFrames: 0,
    percentage: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startExport = useCallback(async (params: {
    exportSettings: ExportSettings;
    character: Character;
    characterImg: CanvasImageSource;
    mouthAssets: Map<string, { img: CanvasImageSource; asset: MouthAsset }>;
    timeline: AnimationTimeline;
    bgImage?: CanvasImageSource | null;
    audioBlob?: Blob | null;
  }): Promise<Blob | null> => {
    abortControllerRef.current = new AbortController();

    setProgress({
      status: 'rendering',
      renderedFrames: 0,
      totalFrames: 100,
      percentage: 0,
    });

    try {
      const outputBlob = await exportService.exportVideo({
        ...params,
        onProgress: setProgress,
        signal: abortControllerRef.current.signal,
      });
      return outputBlob;
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        setProgress({
          status: 'cancelled',
          renderedFrames: 0,
          totalFrames: 0,
          percentage: 0,
        });
      } else {
        setProgress({
          status: 'error',
          renderedFrames: 0,
          totalFrames: 0,
          percentage: 0,
          errorMessage: err instanceof Error ? err.message : 'Unknown export error',
        });
      }
      return null;
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  const cancelExport = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const resetExport = useCallback(() => {
    setProgress({
      status: 'idle',
      renderedFrames: 0,
      totalFrames: 0,
      percentage: 0,
    });
  }, []);

  return {
    progress,
    startExport,
    cancelExport,
    resetExport,
  };
}
