import React, { useRef, useEffect } from 'react';
import { TimelineCue } from '../../types/timeline';
import { TimelineCueComponent } from './TimelineCue';
import { Playhead } from './Playhead';
import { WaveformData } from '../../services/audio/audioService';

export interface TimelineTrackProps {
  duration: number;
  currentTime: number;
  zoom: number; // px per second
  cues: TimelineCue[];
  selectedCueId: string | null;
  waveformData?: WaveformData | null;
  warningsMap?: Map<string, string>;
  onSelectCue: (id: string) => void;
  onSeek: (time: number) => void;
  onUpdateCueTiming?: (id: string, start?: number, end?: number) => void;
  onTimingChangeEnd?: () => void;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
  duration,
  currentTime,
  zoom,
  cues,
  selectedCueId,
  waveformData,
  warningsMap,
  onSelectCue,
  onSeek,
  onUpdateCueTiming,
  onTimingChangeEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);

  const totalWidth = Math.max(800, duration * zoom + 100);

  // Draw Waveform
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !waveformData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = totalWidth;
    canvas.height = 40;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { peaks } = waveformData;
    const numPairs = peaks.length / 2;
    const midY = canvas.height / 2;

    ctx.fillStyle = '#cbd5e1';

    for (let i = 0; i < numPairs; i++) {
      const min = peaks[i * 2];
      const max = peaks[i * 2 + 1];
      const x = (i / numPairs) * (duration * zoom);
      const top = midY - max * midY * 0.9;
      const bottom = midY - min * midY * 0.9;
      const barHeight = Math.max(1, bottom - top);

      ctx.fillRect(x, top, Math.max(1, (duration * zoom) / numPairs - 0.5), barHeight);
    }
  }, [waveformData, totalWidth, duration, zoom]);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const clickX = e.clientX - rect.left + scrollLeft;
    const newTime = Math.max(0, Math.min(duration, clickX / zoom));
    onSeek(newTime);
  };

  // Generate ruler markers
  const secondMarkers: number[] = [];
  const step = zoom > 120 ? 0.5 : 1.0;
  for (let t = 0; t <= duration; t += step) {
    secondMarkers.push(t);
  }

  return (
    <div
      ref={containerRef}
      onClick={handleTrackClick}
      className="relative w-full overflow-x-auto bg-slate-50 border border-slate-200 rounded-xl select-none"
    >
      <div style={{ width: `${totalWidth}px` }} className="relative h-28 cursor-pointer">
        {/* Playhead */}
        <Playhead currentTime={currentTime} zoom={zoom} height={112} />

        {/* 1. Time Ruler Lane */}
        <div className="h-6 border-b border-slate-200 bg-white relative">
          {secondMarkers.map((sec) => (
            <div
              key={sec}
              style={{ left: `${sec * zoom}px` }}
              className="absolute top-0 bottom-0 flex flex-col items-start pointer-events-none"
            >
              <div className="w-px h-2 bg-slate-300" />
              {Number.isInteger(sec) && (
                <span className="text-[10px] text-slate-400 font-mono -ml-2 select-none">
                  {sec}s
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 2. Audio Waveform Lane */}
        <div className="h-10 border-b border-slate-100 bg-slate-50/60 relative overflow-hidden">
          <canvas ref={waveformCanvasRef} className="absolute inset-0 pointer-events-none" />
        </div>

        {/* 3. Cues Lane */}
        <div className="h-12 relative bg-white">
          {cues.map((cue) => (
            <TimelineCueComponent
              key={cue.id}
              cue={cue}
              zoom={zoom}
              isSelected={cue.id === selectedCueId}
              warning={warningsMap?.get(cue.id)}
              onSelect={() => onSelectCue(cue.id)}
              onResizeLeft={(newStart) => onUpdateCueTiming?.(cue.id, newStart, undefined)}
              onResizeRight={(newEnd) => onUpdateCueTiming?.(cue.id, undefined, newEnd)}
              onResizeEnd={onTimingChangeEnd}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
