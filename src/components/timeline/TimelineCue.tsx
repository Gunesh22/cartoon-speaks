import React, { useCallback } from 'react';
import { TimelineCue as TimelineCueType } from '../../types/timeline';
import { STANDARD_RHUBARB_SHAPES } from '../../types/mouth';

export interface TimelineCueProps {
  cue: TimelineCueType;
  zoom: number; // pixels per second
  isSelected: boolean;
  warning?: string;
  onSelect: () => void;
  onResizeLeft?: (newStart: number) => void;
  onResizeRight?: (newEnd: number) => void;
  onResizeEnd?: () => void;
}

export const TimelineCueComponent: React.FC<TimelineCueProps> = ({
  cue,
  zoom,
  isSelected,
  warning,
  onSelect,
  onResizeLeft,
  onResizeRight,
  onResizeEnd,
}) => {
  const leftPx = cue.start * zoom;
  const cueDuration = Math.max(0.04, cue.end - cue.start);
  const widthPx = Math.max(16, cueDuration * zoom);

  const shapeInfo = STANDARD_RHUBARB_SHAPES.find((s) => s.label === cue.shape);

  const handleLeftResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect();

      const startX = e.clientX;
      const initialStart = cue.start;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaSec = deltaX / zoom;
        const newStart = Math.max(0, initialStart + deltaSec);
        onResizeLeft?.(newStart);
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        onResizeEnd?.();
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [cue.start, zoom, onSelect, onResizeLeft, onResizeEnd]
  );

  const handleRightResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect();

      const startX = e.clientX;
      const initialEnd = cue.end;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaSec = deltaX / zoom;
        const newEnd = initialEnd + deltaSec;
        onResizeRight?.(newEnd);
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        onResizeEnd?.();
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [cue.end, zoom, onSelect, onResizeRight, onResizeEnd]
  );

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
      }}
      className={`group absolute top-1 bottom-1 rounded-md border flex items-center justify-between cursor-pointer select-none overflow-hidden transition-colors ${
        isSelected
          ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm z-20'
          : warning
          ? 'bg-amber-50 border-amber-400 text-amber-900 hover:bg-amber-100 z-10 ring-1 ring-amber-300'
          : cue.shape === 'X'
          ? 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200 z-10'
          : 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100 z-10'
      }`}
      title={`${warning ? `⚠️ Warning: ${warning}\n` : ''}${cue.shape}: ${shapeInfo?.name || ''} (${cue.start.toFixed(2)}s - ${cue.end.toFixed(2)}s, Duration: ${cueDuration.toFixed(2)}s) - Drag edges to adjust`}
    >
      {/* Left Resize Handle */}
      <div
        onMouseDown={handleLeftResizeStart}
        className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-30"
        title="Drag left edge to adjust start time / duration"
      >
        <div className={`w-1 h-3 rounded-full ${isSelected ? 'bg-indigo-200' : 'bg-indigo-400'}`} />
      </div>

      {/* Label and Duration */}
      <div className="flex items-center justify-between w-full px-1.5 pointer-events-none overflow-hidden gap-1">
        <div className="flex items-center gap-1 overflow-hidden">
          {warning && (
            <span className="text-[10px] text-amber-600 font-bold shrink-0" title={warning}>
              ⚠️
            </span>
          )}
          <span className="font-bold text-xs truncate">{cue.shape}</span>
        </div>
        {widthPx > 50 && (
          <span className="text-[10px] opacity-80 font-mono truncate">
            {cueDuration.toFixed(2)}s
          </span>
        )}
      </div>

      {/* Right Resize Handle */}
      <div
        onMouseDown={handleRightResizeStart}
        className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-30"
        title="Drag right edge to adjust duration / end time"
      >
        <div className={`w-1 h-3 rounded-full ${isSelected ? 'bg-indigo-200' : 'bg-indigo-400'}`} />
      </div>
    </div>
  );
};
