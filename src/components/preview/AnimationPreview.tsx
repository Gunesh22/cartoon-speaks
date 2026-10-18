import React, { useRef } from 'react';
import { Character } from '../../types/character';
import { MouthAsset } from '../../types/mouth';
import { TimelineCue, LipSyncTuningSettings } from '../../types/timeline';
import { ExportSettings } from '../../types/export';
import { useAnimationPreview } from '../../hooks/useAnimationPreview';

export interface AnimationPreviewProps {
  character: Character | null;
  characterImg: CanvasImageSource | null;
  mouthAssets: Map<string, { img: CanvasImageSource; asset: MouthAsset }>;
  cues: TimelineCue[];
  currentTime: number;
  exportSettings: ExportSettings;
  isPlaying?: boolean;
  bgImage?: CanvasImageSource | null;
  showAlignmentGuides?: boolean;
  activeShapeOverride?: string;
  tuningSettings?: LipSyncTuningSettings;
}

export const AnimationPreview: React.FC<AnimationPreviewProps> = ({
  character,
  characterImg,
  mouthAssets,
  cues,
  currentTime,
  exportSettings,
  isPlaying = false,
  bgImage,
  showAlignmentGuides = false,
  activeShapeOverride,
  tuningSettings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useAnimationPreview({
    canvasRef,
    character,
    characterImg,
    mouthAssets,
    cues,
    currentTime,
    exportSettings,
    isPlaying,
    bgImage,
    showAlignmentGuides,
    activeShapeOverride,
    tuningSettings,
  });

  // Calculate CSS aspect-ratio string
  const aspectRatioStyle = (() => {
    switch (exportSettings.aspectRatio) {
      case '9:16':
        return '9 / 16';
      case '16:9':
        return '16 / 9';
      case '1:1':
        return '1 / 1';
      case '4:5':
        return '4 / 5';
      case 'custom':
      default:
        return `${exportSettings.width || 1920} / ${exportSettings.height || 1080}`;
    }
  })();

  return (
    <div className="w-full h-full flex-1 min-h-[140px] flex items-center justify-center min-w-0 min-h-0 overflow-hidden">
      {/* Bounded preview frame that preserves aspect ratio without exceeding width or height */}
      <div
        style={{ aspectRatio: aspectRatioStyle }}
        className={`relative max-w-full max-h-full w-auto h-auto rounded-xl overflow-hidden border border-slate-300 shadow-sm flex items-center justify-center ${
          exportSettings.backgroundType === 'transparent' ? 'bg-transparency-checker' : 'bg-slate-900'
        }`}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain block"
        />

        {!character && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-white/85 backdrop-blur-2xs p-3 text-center">
            <span className="font-semibold text-xs">No Character Selected</span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              Select a character from the library to preview animation
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
