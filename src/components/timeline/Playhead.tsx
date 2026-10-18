import React from 'react';

export interface PlayheadProps {
  currentTime: number;
  zoom: number; // px per second
  height: number;
}

export const Playhead: React.FC<PlayheadProps> = ({
  currentTime,
  zoom,
  height,
}) => {
  const leftPx = currentTime * zoom;

  return (
    <div
      style={{
        transform: `translateX(${leftPx}px)`,
        height: `${height}px`,
      }}
      className="absolute top-0 pointer-events-none z-30 transition-none flex flex-col items-center"
    >
      {/* Scrubber pointer head */}
      <div className="w-3 h-3 bg-rose-600 rounded-xs rotate-45 -mt-1 shadow-xs" />
      {/* Vertical line */}
      <div className="w-0.5 bg-rose-600 flex-1 opacity-90" />
    </div>
  );
};
