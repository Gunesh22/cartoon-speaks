import React, { useEffect, useState } from 'react';
import { MouthAsset, STANDARD_RHUBARB_SHAPES } from '../../types/mouth';
import { imageCache } from '../../services/image/imageLoader';
import { AlertCircle, Edit2, Trash2 } from 'lucide-react';

export interface MouthAssetCardProps {
  asset: MouthAsset;
  onEditLabel?: (newLabel: string) => void;
  onAdjustCrop?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

export const MouthAssetCard: React.FC<MouthAssetCardProps> = ({
  asset,
  onEditLabel,
  onAdjustCrop,
  onDelete,
  readOnly = false,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(asset.label);

  useEffect(() => {
    const url = imageCache.getObjectUrl(asset.id, asset.imageBlob);
    setImageUrl(url);
  }, [asset.id, asset.imageBlob]);

  const standardDef = STANDARD_RHUBARB_SHAPES.find((s) => s.label === asset.label);

  const handleLabelSubmit = () => {
    setIsEditingLabel(false);
    if (labelValue.trim() && labelValue !== asset.label) {
      onEditLabel?.(labelValue.trim().toUpperCase());
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col hover:border-slate-300 transition-all shadow-2xs group relative">
      {/* Warning indicator if any */}
      {asset.warning && (
        <div
          title={asset.warning}
          className="absolute top-2 right-2 z-10 p-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md flex items-center gap-1 text-[10px]"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden group-hover:inline max-w-24 truncate">{asset.warning}</span>
        </div>
      )}

      {/* Thumbnail */}
      <div className="aspect-square w-full rounded-lg bg-transparency-checker overflow-hidden border border-slate-100 flex items-center justify-center relative">
        {imageUrl ? (
          <img src={imageUrl} alt={asset.label} className="w-full h-full object-contain p-2" />
        ) : (
          <div className="text-slate-300 text-xs">Loading...</div>
        )}
      </div>

      {/* Label and Info */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between">
          {isEditingLabel ? (
            <input
              type="text"
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onBlur={handleLabelSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLabelSubmit();
                if (e.key === 'Escape') setIsEditingLabel(false);
              }}
              autoFocus
              className="w-16 px-1.5 py-0.5 text-xs font-bold border border-indigo-500 rounded bg-indigo-50/50 uppercase"
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold text-xs">
                {asset.label}
              </span>
              {!readOnly && onEditLabel && (
                <button
                  onClick={() => setIsEditingLabel(true)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-opacity"
                  title="Rename shape label"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <span className="text-[10px] text-slate-400">
            {asset.width}×{asset.height}
          </span>
        </div>

        {standardDef && (
          <div className="text-[11px] text-slate-500 mt-1 truncate" title={standardDef.description}>
            {standardDef.name}
            {standardDef.phoneticSounds && (
              <span className="text-slate-400 ml-1">({standardDef.phoneticSounds})</span>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      {!readOnly && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          {onAdjustCrop && (
            <button
              onClick={onAdjustCrop}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Adjust Crop
            </button>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
              title="Delete mouth crop"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
