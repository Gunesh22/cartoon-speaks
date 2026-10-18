import React from 'react';
import { ZoomIn, ZoomOut, Plus, Trash2, Play, Pause, RotateCcw } from 'lucide-react';
import { STANDARD_RHUBARB_SHAPES } from '../../types/mouth';

export interface TimelineControlsProps {
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  selectedCueId: string | null;
  selectedCueShape?: string;
  selectedCueDuration?: number;
  warningCount?: number;
  onSelectWarningCue?: () => void;
  onUpdateSelectedShape?: (newShape: string) => void;
  onAdjustDuration?: (deltaSeconds: number) => void;
  onSetDuration?: (durationSeconds: number) => void;
  onDeleteSelectedCue?: () => void;
  onAddCueAtPlayhead?: (shape?: string) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onRewind?: () => void;
  currentTime?: number;
  duration?: number;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  zoom,
  onZoomChange,
  selectedCueId,
  selectedCueShape,
  selectedCueDuration,
  warningCount,
  onSelectWarningCue,
  onUpdateSelectedShape,
  onAdjustDuration,
  onSetDuration,
  onDeleteSelectedCue,
  onAddCueAtPlayhead,
  isPlaying = false,
  onTogglePlay,
  onRewind,
  currentTime = 0,
  duration = 5,
}) => {
  const isAtEnd = duration > 0 && currentTime >= duration - 0.05;

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 p-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs shrink-0">
      {/* Left: Optional Mini Transport + Selected Cue Editor */}
      <div className="flex items-center gap-2">
        {onTogglePlay && (
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title={isPlaying ? 'Pause' : isAtEnd ? 'Play Again' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            <span>{isPlaying ? 'Pause' : isAtEnd ? 'Play Again' : 'Play'}</span>
          </button>
        )}

        {onRewind && (
          <button
            onClick={onRewind}
            className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
            title="Rewind (0.0s)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}

        <span className="font-mono text-[11px] font-semibold text-slate-600">
          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </span>

        <span className="h-3.5 w-px bg-slate-200" />

        {/* Selected Cue Editor */}
        {selectedCueId && onUpdateSelectedShape ? (
          <div className="flex items-center gap-1.5 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100">
            <span className="text-[11px] font-semibold text-indigo-900">Cue:</span>
            <select
              value={selectedCueShape || ''}
              onChange={(e) => onUpdateSelectedShape(e.target.value)}
              className="text-[11px] font-bold bg-white border border-indigo-200 text-indigo-700 rounded px-1.5 py-0.5 focus:outline-none"
            >
              {STANDARD_RHUBARB_SHAPES.map((s) => (
                <option key={s.label} value={s.label}>
                  {s.label} ({s.name})
                </option>
              ))}
            </select>

            {/* Duration increase / decrease buttons and numeric input */}
            {selectedCueDuration !== undefined && (
              <div className="flex items-center gap-1 pl-1.5 border-l border-indigo-200">
                <span className="text-[10px] font-semibold text-indigo-900 uppercase">Dur:</span>
                <button
                  type="button"
                  onClick={() => onAdjustDuration?.(-0.05)}
                  className="w-4 h-4 flex items-center justify-center font-bold text-slate-700 bg-white hover:bg-indigo-100 border border-indigo-200 rounded text-[11px] leading-none transition-colors"
                  title="Decrease mouth duration (-0.05s)"
                >
                  -
                </button>
                <div className="flex items-center bg-white border border-indigo-200 rounded px-1 py-0.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0.04"
                    max={duration}
                    value={Number(selectedCueDuration.toFixed(2))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0.04) {
                        onSetDuration?.(val);
                      }
                    }}
                    className="w-9 text-[11px] font-mono font-bold text-indigo-900 bg-transparent text-center focus:outline-none"
                    title="Exact mouth duration in seconds"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">s</span>
                </div>
                <button
                  type="button"
                  onClick={() => onAdjustDuration?.(0.05)}
                  className="w-4 h-4 flex items-center justify-center font-bold text-slate-700 bg-white hover:bg-indigo-100 border border-indigo-200 rounded text-[11px] leading-none transition-colors"
                  title="Increase mouth duration (+0.05s)"
                >
                  +
                </button>
              </div>
            )}

            {onDeleteSelectedCue && (
              <button
                onClick={onDeleteSelectedCue}
                className="p-0.5 text-rose-500 hover:text-rose-700 rounded"
                title="Delete selected cue"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">Click a cue to edit shape</span>
        )}

        {onAddCueAtPlayhead && (
          <button
            onClick={() => onAddCueAtPlayhead('A')}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            title="Add mouth cue at playhead"
          >
            <Plus className="w-3 h-3" />
            <span>Add Cue</span>
          </button>
        )}
      </div>

      {/* Center/Right: Warnings indicator */}
      {warningCount !== undefined && warningCount > 0 && (
        <button
          type="button"
          onClick={onSelectWarningCue}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-semibold hover:bg-amber-100 transition-colors"
          title={`${warningCount} timing warning(s) detected. Click to inspect.`}
        >
          <span>⚠️</span>
          <span>{warningCount} warning{warningCount > 1 ? 's' : ''}</span>
        </button>
      )}

      {/* Right: Zoom Controls */}
      <div className="flex items-center gap-1 bg-slate-100 px-1 py-0.5 rounded-md">
        <button
          onClick={() => onZoomChange(Math.max(40, zoom - 20))}
          className="p-0.5 text-slate-500 hover:text-slate-800 rounded hover:bg-white"
          title="Zoom out timeline"
        >
          <ZoomOut className="w-3 h-3" />
        </button>

        <span className="text-[10px] text-slate-600 font-mono w-10 text-center">
          {Math.round(zoom)}px/s
        </span>

        <button
          onClick={() => onZoomChange(Math.min(300, zoom + 20))}
          className="p-0.5 text-slate-500 hover:text-slate-800 rounded hover:bg-white"
          title="Zoom in timeline"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
