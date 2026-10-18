import React, { useRef } from 'react';
import { BackgroundType } from '../../types/export';

export interface BackgroundControlsProps {
  backgroundType: BackgroundType;
  backgroundColor: string;
  onBackgroundTypeChange: (type: BackgroundType) => void;
  onBackgroundColorChange: (color: string) => void;
  onBackgroundImageLoaded: (blob: Blob) => void;
}

export const BackgroundControls: React.FC<BackgroundControlsProps> = ({
  backgroundType,
  backgroundColor,
  onBackgroundTypeChange,
  onBackgroundColorChange,
  onBackgroundImageLoaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = ['#ffffff', '#f8fafc', '#e2e8f0', '#fee2e2', '#fef3c7', '#dcfce7', '#e0e7ff', '#0f172a'];

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <span className="font-semibold text-slate-600 uppercase">Background:</span>

      {/* Mode Buttons */}
      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
        <button
          onClick={() => onBackgroundTypeChange('color')}
          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
            backgroundType === 'color' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Color
        </button>
        <button
          onClick={() => onBackgroundTypeChange('transparent')}
          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
            backgroundType === 'transparent' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Transparent
        </button>
        <button
          onClick={() => {
            onBackgroundTypeChange('image');
            fileInputRef.current?.click();
          }}
          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
            backgroundType === 'image' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Image
        </button>
      </div>

      {/* Color Swatches if Color Mode */}
      {backgroundType === 'color' && (
        <div className="flex items-center gap-1.5">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => onBackgroundColorChange(c)}
              style={{ backgroundColor: c }}
              className={`w-5 h-5 rounded-full border transition-all ${
                backgroundColor.toLowerCase() === c.toLowerCase()
                  ? 'border-indigo-600 ring-2 ring-indigo-400/40 scale-110'
                  : 'border-slate-300'
              }`}
            />
          ))}
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => onBackgroundColorChange(e.target.value)}
            className="w-5 h-5 rounded-full cursor-pointer border-0 p-0 bg-transparent"
            title="Custom color"
          />
        </div>
      )}

      {/* Hidden File Input for BG Image */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onBackgroundImageLoaded(e.target.files[0]);
          }
        }}
      />
    </div>
  );
};
