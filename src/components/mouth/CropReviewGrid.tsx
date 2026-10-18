import React from 'react';
import { CropOverlayItem } from './SpriteSheetPreview';
import { STANDARD_RHUBARB_SHAPES } from '../../types/mouth';
import { AlertCircle, Trash2, Undo, Redo, Plus } from 'lucide-react';
import { Button } from '../common/Button';

export interface CropReviewGridProps {
  crops: CropOverlayItem[];
  selectedCropId?: string | null;
  onSelectCrop: (id: string) => void;
  onUpdateLabel: (id: string, newLabel: string) => void;
  onDeleteCrop: (id: string) => void;
  onAddCrop?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  cropThumbnails: Map<string, string>; // id -> objectUrl / dataUrl
}

export const CropReviewGrid: React.FC<CropReviewGridProps> = ({
  crops,
  selectedCropId,
  onSelectCrop,
  onUpdateLabel,
  onDeleteCrop,
  onAddCrop,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  cropThumbnails,
}) => {
  return (
    <div className="space-y-4">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Detected Mouth Shapes ({crops.length})
          </span>
          {crops.some((c) => c.warning) && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <AlertCircle className="w-3 h-3" /> Issues flagged
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100"
              title="Undo crop edit"
            >
              <Undo className="w-4 h-4" />
            </button>
          )}
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100"
              title="Redo crop edit"
            >
              <Redo className="w-4 h-4" />
            </button>
          )}
          {onAddCrop && (
            <Button size="sm" variant="outline" onClick={onAddCrop} icon={<Plus className="w-3.5 h-3.5" />}>
              Add Crop
            </Button>
          )}
        </div>
      </div>

      {/* Grid of All Detected Mouth Crops */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {crops.map((crop) => {
          const isSelected = crop.id === selectedCropId;
          const thumb = cropThumbnails.get(crop.id);
          const standardInfo = STANDARD_RHUBARB_SHAPES.find((s) => s.label === crop.label);

          return (
            <div
              key={crop.id}
              onClick={() => onSelectCrop(crop.id)}
              className={`relative bg-white rounded-xl border p-2.5 flex flex-col cursor-pointer transition-all ${
                isSelected
                  ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                  : crop.warning
                  ? 'border-amber-300 bg-amber-50/10 hover:border-amber-400'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Thumbnail */}
              <div className="aspect-square w-full rounded-lg bg-transparency-checker border border-slate-100 overflow-hidden flex items-center justify-center relative">
                {thumb ? (
                  <img src={thumb} alt={crop.label} className="w-full h-full object-contain p-1.5" />
                ) : (
                  <div className="text-slate-300 text-xs">...</div>
                )}

                {crop.warning && (
                  <div
                    title={crop.warning}
                    className="absolute top-1 right-1 p-1 bg-amber-500 text-white rounded-md shadow-xs"
                  >
                    <AlertCircle className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Label selector & dimensions */}
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-1">
                  <select
                    value={crop.label}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdateLabel(crop.id, e.target.value)}
                    className="text-xs font-bold bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {STANDARD_RHUBARB_SHAPES.map((s) => (
                      <option key={s.label} value={s.label}>
                        {s.label} ({s.name})
                      </option>
                    ))}
                    {!STANDARD_RHUBARB_SHAPES.some((s) => s.label === crop.label) && (
                      <option value={crop.label}>{crop.label}</option>
                    )}
                  </select>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCrop(crop.id);
                    }}
                    className="text-slate-300 hover:text-rose-600 p-0.5 rounded transition-colors"
                    title="Remove this crop"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 truncate">
                  {Math.round(crop.rect.width)} × {Math.round(crop.rect.height)} px
                  {standardInfo && ` • ${standardInfo.phoneticSounds}`}
                </div>

                {crop.warning && (
                  <div className="text-[10px] text-amber-600 leading-tight truncate" title={crop.warning}>
                    {crop.warning}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
