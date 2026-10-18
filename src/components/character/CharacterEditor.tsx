import React, { useState, useEffect, useRef } from 'react';
import { Character, MouthPlacement } from '../../types/character';
import { MouthCollection, MouthAsset, STANDARD_RHUBARB_SHAPES, STANDARD_MOUTH_ANCHOR_X, STANDARD_MOUTH_ANCHOR_Y } from '../../types/mouth';
import { CharacterPreview } from './CharacterPreview';
import { Button } from '../common/Button';
import { imageCache } from '../../services/image/imageLoader';
import { Check, Layers, RotateCcw, Crosshair, Upload, Image as ImageIcon } from 'lucide-react';
import { validateAndLoadImageBlob } from '../../utils/fileValidation';

export interface CharacterEditorProps {
  character: Character;
  mouthCollections: MouthCollection[];
  getAssetsForCollection: (collectionId: string) => Promise<MouthAsset[]>;
  onSave: (
    updatedPlacement: MouthPlacement,
    updatedMapping: Record<string, string>,
    collectionId?: string,
    name?: string,
    newImage?: {
      blob: Blob;
      width: number;
      height: number;
    }
  ) => Promise<void>;
  onClose: () => void;
}

export const CharacterEditor: React.FC<CharacterEditorProps> = ({
  character,
  mouthCollections,
  getAssetsForCollection,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(character.name);
  const [selectedColId, setSelectedColId] = useState<string>(character.mouthCollectionId || '');
  const [availableAssets, setAvailableAssets] = useState<MouthAsset[]>([]);
  const [mouthMapping, setMouthMapping] = useState<Record<string, string>>(character.mouthMapping || {});
  const [placement, setPlacement] = useState<MouthPlacement>(character.placement);
  const [testShape, setTestShape] = useState<string>('A');

  const [showCrosshair, setShowCrosshair] = useState(true);
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(true);

  const [charImg, setCharImg] = useState<HTMLImageElement | null>(null);
  const [assetImageMap, setAssetImageMap] = useState<Map<string, { img: CanvasImageSource; asset: MouthAsset }>>(
    new Map()
  );
  const [saving, setSaving] = useState(false);

  // Image replacement state
  const [pendingImage, setPendingImage] = useState<{
    blob: Blob;
    width: number;
    height: number;
    filename: string;
  } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { metadata, img } = await validateAndLoadImageBlob(file);
      setPendingImage({
        blob: file,
        width: metadata.width,
        height: metadata.height,
        filename: file.name,
      });
      setCharImg(img);
      setImageError(null);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Invalid image file');
    } finally {
      e.target.value = '';
    }
  };

  // Load character image
  useEffect(() => {
    let active = true;
    if (pendingImage) return; // Retain user-selected replacement
    imageCache.getLoadedImage(character.id, character.imageBlob).then((img) => {
      if (active) setCharImg(img);
    });
    return () => {
      active = false;
    };
  }, [character.id, character.imageBlob, pendingImage]);

  // Load mouth assets when selected collection changes
  useEffect(() => {
    let active = true;
    if (!selectedColId) {
      setAvailableAssets([]);
      setAssetImageMap(new Map());
      return;
    }

    getAssetsForCollection(selectedColId).then(async (assets) => {
      if (!active) return;
      setAvailableAssets(assets);

      // Auto-map if unmapped
      const newMapping: Record<string, string> = { ...mouthMapping };
      const map = new Map<string, { img: CanvasImageSource; asset: MouthAsset }>();

      for (const a of assets) {
        try {
          const img = await imageCache.getLoadedImage(a.id, a.imageBlob);
          map.set(a.id, { img, asset: a });
          if (!newMapping[a.label]) {
            newMapping[a.label] = a.id;
          }
        } catch (e) {
          console.warn('Failed to load mouth asset image', e);
        }
      }

      if (active) {
        setAssetImageMap(map);
        setMouthMapping(newMapping);
      }
    });

    return () => {
      active = false;
    };
  }, [selectedColId, getAssetsForCollection]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(
        placement,
        mouthMapping,
        selectedColId,
        name,
        pendingImage
          ? {
              blob: pendingImage.blob,
              width: pendingImage.width,
              height: pendingImage.height,
            }
          : undefined
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleResetPlacement = () => {
    setPlacement({
      normalizedX: 0.5,
      normalizedY: 0.34375,
      scale: 1.0,
      mouthWidthPercent: 25.0,
      rotation: 0,
      anchorX: STANDARD_MOUTH_ANCHOR_X,
      anchorY: STANDARD_MOUTH_ANCHOR_Y,
    });
  };

  // Derive width percentage and mouth dimensions
  const currentWidthPercent = placement.mouthWidthPercent !== undefined
    ? placement.mouthWidthPercent
    : (placement.scale || 1.0) * 25.0;

  const activeAssetId = mouthMapping[testShape];
  const activeAsset = activeAssetId ? availableAssets.find((a) => a.id === activeAssetId) : undefined;
  const mouthAspect = activeAsset && activeAsset.width > 0 && activeAsset.height > 0
    ? activeAsset.width / activeAsset.height
    : 1.0;

  const currentImgWidth = pendingImage ? pendingImage.width : (character.imageWidth || 800);
  const approxRenderedWidth = Math.round(currentImgWidth * (currentWidthPercent / 100));
  const approxRenderedHeight = Math.round(approxRenderedWidth / mouthAspect);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Hidden file input for image replacement */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Top Header / Name */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Character Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-base font-semibold text-slate-900 bg-transparent border-b border-slate-300 focus:border-indigo-600 focus:outline-none px-1"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload className="w-3.5 h-3.5 text-indigo-600" />}
          >
            Replace Image
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saving}
            icon={<Check className="w-4 h-4" />}
          >
            Save Character
          </Button>
        </div>
      </div>

      {imageError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <span>{imageError}</span>
          <button onClick={() => setImageError(null)} className="text-rose-500 hover:text-rose-800 text-sm font-bold">×</button>
        </div>
      )}

      {pendingImage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              New image selected: <strong>{pendingImage.filename}</strong> ({pendingImage.width} × {pendingImage.height}px). Click <strong>Save Character</strong> to commit changes.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setPendingImage(null);
              imageCache.getLoadedImage(character.id, character.imageBlob).then(setCharImg);
            }}
            className="text-emerald-700 hover:text-emerald-950 underline font-semibold text-xs ml-3 shrink-0"
          >
            Revert to Original
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Canvas Preview */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-md">
            <CharacterPreview
              character={{
                ...character,
                imageWidth: pendingImage ? pendingImage.width : character.imageWidth,
                imageHeight: pendingImage ? pendingImage.height : character.imageHeight,
                placement,
                mouthMapping,
              }}
              characterImg={charImg}
              mouthAssets={assetImageMap}
              activeTestShape={testShape}
              onPlacementChange={setPlacement}
              interactive={true}
              showCrosshair={showCrosshair}
              onToggleCrosshair={setShowCrosshair}
              showAlignmentGuides={showAlignmentGuides}
            />

            {/* Image Info & Replace Action */}
            <div className="mt-2.5 flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="truncate text-xs">
                  {pendingImage ? (
                    <span className="font-semibold text-emerald-700 truncate">
                      New: {pendingImage.filename} ({pendingImage.width}×{pendingImage.height}px)
                    </span>
                  ) : (
                    <span className="text-slate-600 font-medium">
                      Dimensions: {character.imageWidth} × {character.imageHeight} px
                    </span>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                icon={<Upload className="w-3.5 h-3.5" />}
              >
                Replace Image
              </Button>
            </div>

            {/* Test Shape Quick Switcher */}
            <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Test Mouth Shapes
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Shape: {testShape}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STANDARD_RHUBARB_SHAPES.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setTestShape(s.label)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      testShape === s.label
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Controls, Mouth Selection & Mapping */}
        <div className="lg:col-span-5 space-y-4">
          {/* Mouth Collection Selector */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              Attached Mouth Collection
            </label>
            <select
              value={selectedColId}
              onChange={(e) => setSelectedColId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- No Mouth Collection Selected --</option>
              {mouthCollections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name} ({col.assetIds.length} mouths)
                </option>
              ))}
            </select>
          </div>

          {/* Numeric Placement & Anchor Alignment Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-emerald-600" />
                Mouth Anchor & Placement
              </span>
              <button
                onClick={handleResetPlacement}
                title="Reset to default anchor & center"
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Guides & Crosshair Toggles */}
            <div className="flex flex-wrap items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-150">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCrosshair}
                  onChange={(e) => setShowCrosshair(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Crosshair</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showAlignmentGuides}
                  onChange={(e) => setShowAlignmentGuides(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="flex items-center gap-1">
                  <span>Show Alignment Guides</span>
                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-sm">Active</span>
                </span>
              </label>
            </div>

            {/* Character X (%) Numeric Field & Slider */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-700 mb-1">
                <span className="font-medium">Character X (%)</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={parseFloat((placement.normalizedX * 100).toFixed(1))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setPlacement({
                          ...placement,
                          normalizedX: Math.max(0, Math.min(1, val / 100)),
                        });
                      }
                    }}
                    className="w-16 px-1.5 py-0.5 text-right font-mono text-xs border border-slate-300 rounded focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-slate-400 font-mono">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={placement.normalizedX}
                onChange={(e) =>
                  setPlacement({ ...placement, normalizedX: parseFloat(e.target.value) })
                }
                className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Character Y (%) Numeric Field & Slider */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-700 mb-1">
                <span className="font-medium">Character Y (%)</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={parseFloat((placement.normalizedY * 100).toFixed(1))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setPlacement({
                          ...placement,
                          normalizedY: Math.max(0, Math.min(1, val / 100)),
                        });
                      }
                    }}
                    className="w-16 px-1.5 py-0.5 text-right font-mono text-xs border border-slate-300 rounded focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-slate-400 font-mono">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={placement.normalizedY}
                onChange={(e) =>
                  setPlacement({ ...placement, normalizedY: parseFloat(e.target.value) })
                }
                className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Mouth Width (% of character canvas width) Numeric Field & Slider */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-700 mb-1">
                <span className="font-medium">Mouth Width (% of char)</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.5"
                    value={parseFloat(currentWidthPercent.toFixed(1))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        const clamped = Math.max(1, Math.min(100, val));
                        setPlacement({
                          ...placement,
                          mouthWidthPercent: clamped,
                          scale: clamped / 25.0,
                        });
                      }
                    }}
                    className="w-16 px-1.5 py-0.5 text-right font-mono text-xs border border-slate-300 rounded focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-slate-400 font-mono">%</span>
                </div>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="0.5"
                value={currentWidthPercent}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setPlacement({
                    ...placement,
                    mouthWidthPercent: val,
                    scale: val / 25.0,
                  });
                }}
                className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between items-center mt-1 text-[11px] text-slate-400">
                <span>Preserves aspect ratio</span>
                <span>Rendered: ~{approxRenderedWidth}×{approxRenderedHeight}px</span>
              </div>
            </div>

            {/* Rotation (degrees) Numeric Field & Slider */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-700 mb-1">
                <span className="font-medium">Rotation</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="-180"
                    max="180"
                    step="1"
                    value={placement.rotation || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setPlacement({
                          ...placement,
                          rotation: Math.max(-180, Math.min(180, val)),
                        });
                      }
                    }}
                    className="w-16 px-1.5 py-0.5 text-right font-mono text-xs border border-slate-300 rounded focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-slate-400 font-mono">°</span>
                </div>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                step="1"
                value={placement.rotation || 0}
                onChange={(e) =>
                  setPlacement({ ...placement, rotation: parseInt(e.target.value, 10) })
                }
                className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Alignment Details & Anchor Diagnostics */}
            <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-200/80 text-[11px] text-emerald-800 space-y-1">
              <div className="font-semibold flex items-center gap-1 text-emerald-900">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                Mouth Anchor Alignment (Upper Lip Center)
              </div>
              <p className="text-slate-600 leading-snug">
                Standard mouth anchor is fixed at <strong>(50.0%, 46.9%)</strong>. Open mouths extend downward from the upper lip line. Both anchors align automatically.
              </p>
            </div>
          </div>

          {/* Cue to Mouth Asset Mapping */}
          {availableAssets.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Cue Shape Mapping
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Verify each Rhubarb shape maps to the intended mouth asset.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {STANDARD_RHUBARB_SHAPES.map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-700 w-6">{s.label}</span>
                    <span className="text-slate-400 truncate flex-1">{s.name}</span>
                    <select
                      value={mouthMapping[s.label] || ''}
                      onChange={(e) =>
                        setMouthMapping({ ...mouthMapping, [s.label]: e.target.value })
                      }
                      className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-700"
                    >
                      <option value="">(None)</option>
                      {availableAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.label} ({asset.width}×{asset.height})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
