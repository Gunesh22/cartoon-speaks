import React, { useEffect, useState } from 'react';
import { Character } from '../../types/character';
import { imageCache } from '../../services/image/imageLoader';
import { Copy, Trash2, Edit3, Smile } from 'lucide-react';
import { Button } from '../common/Button';

export interface CharacterCardProps {
  character: Character;
  isSelected?: boolean;
  mouthCollectionName?: string;
  onSelect?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  isSelected,
  mouthCollectionName,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    const url = imageCache.getObjectUrl(character.id, character.imageBlob);
    setImageUrl(url);
  }, [character.id, character.imageBlob]);

  return (
    <div
      onClick={onSelect}
      className={`group relative bg-white rounded-xl border p-4 transition-all cursor-pointer hover:shadow-md ${
        isSelected
          ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-square w-full rounded-lg bg-transparency-checker overflow-hidden border border-slate-100 flex items-center justify-center relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={character.name}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <div className="text-slate-300">No Image</div>
        )}

        {/* Mouth collection pill */}
        {character.mouthCollectionId && (
          <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-xs px-2 py-1 rounded-md text-[11px] font-medium text-slate-700 border border-slate-200/80 flex items-center gap-1 shadow-xs truncate">
            <Smile className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">{mouthCollectionName || 'Mouths Attached'}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="mt-3">
        <h4 className="font-semibold text-slate-900 truncate text-sm">{character.name}</h4>
        <p className="text-xs text-slate-400 mt-0.5">
          {character.imageWidth} × {character.imageHeight} px
        </p>
      </div>

      {/* Actions */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          icon={<Edit3 className="w-3.5 h-3.5" />}
        >
          Configure
        </Button>

        <div className="flex items-center gap-1">
          {onDuplicate && (
            <button
              title="Duplicate character"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}

          {onDelete && (
            <button
              title="Delete character"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
