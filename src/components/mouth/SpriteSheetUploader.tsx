import React, { useState, useRef } from 'react';
import { Upload, Grid, Layers, AlertTriangle, Check, Copy, CheckCheck, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../common/Button';
import { ErrorMessage } from '../common/ErrorMessage';
import { validateAndLoadImageBlob } from '../../utils/fileValidation';
import { analyzeImageBackground } from '../../services/image/backgroundDetector';
import {
  generateGridCrops,
  validateCropContent,
  detectMouthRegions,
} from '../../services/image/spriteSheetDetector';
import { extractCropToBlob } from '../../services/image/cropService';
import { CropOverlayItem, SpriteSheetPreview } from './SpriteSheetPreview';
import { CropReviewGrid } from './CropReviewGrid';
import { CropEditor } from './CropEditor';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { Modal } from '../common/Modal';
import { generateId } from '../../utils/ids';
import {
  CropRect,
  DEFAULT_STANDARD_TEMPLATE,
  STANDARD_4X3_TEMPLATE,
  STANDARD_MOUTH_SHEET_PROMPT,
  STANDARD_MOUTH_ANCHOR_X,
  STANDARD_MOUTH_ANCHOR_Y,
} from '../../types/mouth';

export interface ExtractedMouthPayload {
  name: string;
  templateType: 'standard-template' | 'standard-4x3' | 'grid' | 'detected' | 'manifest';
  sourceSheetBlob?: Blob;
  sourceSheetWidth?: number;
  sourceSheetHeight?: number;
  assets: Array<{
    label: string;
    imageBlob: Blob;
    cropRect: CropRect;
    width: number;
    height: number;
    anchorX?: number;
    anchorY?: number;
    warning?: string;
  }>;
}

export interface SpriteSheetUploaderProps {
  onSaveCollection: (payload: ExtractedMouthPayload) => Promise<void>;
  onCancel?: () => void;
  replacementTargetName?: string;
}

export const SpriteSheetUploader: React.FC<SpriteSheetUploaderProps> = ({
  onSaveCollection,
  onCancel,
  replacementTargetName,
}) => {
  const [collectionName, setCollectionName] = useState(
    replacementTargetName ? `Replacement: ${replacementTargetName}` : 'My Cartoon Mouths'
  );
  const [sourceBlob, setSourceBlob] = useState<Blob | null>(null);
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<'standard-4x3' | 'standard-3x3' | 'auto' | 'separate-pngs'>('standard-4x3');

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptDetails, setShowPromptDetails] = useState(false);

  const [detectedBgColor, setDetectedBgColor] = useState<string | null>(null);

  // Crops and history
  const [crops, setCrops] = useState<CropOverlayItem[]>([]);
  const [history, setHistory] = useState<CropOverlayItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cropThumbnails, setCropThumbnails] = useState<Map<string, string>>(new Map());

  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [editingCrop, setEditingCrop] = useState<CropOverlayItem | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(STANDARD_MOUTH_SHEET_PROMPT);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      // fallback
    }
  };

  const pushHistory = (newCrops: CropOverlayItem[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newCrops);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setCrops(newCrops);
    regenerateThumbnails(newCrops);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCrops(prev);
      regenerateThumbnails(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCrops(next);
      regenerateThumbnails(next);
    }
  };

  const regenerateThumbnails = async (cropList: CropOverlayItem[], imageToUse?: HTMLImageElement) => {
    const img = imageToUse || sourceImg;
    if (!img) return;

    const thumbMap = new Map<string, string>();
    for (const crop of cropList) {
      try {
        const { blob } = await extractCropToBlob(img, crop.rect);
        const url = URL.createObjectURL(blob);
        thumbMap.set(crop.id, url);
      } catch (e) {
        console.warn('Failed to generate thumbnail for crop', crop.id, e);
      }
    }
    setCropThumbnails(thumbMap);
  };

  const handleSpriteSheetFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const { img } = await validateAndLoadImageBlob(file);
      setSourceBlob(file);
      setSourceImg(img);

      // Check background
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const bgAnalysis = analyzeImageBackground(imgData);

        if (!bgAnalysis.isTransparent && bgAnalysis.solidColor) {
          setDetectedBgColor(bgAnalysis.solidColor.hex);
        } else {
          setDetectedBgColor(null);
        }

        // Detect whether 4x3 (2048x1536) or 3x3
        const aspect = img.naturalWidth / img.naturalHeight;
        const is4x3 = Math.abs(aspect - 4 / 3) < 0.15 || (img.naturalWidth === 2048 && img.naturalHeight === 1536);
        const selectedMode = is4x3 ? 'standard-4x3' : 'standard-3x3';
        setMode(selectedMode);

        const cols = is4x3 ? 4 : 3;
        const rows = 3;
        const labels = is4x3 ? STANDARD_4X3_TEMPLATE.expectedOrder : DEFAULT_STANDARD_TEMPLATE.expectedOrder;

        const detected = generateGridCrops(
          img.naturalWidth,
          img.naturalHeight,
          cols,
          rows,
          labels
        );

        const cropItems: CropOverlayItem[] = detected.map((d) => {
          const validation = validateCropContent(imgData, d.rect);
          return {
            id: generateId('crop'),
            label: d.label,
            rect: d.rect,
            warning: validation.warning,
          };
        });

        pushHistory(cropItems);
        await regenerateThumbnails(cropItems, img);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process sprite sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleSeparatePngFiles = async (files: FileList) => {
    setError(null);
    setLoading(true);
    try {
      const newCrops: CropOverlayItem[] = [];
      const thumbMap = new Map<string, string>();

      const defaultLabels = STANDARD_4X3_TEMPLATE.expectedOrder;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { img } = await validateAndLoadImageBlob(file);
        const cropId = generateId('crop');

        // Extract label from filename (e.g. "A.png" -> "A")
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
        const matchedLabel =
          defaultLabels.find((l) => nameWithoutExt === l || nameWithoutExt.startsWith(l)) ||
          defaultLabels[i] ||
          `Shape_${i + 1}`;

        newCrops.push({
          id: cropId,
          label: matchedLabel,
          rect: { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight },
        });

        const url = URL.createObjectURL(file);
        thumbMap.set(cropId, url);
      }

      setMode('separate-pngs');
      setCrops(newCrops);
      setCropThumbnails(thumbMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load individual PNGs');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDetectionMode = (newMode: 'standard-4x3' | 'standard-3x3' | 'auto') => {
    if (!sourceImg) return;
    setMode(newMode);

    const canvas = document.createElement('canvas');
    canvas.width = sourceImg.naturalWidth;
    canvas.height = sourceImg.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(sourceImg, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (newMode === 'standard-4x3') {
      const grid = generateGridCrops(canvas.width, canvas.height, 4, 3, STANDARD_4X3_TEMPLATE.expectedOrder);
      const items: CropOverlayItem[] = grid.map((d) => {
        const val = validateCropContent(imgData, d.rect);
        return {
          id: generateId('crop'),
          label: d.label,
          rect: d.rect,
          warning: val.warning,
        };
      });
      pushHistory(items);
    } else if (newMode === 'standard-3x3') {
      const grid = generateGridCrops(canvas.width, canvas.height, 3, 3, DEFAULT_STANDARD_TEMPLATE.expectedOrder);
      const items: CropOverlayItem[] = grid.map((d) => {
        const val = validateCropContent(imgData, d.rect);
        return {
          id: generateId('crop'),
          label: d.label,
          rect: d.rect,
          warning: val.warning,
        };
      });
      pushHistory(items);
    } else {
      // Auto segmentation
      const regions = detectMouthRegions(imgData);
      const defaultLabels = STANDARD_4X3_TEMPLATE.expectedOrder;
      const items: CropOverlayItem[] = regions.map((rect, idx) => {
        const val = validateCropContent(imgData, rect);
        return {
          id: generateId('crop'),
          label: defaultLabels[idx] || `Shape_${idx + 1}`,
          rect,
          warning: val.warning,
        };
      });
      pushHistory(items);
    }
  };

  const handleFinalSave = async () => {
    if (crops.length === 0) {
      setError('Please import or extract at least one mouth shape.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const assets: ExtractedMouthPayload['assets'] = [];

      if (sourceImg) {
        for (const crop of crops) {
          const { blob, width, height } = await extractCropToBlob(sourceImg, crop.rect);
          assets.push({
            label: crop.label,
            imageBlob: blob,
            cropRect: crop.rect,
            width,
            height,
            anchorX: STANDARD_MOUTH_ANCHOR_X, // 0.50 (256/512 or 512/1024)
            anchorY: STANDARD_MOUTH_ANCHOR_Y, // 0.46875 (240/512 or 480/1024)
            warning: crop.warning,
          });
        }
      }

      await onSaveCollection({
        name: collectionName.trim() || 'Mouth Collection',
        templateType: mode === 'standard-4x3' ? 'standard-4x3' : mode === 'standard-3x3' ? 'standard-template' : mode === 'auto' ? 'detected' : 'manifest',
        sourceSheetBlob: sourceBlob || undefined,
        sourceSheetWidth: sourceImg?.naturalWidth,
        sourceSheetHeight: sourceImg?.naturalHeight,
        assets,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mouth collection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {/* Collection Name & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Mouth Collection Name
          </label>
          <input
            type="text"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            className="text-base font-bold text-slate-900 bg-transparent border-b border-slate-300 focus:border-indigo-600 focus:outline-none px-1"
          />
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleFinalSave}
            disabled={crops.length === 0}
            loading={saving}
            icon={<Check className="w-4 h-4" />}
          >
            Confirm & Save Collection ({crops.length} Mouths)
          </Button>
        </div>
      </div>

      {/* AI Sprite Sheet Generator Prompt helper */}
      <div className="bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 rounded-2xl border border-indigo-100 p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                AI Mouth Sprite Sheet Prompt
              </h4>
              <p className="text-xs text-slate-500">
                Standard 2048×1536 (4×3) grid with anchor at (256, 240) per 512×512 cell, aligning with character anchor (50%, 34.375%).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPromptDetails(!showPromptDetails)}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              <span>{showPromptDetails ? 'Hide Details' : 'View Prompt'}</span>
              {showPromptDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPrompt}
              icon={copiedPrompt ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-indigo-600" />}
            >
              {copiedPrompt ? 'Copied Prompt!' : 'Copy AI Prompt'}
            </Button>
          </div>
        </div>

        {showPromptDetails && (
          <div className="mt-3 pt-3 border-t border-indigo-100/70 text-xs text-slate-700 bg-white/90 p-3.5 rounded-xl font-mono whitespace-pre-wrap leading-relaxed select-all border border-slate-200">
            {STANDARD_MOUTH_SHEET_PROMPT}
          </div>
        )}
      </div>

      {loading && <LoadingIndicator label="Extracting and validating mouth shapes..." />}

      {!loading && !sourceImg && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A: Standard Sprite Sheet */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white p-8 rounded-2xl flex flex-col items-center text-center cursor-pointer transition-colors group shadow-2xs"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/webp,image/jpeg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleSpriteSheetFile(e.target.files[0]);
                }
              }}
            />
            <div className="p-4 bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 rounded-2xl mb-4 transition-colors">
              <Grid className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Standard Mouth Sprite Sheet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Upload a standard 4×3 (2048×1536) or 3×3 grid of Rhubarb mouth shapes (X, A through O) with alpha transparency.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
              <Upload className="w-4 h-4" /> Browse or drop sprite sheet
            </span>
          </div>

          {/* Option B: Separate PNGs */}
          <div
            onClick={() => multiFileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white p-8 rounded-2xl flex flex-col items-center text-center cursor-pointer transition-colors group shadow-2xs"
          >
            <input
              ref={multiFileInputRef}
              type="file"
              multiple
              accept="image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleSeparatePngFiles(e.target.files);
                }
              }}
            />
            <div className="p-4 bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 rounded-2xl mb-4 transition-colors">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Individual Mouth PNGs</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Select multiple transparent PNG files (1024×1024 with anchor at 512, 480 or custom) for zero cropping error.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <Upload className="w-4 h-4" /> Select multiple PNGs
            </span>
          </div>
        </div>
      )}

      {/* When Sprite Sheet is Loaded */}
      {sourceImg && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 uppercase">Detection Mode:</span>
              <button
                onClick={() => handleApplyDetectionMode('standard-4x3')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'standard-4x3'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Standard 4×3 Grid (2048×1536)
              </button>
              <button
                onClick={() => handleApplyDetectionMode('standard-3x3')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'standard-3x3'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Standard 3×3 Grid
              </button>
              <button
                onClick={() => handleApplyDetectionMode('auto')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'auto'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Auto Segment Islands
              </button>
            </div>

            {detectedBgColor && (
              <div className="flex items-center gap-2 text-xs bg-amber-50 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Solid background detected ({detectedBgColor})</span>
              </div>
            )}
          </div>

          {/* Grid Review Section (Mandatory: All detected crops shown together) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <CropReviewGrid
              crops={crops}
              selectedCropId={selectedCropId}
              onSelectCrop={(id) => {
                setSelectedCropId(id);
                const found = crops.find((c) => c.id === id);
                if (found) setEditingCrop(found);
              }}
              onUpdateLabel={(id, newLabel) => {
                const next = crops.map((c) => (c.id === id ? { ...c, label: newLabel } : c));
                pushHistory(next);
              }}
              onDeleteCrop={(id) => {
                const next = crops.filter((c) => c.id !== id);
                pushHistory(next);
              }}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              onUndo={handleUndo}
              onRedo={handleRedo}
              cropThumbnails={cropThumbnails}
            />
          </div>

          {/* Source Sheet Preview with Overlays */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Source Sheet Overview
              </span>
              <span className="text-xs text-slate-400">
                {sourceImg.naturalWidth} × {sourceImg.naturalHeight} px
              </span>
            </div>
            <SpriteSheetPreview
              sourceImage={sourceImg}
              crops={crops}
              selectedCropId={selectedCropId}
              onSelectCrop={(id) => {
                setSelectedCropId(id);
                const found = crops.find((c) => c.id === id);
                if (found) setEditingCrop(found);
              }}
            />
          </div>
        </div>
      )}

      {/* Individual Crop Fine-Tune Modal */}
      <Modal
        isOpen={!!editingCrop}
        onClose={() => setEditingCrop(null)}
        title="Fine-Tune Crop Boundaries"
        maxWidth="md"
      >
        {editingCrop && sourceImg && (
          <CropEditor
            sourceImage={sourceImg}
            initialRect={editingCrop.rect}
            label={editingCrop.label}
            onSave={(newRect) => {
              const next = crops.map((c) =>
                c.id === editingCrop.id ? { ...c, rect: newRect, warning: undefined } : c
              );
              pushHistory(next);
              setEditingCrop(null);
            }}
            onCancel={() => setEditingCrop(null)}
          />
        )}
      </Modal>
    </div>
  );
};
