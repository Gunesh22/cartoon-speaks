import React from 'react';
import { AspectRatioId, ASPECT_RATIO_PRESETS } from '../../types/export';
import { Smartphone, Monitor, Square, Film } from 'lucide-react';

export interface AspectRatioSelectorProps {
  selectedRatio: AspectRatioId;
  onSelect: (ratio: AspectRatioId, width: number, height: number) => void;
}

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  selectedRatio,
  onSelect,
}) => {
  const getIcon = (id: AspectRatioId) => {
    switch (id) {
      case '9:16':
        return <Smartphone className="w-5 h-5" />;
      case '16:9':
        return <Monitor className="w-5 h-5" />;
      case '1:1':
        return <Square className="w-5 h-5" />;
      case '4:5':
        return <Film className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ASPECT_RATIO_PRESETS.map((preset) => {
        const isSelected = preset.id === selectedRatio;
        return (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id, preset.width, preset.height)}
            className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
              isSelected
                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className={`p-2 rounded-lg mb-2 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {getIcon(preset.id)}
            </div>
            <div className="font-bold text-xs">{preset.label}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{preset.ratioText} ({preset.width}×{preset.height})</div>
          </button>
        );
      })}
    </div>
  );
};
