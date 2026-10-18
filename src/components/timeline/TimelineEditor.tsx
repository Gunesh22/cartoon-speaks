import React, { useMemo, useCallback } from 'react';
import { TimelineCue } from '../../types/timeline';
import { TimelineControls } from './TimelineControls';
import { TimelineTrack } from './TimelineTrack';
import { WaveformData } from '../../services/audio/audioService';
import { validateTimelineCues } from '../../services/lipsync/phoneticAligner';

export interface TimelineEditorProps {
  duration: number;
  currentTime: number;
  zoom: number;
  cues: TimelineCue[];
  selectedCueId: string | null;
  waveformData?: WaveformData | null;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onRewind?: () => void;
  onZoomChange: (newZoom: number) => void;
  onSelectCue: (id: string) => void;
  onUpdateCueShape: (id: string, shape: string) => void;
  onUpdateCueTiming: (id: string, start?: number, end?: number) => void;
  onAdjustDuration?: (id: string, deltaSeconds: number) => void;
  onSetDuration?: (id: string, durationSeconds: number) => void;
  onTimingChangeEnd?: () => void;
  onDeleteSelectedCue: () => void;
  onAddCueAtPlayhead: (shape?: string) => void;
  onSeek: (time: number) => void;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  duration,
  currentTime,
  zoom,
  cues,
  selectedCueId,
  waveformData,
  isPlaying,
  onTogglePlay,
  onRewind,
  onZoomChange,
  onSelectCue,
  onUpdateCueShape,
  onUpdateCueTiming,
  onAdjustDuration,
  onSetDuration,
  onTimingChangeEnd,
  onDeleteSelectedCue,
  onAddCueAtPlayhead,
  onSeek,
}) => {
  const selectedCue = cues.find((c) => c.id === selectedCueId);
  const selectedCueDuration = selectedCue ? Math.max(0.04, selectedCue.end - selectedCue.start) : undefined;

  // Validate cues in real-time for visual warnings (>500ms holds, negative duration, overlaps, out of bounds)
  const warnings = useMemo(() => {
    return validateTimelineCues(cues, duration);
  }, [cues, duration]);

  const warningsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of warnings) {
      if (!map.has(w.cueId)) {
        map.set(w.cueId, w.message);
      }
    }
    return map;
  }, [warnings]);

  const handleSelectFirstWarningCue = useCallback(() => {
    if (warnings.length > 0) {
      onSelectCue(warnings[0].cueId);
    }
  }, [warnings, onSelectCue]);

  return (
    <div className="space-y-1.5">
      <TimelineControls
        zoom={zoom}
        onZoomChange={onZoomChange}
        selectedCueId={selectedCueId}
        selectedCueShape={selectedCue?.shape}
        selectedCueDuration={selectedCueDuration}
        warningCount={warnings.length}
        onSelectWarningCue={handleSelectFirstWarningCue}
        onUpdateSelectedShape={(shape) => {
          if (selectedCueId) onUpdateCueShape(selectedCueId, shape);
        }}
        onAdjustDuration={(delta) => {
          if (!selectedCueId || !selectedCue) return;
          if (onAdjustDuration) {
            onAdjustDuration(selectedCueId, delta);
          } else {
            onUpdateCueTiming(selectedCueId, undefined, selectedCue.end + delta);
          }
        }}
        onSetDuration={(dur) => {
          if (!selectedCueId || !selectedCue) return;
          if (onSetDuration) {
            onSetDuration(selectedCueId, dur);
          } else {
            onUpdateCueTiming(selectedCueId, undefined, selectedCue.start + dur);
          }
        }}
        onDeleteSelectedCue={onDeleteSelectedCue}
        onAddCueAtPlayhead={onAddCueAtPlayhead}
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay}
        onRewind={onRewind}
        currentTime={currentTime}
        duration={duration}
      />

      <TimelineTrack
        duration={duration}
        currentTime={currentTime}
        zoom={zoom}
        cues={cues}
        selectedCueId={selectedCueId}
        waveformData={waveformData}
        warningsMap={warningsMap}
        onSelectCue={onSelectCue}
        onSeek={onSeek}
        onUpdateCueTiming={onUpdateCueTiming}
        onTimingChangeEnd={onTimingChangeEnd}
      />
    </div>
  );
};
