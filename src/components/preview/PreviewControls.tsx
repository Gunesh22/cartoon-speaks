import React, { useRef } from 'react';
import { AspectRatioId, ASPECT_RATIO_PRESETS, CharacterFitMode, BackgroundType } from '../../types/export';
import { Smartphone, Monitor, Square, Film, Crosshair, Palette, Image as ImageIcon } from 'lucide-react';

export interface PreviewControlsProps {
  currentAspectRatio: AspectRatioId;
  fitMode: CharacterFitMode;
  onAspectRatioChange: (aspectRatio: AspectRatioId, width: number, height: number) => void;
  onFitModeChange: (fitMode: CharacterFitMode) => void;
  showAlignmentGuides?: boolean;
  onToggleAlignmentGuides?: () => void;
  onOpenAlignmentDebugger?: () => void;
  backgroundType?: BackgroundType;
  backgroundColor?: string;
  onBackgroundTypeChange?: (type: BackgroundType) => void;
  onBackgroundColorChange?: (color: string) => void;
  onBackgroundImageLoaded?: (blob: Blob) => void;
}

export const PreviewControls: React.FC<PreviewControlsProps> = ({
  currentAspectRatio,
  fitMode,
  onAspectRatioChange,
  onFitModeChange,
  showAlignmentGuides = false,
  onToggleAlignmentGuides,
  onOpenAlignmentDebugger,
  backgroundType = 'color',
  backgroundColor = '#ffffff',
  onBackgroundTypeChange,
  onBackgroundColorChange,
  onBackgroundImageLoaded,
}) => {
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const getIcon = (id: AspectRatioId) => {
    switch (id) {
      case '9:16':
        return <Smartphone className="w-3 h-3" />;
      case '16:9':
        return <Monitor className="w-3 h-3" />;
      case '1:1':
        return <Square className="w-3 h-3" />;
      case '4:5':
        return <Film className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] bg-white p-1.5 px-2.5 rounded-lg border border-slate-200 shrink-0">
      {/* Left: Aspect Ratio & Fit Mode */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
          {ASPECT_RATIO_PRESETS.map((preset) => {
            const isSelected = preset.id === currentAspectRatio;
            return (
              <button
                key={preset.id}
                onClick={() => onAspectRatioChange(preset.id, preset.width, preset.height)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  isSelected
                    ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={`${preset.label} (${preset.ratioText})`}
              >
                {getIcon(preset.id)}
                <span>{preset.ratioText}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md border border-slate-200">
          {(['contain', 'cover'] as CharacterFitMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onFitModeChange(mode)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-all ${
                fitMode === mode
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Background, Guides, Alignment */}
      <div className="flex items-center gap-1.5">
        {/* Background Selector */}
        {onBackgroundTypeChange && (
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
            <button
              onClick={() => onBackgroundTypeChange('color')}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                backgroundType === 'color' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
              title="Solid Background Color"
            >
              <Palette className="w-3 h-3 text-slate-500" />
              <span>Color</span>
            </button>

            {backgroundType === 'color' && onBackgroundColorChange && (
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => onBackgroundColorChange(e.target.value)}
                className="w-4 h-4 rounded cursor-pointer border-0 p-0 bg-transparent"
                title="Choose Background Color"
              />
            )}

            <button
              onClick={() => onBackgroundTypeChange('transparent')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                backgroundType === 'transparent' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
              title="Transparent Background (Alpha)"
            >
              Alpha
            </button>

            <button
              onClick={() => {
                onBackgroundTypeChange('image');
                bgFileInputRef.current?.click();
              }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                backgroundType === 'image' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
              title="Custom Image Background"
            >
              <ImageIcon className="w-3 h-3" />
              <span>Img</span>
            </button>

            <input
              ref={bgFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0] && onBackgroundImageLoaded) {
                  onBackgroundImageLoaded(e.target.files[0]);
                }
              }}
            />
          </div>
        )}

        {/* Alignment Guides Toggle */}
        {onToggleAlignmentGuides && (
          <button
            onClick={onToggleAlignmentGuides}
            title="Toggle mouth & character alignment guides"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium border text-[11px] transition-all ${
              showAlignmentGuides
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Crosshair className={`w-3 h-3 ${showAlignmentGuides ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Guides</span>
          </button>
        )}

        {/* Mouth Alignment Debugger button */}
        {onOpenAlignmentDebugger && (
          <button
            onClick={onOpenAlignmentDebugger}
            title="Open Mouth Alignment Debugger"
            className="flex items-center gap-1 px-2 py-0.5 rounded-md font-medium border border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 transition-all text-[11px]"
          >
            <span>Align Debug</span>
          </button>
        )}
      </div>
    </div>
  );
};
