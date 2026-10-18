import React from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { formatTime } from '../../utils/timeUtils';

export interface AudioPlayerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onToggleMute: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  isPlaying,
  currentTime,
  duration,
  isMuted,
  onTogglePlay,
  onSeek,
  onToggleMute,
}) => {
  return (
    <div className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
      <button
        onClick={onTogglePlay}
        disabled={duration <= 0}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors shadow-2xs shrink-0"
        title={isPlaying ? 'Pause' : duration > 0 && currentTime >= duration - 0.05 ? 'Play Again' : 'Play'}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
      </button>

      <button
        onClick={() => onSeek(0)}
        disabled={duration <= 0}
        className="text-slate-400 hover:text-slate-700 p-1 rounded-md disabled:opacity-50 transition-colors shrink-0"
        title="Rewind to start (0.0s)"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Timestamp */}
      <div className="text-[11px] font-mono font-medium text-slate-700 w-20 shrink-0">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Scrubber slider */}
      <input
        type="range"
        min="0"
        max={duration || 1}
        step="0.01"
        value={currentTime}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        disabled={duration <= 0}
        className="flex-1 accent-indigo-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
      />

      {/* Mute button */}
      <button
        onClick={onToggleMute}
        disabled={duration <= 0}
        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg disabled:opacity-50 transition-colors shrink-0"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
};
