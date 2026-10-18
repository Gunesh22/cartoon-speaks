import React, { useState, useEffect } from 'react';
import { MouthCollection, MouthAsset } from '../../types/mouth';
import { SpriteSheetUploader, ExtractedMouthPayload } from './SpriteSheetUploader';
import { MouthAssetCard } from './MouthAssetCard';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { Plus, RefreshCw, Trash2, Smile, Copy, Check } from 'lucide-react';
import { mouthRepository } from '../../services/storage/mouthRepository';

export interface MouthCollectionLibraryProps {
  collections: MouthCollection[];
  getAssetsForCollection: (collectionId: string) => Promise<MouthAsset[]>;
  onRefresh: () => Promise<void>;
  onSaveCollection: (payload: ExtractedMouthPayload) => Promise<void>;
  onReplaceCollection: (collectionId: string, payload: ExtractedMouthPayload) => Promise<void>;
  onDeleteCollection: (collectionId: string) => Promise<void>;
}

export const MouthCollectionLibrary: React.FC<MouthCollectionLibraryProps> = ({
  collections,
  getAssetsForCollection,
  onRefresh,
  onSaveCollection,
  onReplaceCollection,
  onDeleteCollection,
}) => {
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [replacingCollection, setReplacingCollection] = useState<MouthCollection | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<MouthCollection | null>(null);
  const [expandedColId, setExpandedColId] = useState<string | null>(collections[0]?.id || null);
  const [expandedAssets, setExpandedAssets] = useState<MouthAsset[]>([]);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    if (expandedColId) {
      getAssetsForCollection(expandedColId).then(setExpandedAssets);
    } else {
      setExpandedAssets([]);
    }
  }, [expandedColId, getAssetsForCollection]);

  const copyPromptText = () => {
    const promptText = `Create a high-resolution 2D cartoon lip-sync sprite sheet for the supplied character's existing art style.
Requirements:
- Generate isolated mouth shapes only. Do not include a face, head, body, background scene, or decorative elements.
- Arrange the mouth shapes in a clean, evenly spaced 3x3 grid.
- Include the standard Rhubarb mouth labels: A, B, C, D, E, F, G, H, and X.
- Keep every mouth front-facing, with consistent line thickness, shading, proportions, and visual style.
- Include a neutral closed mouth (A), slightly open mouth (B), open mouth (C), wide open mouth (D), rounded mouth (E), puckered mouth (F), teeth on lip (G), tongue behind teeth (H), and resting mouth (X).
- Use genuine alpha transparency (PNG).
- Keep generous spacing between mouths so automatic cropping is zero-effort.
- Do not put labels, shadows, or decorative graphics inside the mouth image itself.`;

    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Mouth Asset Collections</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Import standardized sprite sheets or individual transparent PNGs with instant zero-adjustment review.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyPromptText}
            icon={copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copiedPrompt ? 'Copied AI Prompt!' : 'Copy Mouth Sheet Prompt'}
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setReplacingCollection(null);
              setIsImporterOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Import Mouths
          </Button>
        </div>
      </div>

      {collections.length === 0 ? (
        <EmptyState
          icon={<Smile className="w-8 h-8 text-indigo-500" />}
          title="No mouth collections yet"
          description="Import a 3×3 mouth chart or transparent mouth PNGs to attach speech phonemes to your cartoon characters."
          action={
            <Button
              variant="primary"
              onClick={() => setIsImporterOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Import First Collection
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Collection Selection Tabs / Cards */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            {collections.map((col) => {
              const isSelected = col.id === expandedColId;
              return (
                <button
                  key={col.id}
                  onClick={() => setExpandedColId(col.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Smile className="w-4 h-4" />
                  <span>{col.name}</span>
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {col.assetIds.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Collection Details & Assets Grid */}
          {expandedColId && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {collections.find((c) => c.id === expandedColId)?.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {expandedAssets.length} cropped mouth phonemes ready for lip-sync animation
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const col = collections.find((c) => c.id === expandedColId);
                      if (col) {
                        setReplacingCollection(col);
                        setIsImporterOpen(true);
                      }
                    }}
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Replace Sheet
                  </Button>

                  <button
                    onClick={() => {
                      const col = collections.find((c) => c.id === expandedColId);
                      if (col) setCollectionToDelete(col);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete collection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Assets Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-3">
                {expandedAssets.map((asset) => (
                  <MouthAssetCard
                    key={asset.id}
                    asset={asset}
                    onEditLabel={async (newLabel) => {
                      await mouthRepository.updateAssetLabel(asset.id, newLabel);
                      onRefresh();
                    }}
                    onDelete={async () => {
                      await mouthRepository.deleteAsset(asset.id);
                      onRefresh();
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Importer Modal */}
      <Modal
        isOpen={isImporterOpen}
        onClose={() => {
          setIsImporterOpen(false);
          setReplacingCollection(null);
        }}
        title={replacingCollection ? `Replace Mouths in "${replacingCollection.name}"` : 'Import Mouth Assets'}
        description="Upload a 3×3 grid sprite sheet or separate PNG files. All mouth shapes are extracted with transparency."
        maxWidth="6xl"
      >
        <SpriteSheetUploader
          replacementTargetName={replacingCollection?.name}
          onSaveCollection={async (payload) => {
            if (replacingCollection) {
              await onReplaceCollection(replacingCollection.id, payload);
            } else {
              await onSaveCollection(payload);
            }
            setIsImporterOpen(false);
            setReplacingCollection(null);
            await onRefresh();
          }}
          onCancel={() => {
            setIsImporterOpen(false);
            setReplacingCollection(null);
          }}
        />
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={!!collectionToDelete}
        title="Delete Mouth Collection?"
        message={`Are you sure you want to delete "${collectionToDelete?.name}"? Any characters referencing this collection will lose their active mouth shapes.`}
        confirmLabel="Delete Collection"
        onConfirm={async () => {
          if (collectionToDelete) {
            await onDeleteCollection(collectionToDelete.id);
            setCollectionToDelete(null);
            setExpandedColId(null);
          }
        }}
        onCancel={() => setCollectionToDelete(null)}
      />
    </div>
  );
};
