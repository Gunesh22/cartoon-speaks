import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Repeat, Sparkles, X } from 'lucide-react';
import { TimelineCue } from '../../types/timeline';
import { STANDARD_RHUBARB_SHAPES } from '../../types/mouth';
import { getActiveCueAtTime } from '../../services/animation/mouthPlacement';
import { WaveformData } from '../../services/audio/audioService';

export interface LipSyncDiagnosticsPanelProps {
  currentTime: number;
  duration: number;
  cues: TimelineCue[];
  isPlaying: boolean;
  waveformData?: WaveformData | null;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onClose?: () => void;
}

export const LipSyncDiagnosticsPanel: React.FC<LipSyncDiagnosticsPanelProps> = ({
  currentTime,
  duration,
  cues,
  isPlaying,
  waveformData,
  onSeek,
  onTogglePlay,
  onClose,
}) => {
  // A-B looping state
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [isLoopingAB, setIsLoopingAB] = useState(false);

  // Mini canvas waveform ref
  const waveformRef = useRef<HTMLCanvasElement>(null);

  // Active cue and next cue
  const activeCue = getActiveCueAtTime(cues, currentTime);
  const activeCueIndex = activeCue ? cues.findIndex((c) => c.id === activeCue.id) : -1;
  const nextCue = activeCueIndex >= 0 && activeCueIndex < cues.length - 1 ? cues[activeCueIndex + 1] : null;

  const shapeInfo = STANDARD_RHUBARB_SHAPES.find((s) => s.label === activeCue?.shape);

  // Time until next cue
  const msUntilNext = nextCue && activeCue ? Math.max(0, Math.round((nextCue.start - currentTime) * 1000)) : null;

  // Frame calculation (60 FPS and 30 FPS)
  const frame60 = Math.floor(currentTime * 60);
  const totalFrames60 = Math.floor(duration * 60);
  const frame30 = Math.floor(currentTime * 30);
  const totalFrames30 = Math.floor(duration * 30);

  // Enforce A-B loop during playback
  useEffect(() => {
    if (isLoopingAB && loopA !== null && loopB !== null && loopB > loopA) {
      if (currentTime >= loopB) {
        onSeek(loopA);
      }
    }
  }, [currentTime, isLoopingAB, loopA, loopB, onSeek]);

  // Frame stepping helpers
  const stepFrames = (frameCount: number) => {
    const frameDuration = 1 / 60; // 16.66ms per frame
    const newTime = Math.max(0, Math.min(duration, currentTime + frameCount * frameDuration));
    onSeek(parseFloat(newTime.toFixed(3)));
  };

  // Set Loop to Current Cue with 80ms padding
  const setLoopToActiveCue = () => {
    if (!activeCue) return;
    const start = Math.max(0, activeCue.start - 0.08);
    const end = Math.min(duration, activeCue.end + 0.08);
    setLoopA(parseFloat(start.toFixed(3)));
    setLoopB(parseFloat(end.toFixed(3)));
    setIsLoopingAB(true);
    onSeek(start);
  };

  // Draw mini waveform with cues and A-B region
  useEffect(() => {
    const canvas = waveformRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 1. Draw Waveform peaks
    if (waveformData && duration > 0) {
      const { peaks } = waveformData;
      const numPairs = peaks.length / 2;
      const midY = h / 2;
      ctx.fillStyle = '#cbd5e1';

      for (let i = 0; i < numPairs; i++) {
        const min = peaks[i * 2];
        const max = peaks[i * 2 + 1];
        const x = (i / numPairs) * w;
        const top = midY - max * midY * 0.9;
        const bottom = midY - min * midY * 0.9;
        ctx.fillRect(x, top, Math.max(1, w / numPairs - 0.5), Math.max(1, bottom - top));
      }
    }

    // 2. Draw Cue overlays
    if (duration > 0) {
      for (const cue of cues) {
        const xStart = (cue.start / duration) * w;
        const xEnd = (cue.end / duration) * w;
        const cueWidth = Math.max(1, xEnd - xStart);

        if (activeCue && cue.id === activeCue.id) {
          ctx.fillStyle = 'rgba(99, 102, 241, 0.45)'; // Indigo highlight for active cue
          ctx.fillRect(xStart, 0, cueWidth, h);
        }

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.strokeRect(xStart, 0, cueWidth, h);
      }
    }

    // 3. Draw Loop A-B region
    if (loopA !== null && loopB !== null && duration > 0) {
      const ax = (loopA / duration) * w;
      const bx = (loopB / duration) * w;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.fillRect(ax, 0, bx - ax, h);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ax, 0);
      ctx.lineTo(ax, h);
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx, h);
      ctx.stroke();
    }

    // 4. Playhead
    if (duration > 0) {
      const px = (currentTime / duration) * w;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
    }
  }, [waveformData, duration, cues, currentTime, activeCue, loopA, loopB]);

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl p-3 border border-slate-700 shadow-md text-xs space-y-2.5 w-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isPlaying ? 'bg-emerald-400' : 'bg-slate-500'} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          </span>
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Lip-Sync Diagnostics & Frame Stepper
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400">
            Clock: {currentTime.toFixed(3)}s / {duration.toFixed(3)}s
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              title="Close Diagnostics"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Box 1: Time & Frames */}
        <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Timeline Clock</span>
          <div className="font-mono text-base font-bold text-white mt-0.5">
            {currentTime.toFixed(3)}<span className="text-xs text-slate-400 font-normal">s</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            60fps: <span className="text-indigo-300 font-bold">{frame60}</span>/{totalFrames60} • 30fps: <span className="text-slate-300">{frame30}</span>/{totalFrames30}
          </div>
        </div>

        {/* Box 2: Active Mouth Cue */}
        <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Active Cue</span>
            {activeCue?.source && (
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  activeCue.source === 'rhubarb'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : activeCue.source === 'manual'
                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                    : 'bg-sky-950 text-sky-300 border border-sky-800'
                }`}
                title={`Cue Source: ${activeCue.source}`}
              >
                {activeCue.source === 'rhubarb' ? 'Rhubarb Acoustic' : activeCue.source}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-black text-indigo-400">{activeCue?.shape || 'X'}</span>
            <span className="text-[11px] font-medium text-slate-300 truncate">
              {shapeInfo?.name || (activeCue?.shape === 'X' ? 'Rest / Silence' : 'Custom')}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {activeCue
              ? `${activeCue.start.toFixed(2)}s - ${activeCue.end.toFixed(2)}s (${Math.round((activeCue.end - activeCue.start) * 1000)}ms)`
              : 'No active cue'}
          </div>
        </div>

        {/* Box 3: Word / Sound Association */}
        <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Spoken Segment</span>
          <div className="font-semibold text-slate-200 text-sm mt-0.5 truncate">
            {activeCue?.text ? `"${activeCue.text}"` : activeCue?.shape === 'X' ? '— (Pause) —' : 'Vocalized'}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {activeCue?.shape === 'A'
              ? 'Lips closed (M, B, P)'
              : activeCue?.shape === 'F'
              ? 'Teeth on lip (F, V)'
              : activeCue?.shape === 'B'
              ? 'Dental stop (T, D, S)'
              : activeCue?.shape === 'O'
              ? 'Rounded lips (W, OO)'
              : activeCue?.shape === 'D'
              ? 'Wide open vowel (AA)'
              : 'Articulatory shape'}
          </div>
        </div>

        {/* Box 4: Upcoming Cue */}
        <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Next Cue</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base font-bold text-slate-300">{nextCue ? nextCue.shape : 'End'}</span>
            {msUntilNext !== null && (
              <span className="text-[11px] font-mono text-amber-300">
                in {msUntilNext}ms
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {nextCue ? `Starts at ${nextCue.start.toFixed(2)}s` : 'Timeline end reached'}
          </div>
        </div>
      </div>

      {/* Mini Visual Waveform Strip */}
      <div className="relative h-10 w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
        <canvas
          ref={waveformRef}
          width={640}
          height={40}
          className="w-full h-full object-fill cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = clickX / rect.width;
            onSeek(ratio * duration);
          }}
          title="Click to seek playhead"
        />
      </div>

      {/* Stepping & Looping Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
        {/* Left: Playback & Frame Steppers */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onTogglePlay}
            className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 transition-colors ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => onSeek(0)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            title="Rewind to start (0.0s)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <span className="h-4 w-px bg-slate-700 mx-0.5" />

          {/* Steppers */}
          <button
            onClick={() => stepFrames(-5)}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
            title="Step back 5 frames (83ms)"
          >
            <ChevronsLeft className="w-3 h-3" />
            <span>-5f</span>
          </button>

          <button
            onClick={() => stepFrames(-1)}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
            title="Step back 1 frame (16.6ms)"
          >
            <ChevronLeft className="w-3 h-3" />
            <span>-1f</span>
          </button>

          <button
            onClick={() => stepFrames(1)}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
            title="Step forward 1 frame (16.6ms)"
          >
            <span>+1f</span>
            <ChevronRight className="w-3 h-3" />
          </button>

          <button
            onClick={() => stepFrames(5)}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
            title="Step forward 5 frames (83ms)"
          >
            <span>+5f</span>
            <ChevronsRight className="w-3 h-3" />
          </button>
        </div>

        {/* Right: A-B Segment Looping */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Repeat className="w-3 h-3 text-amber-400" />
            A-B Loop:
          </span>

          <button
            onClick={() => setLoopA(parseFloat(currentTime.toFixed(3)))}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
              loopA !== null ? 'bg-amber-900/60 text-amber-300 border border-amber-600/60' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title="Set Loop Start Point A at current playback time"
          >
            A: {loopA !== null ? `${loopA.toFixed(2)}s` : 'Set'}
          </button>

          <button
            onClick={() => setLoopB(parseFloat(currentTime.toFixed(3)))}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
              loopB !== null ? 'bg-amber-900/60 text-amber-300 border border-amber-600/60' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title="Set Loop End Point B at current playback time"
          >
            B: {loopB !== null ? `${loopB.toFixed(2)}s` : 'Set'}
          </button>

          <button
            onClick={() => setIsLoopingAB(!isLoopingAB)}
            disabled={loopA === null || loopB === null || loopB <= loopA}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
              isLoopingAB
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-1 ring-amber-300'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-40 disabled:pointer-events-none'
            }`}
            title={isLoopingAB ? 'Disable A-B Loop' : 'Enable A-B Loop'}
          >
            {isLoopingAB ? 'Looping ON' : 'Loop'}
          </button>

          {activeCue && (
            <button
              onClick={setLoopToActiveCue}
              className="px-1.5 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700 text-[10px] font-medium"
              title="Automatically set A-B loop to test current word/cue"
            >
              Loop Cue
            </button>
          )}

          {(loopA !== null || loopB !== null) && (
            <button
              onClick={() => {
                setLoopA(null);
                setLoopB(null);
                setIsLoopingAB(false);
              }}
              className="text-[10px] text-slate-400 hover:text-rose-400 px-1"
              title="Clear A-B loop points"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
