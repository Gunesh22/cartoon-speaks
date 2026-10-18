import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Grid,
  Layers,
  Eye,
  Crosshair,
  Sliders,
  Check,
  RotateCcw,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Maximize2,
  ShieldCheck,
  Info,
  Trash2,
} from 'lucide-react';
import { Button } from '../common/Button';
import { MouthAsset, MouthCollection, STANDARD_MOUTH_ANCHOR_X, STANDARD_MOUTH_ANCHOR_Y } from '../../types/mouth';
import { Character } from '../../types/character';
import { mouthRepository } from '../../services/storage/mouthRepository';
import { analyzeSpriteImage, SpriteAnalysisResult } from '../../services/image/spriteAnalyzer';
import { padSpriteImage } from '../../services/image/paddingService';
import { imageCache } from '../../services/image/imageLoader';
import { calculateCharacterCanvasBounds, calculateMouthCanvasBounds } from '../../utils/coordinateUtils';

export type DebuggerMode = 'grid' | 'overlay' | 'preview' | 'editor';

export interface MouthAlignmentDebuggerProps {
  collection: MouthCollection;
  assets: MouthAsset[];
  character?: Character | null;
  characterImg?: HTMLImageElement | null;
  onAssetsUpdated: () => void;
}

export const MouthAlignmentDebugger: React.FC<MouthAlignmentDebuggerProps> = ({
  collection,
  assets,
  character,
  characterImg,
  onAssetsUpdated,
}) => {
  const [mode, setMode] = useState<DebuggerMode>('grid');
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || '');
  const [analysisMap, setAnalysisMap] = useState<Map<string, SpriteAnalysisResult>>(new Map());
  const [imageElements, setImageElements] = useState<Map<string, HTMLImageElement>>(new Map());

  // Overlay state
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.4);
  const [overlayZoom, setOverlayZoom] = useState<number>(2.0);
  const [activeOverlayShapes, setActiveOverlayShapes] = useState<Set<string>>(new Set(assets.map((a) => a.id)));
  const [showHorizontalRefLine, setShowHorizontalRefLine] = useState<boolean>(true);
  const [showVerticalRefLine, setShowVerticalRefLine] = useState<boolean>(true);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);

  // Live Stepper state
  const [stepperShapeLabel, setStepperShapeLabel] = useState<string>('X');
  const [isAutoCycling, setIsAutoCycling] = useState<boolean>(false);
  const [cycleIntervalMs, setCycleIntervalMs] = useState<number>(350);

  // Anchor Editor state
  const [tempAnchorX, setTempAnchorX] = useState<number>(0.5);
  const [tempAnchorY, setTempAnchorY] = useState<number>(0.46875);
  const [isDraggingAnchor, setIsDraggingAnchor] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Padding tool state
  const [showPaddingModal, setShowPaddingModal] = useState<boolean>(false);
  const [padTop, setPadTop] = useState<number>(20);
  const [padBottom, setPadBottom] = useState<number>(20);
  const [padLeft, setPadLeft] = useState<number>(20);
  const [padRight, setPadRight] = useState<number>(20);
  const [isPadding, setIsPadding] = useState<boolean>(false);

  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const editorCanvasRef = useRef<HTMLCanvasElement>(null);

  const selectedAsset = useMemo(() => {
    return assets.find((a) => a.id === selectedAssetId) || assets[0];
  }, [assets, selectedAssetId]);

  // Load image elements and run sprite analysis via imageCache
  useEffect(() => {
    let active = true;
    const loadedImages = new Map<string, HTMLImageElement>();
    const analyses = new Map<string, SpriteAnalysisResult>();

    Promise.all(
      assets.map(async (asset) => {
        try {
          const img = await imageCache.getLoadedImage(asset.id, asset.imageBlob);
          if (!active) return;
          loadedImages.set(asset.id, img);
          const analysis = analyzeSpriteImage(
            img,
            asset.anchorX ?? STANDARD_MOUTH_ANCHOR_X,
            asset.anchorY ?? STANDARD_MOUTH_ANCHOR_Y
          );
          analyses.set(asset.id, analysis);
        } catch (e) {
          console.warn('Failed to load asset image in debugger', asset.label, e);
        }
      })
    ).then(() => {
      if (!active) return;
      setImageElements(loadedImages);
      setAnalysisMap(analyses);
    });

    return () => {
      active = false;
    };
  }, [assets]);

  // Update temp anchor when selected asset changes
  useEffect(() => {
    if (selectedAsset) {
      setTempAnchorX(selectedAsset.anchorX ?? STANDARD_MOUTH_ANCHOR_X);
      setTempAnchorY(selectedAsset.anchorY ?? STANDARD_MOUTH_ANCHOR_Y);
    }
  }, [selectedAsset]);

  // Handle auto cycling
  useEffect(() => {
    if (!isAutoCycling || assets.length === 0) return;
    const interval = setInterval(() => {
      setStepperShapeLabel((curr) => {
        const labels = assets.map((a) => a.label);
        const idx = labels.indexOf(curr);
        const nextIdx = (idx + 1) % labels.length;
        return labels[nextIdx];
      });
    }, cycleIntervalMs);
    return () => clearInterval(interval);
  }, [isAutoCycling, assets, cycleIntervalMs]);

  // -------------------------------------------------------------
  // Render: Overlay Canvas
  // -------------------------------------------------------------
  useEffect(() => {
    if (mode !== 'overlay' || !overlayCanvasRef.current) return;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 600;
    const height = 450;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Draw dark background with faint grid
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 20 * overlayZoom;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Shared anchor center point on canvas
    const sharedAnchorX = width / 2;
    const sharedAnchorY = height / 2 - 20;

    // Draw all active mouth shapes layered with shared anchor aligned at (sharedAnchorX, sharedAnchorY)
    assets.forEach((asset, idx) => {
      if (!activeOverlayShapes.has(asset.id)) return;
      const img = imageElements.get(asset.id);
      if (!img) return;

      const aX = asset.anchorX ?? STANDARD_MOUTH_ANCHOR_X;
      const aY = asset.anchorY ?? STANDARD_MOUTH_ANCHOR_Y;

      const renderedW = asset.width * (overlayZoom * 0.4);
      const renderedH = asset.height * (overlayZoom * 0.4);

      const drawX = sharedAnchorX - aX * renderedW;
      const drawY = sharedAnchorY - aY * renderedH;

      ctx.save();
      ctx.globalAlpha = overlayOpacity;
      ctx.drawImage(img, drawX, drawY, renderedW, renderedH);

      // Bounding box if enabled
      if (showBoundingBoxes) {
        ctx.strokeStyle = `hsl(${(idx * 55) % 360}, 80%, 65%)`;
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX, drawY, renderedW, renderedH);
      }
      ctx.restore();
    });

    // Reference lines
    if (showHorizontalRefLine) {
      // Upper lip reference line
      ctx.save();
      ctx.strokeStyle = '#10b981'; // green
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, sharedAnchorY);
      ctx.lineTo(width, sharedAnchorY);
      ctx.stroke();
      ctx.restore();

      // Label
      ctx.fillStyle = '#10b981';
      ctx.font = '10px monospace';
      ctx.fillText('Upper Lip Alignment Baseline', 12, sharedAnchorY - 6);
    }

    if (showVerticalRefLine) {
      // Center vertical reference line
      ctx.save();
      ctx.strokeStyle = '#38bdf8'; // blue
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(sharedAnchorX, 0);
      ctx.lineTo(sharedAnchorX, height);
      ctx.stroke();
      ctx.restore();
    }

    // Shared Reference Anchor Point (Green Target Crosshair)
    ctx.save();
    ctx.strokeStyle = '#22c55e';
    ctx.fillStyle = '#22c55e';
    ctx.lineWidth = 2;
    // Crosshair circle
    ctx.beginPath();
    ctx.arc(sharedAnchorX, sharedAnchorY, 7, 0, Math.PI * 2);
    ctx.stroke();
    // Crosshair dot
    ctx.beginPath();
    ctx.arc(sharedAnchorX, sharedAnchorY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Crosshair ticks
    ctx.beginPath();
    ctx.moveTo(sharedAnchorX - 12, sharedAnchorY);
    ctx.lineTo(sharedAnchorX + 12, sharedAnchorY);
    ctx.moveTo(sharedAnchorX, sharedAnchorY - 12);
    ctx.lineTo(sharedAnchorX, sharedAnchorY + 12);
    ctx.stroke();
    ctx.restore();
  }, [
    mode,
    assets,
    imageElements,
    activeOverlayShapes,
    overlayOpacity,
    overlayZoom,
    showHorizontalRefLine,
    showVerticalRefLine,
    showBoundingBoxes,
  ]);

  // -------------------------------------------------------------
  // Render: Live Stepper Preview Canvas
  // -------------------------------------------------------------
  useEffect(() => {
    if (mode !== 'preview' || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 600;
    const height = 450;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Light neutral studio background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    if (!character || !characterImg) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Select or upload a character to view live alignment stepper', width / 2, height / 2);
      return;
    }

    const charBounds = calculateCharacterCanvasBounds(
      character.imageWidth,
      character.imageHeight,
      width,
      height,
      'contain'
    );

    // 1. Draw Character
    ctx.drawImage(characterImg, charBounds.x, charBounds.y, charBounds.width, charBounds.height);

    // 2. Resolve Active Mouth Shape
    const activeAsset =
      assets.find((a) => a.label.toUpperCase() === stepperShapeLabel.toUpperCase()) ||
      assets[0];
    const mouthImg = activeAsset ? imageElements.get(activeAsset.id) : null;

    if (activeAsset && mouthImg) {
      const mouthBounds = calculateMouthCanvasBounds(
        charBounds,
        activeAsset.width,
        activeAsset.height,
        character.placement,
        {
          anchorX: activeAsset.anchorX ?? STANDARD_MOUTH_ANCHOR_X,
          anchorY: activeAsset.anchorY ?? STANDARD_MOUTH_ANCHOR_Y,
        }
      );

      // Draw Mouth translated to target character anchor
      ctx.save();
      ctx.translate(mouthBounds.targetX, mouthBounds.targetY);
      if (mouthBounds.rotation !== 0) {
        ctx.rotate((mouthBounds.rotation * Math.PI) / 180);
      }
      ctx.drawImage(
        mouthImg,
        -mouthBounds.anchorOffsetX,
        -mouthBounds.anchorOffsetY,
        mouthBounds.width,
        mouthBounds.height
      );
      ctx.restore();

      // Diagnostic Guides on character
      // Character target anchor (Green crosshair)
      ctx.save();
      ctx.translate(mouthBounds.targetX, mouthBounds.targetY);
      if (mouthBounds.rotation !== 0) {
        ctx.rotate((mouthBounds.rotation * Math.PI) / 180);
      }

      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();

      // Crosshair ticks aligned with rotation
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(16, 0);
      ctx.moveTo(0, -16);
      ctx.lineTo(0, 16);
      ctx.stroke();

      // Horizontal reference baseline across the upper lip
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(-charBounds.width / 2, 0);
      ctx.lineTo(charBounds.width / 2, 0);
      ctx.stroke();

      // Mouth bounding box
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(
        -mouthBounds.anchorOffsetX,
        -mouthBounds.anchorOffsetY,
        mouthBounds.width,
        mouthBounds.height
      );
      ctx.restore();
    }
  }, [mode, character, characterImg, stepperShapeLabel, assets, imageElements]);

  // -------------------------------------------------------------
  // Render: Anchor Editor Canvas
  // -------------------------------------------------------------
  useEffect(() => {
    if (mode !== 'editor' || !editorCanvasRef.current || !selectedAsset) return;
    const canvas = editorCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 450;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Checkerboard pattern for genuine alpha transparency
    const checkSize = 12;
    for (let y = 0; y < height; y += checkSize) {
      for (let x = 0; x < width; x += checkSize) {
        ctx.fillStyle = ((x / checkSize) + (y / checkSize)) % 2 === 0 ? '#f1f5f9' : '#e2e8f0';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    const img = imageElements.get(selectedAsset.id);
    if (!img) return;

    // Center and scale image in editor canvas
    const padding = 40;
    const availW = width - padding * 2;
    const availH = height - padding * 2;
    const scale = Math.min(availW / selectedAsset.width, availH / selectedAsset.height, 2.5);

    const renderW = selectedAsset.width * scale;
    const renderH = selectedAsset.height * scale;
    const renderX = (width - renderW) / 2;
    const renderY = (height - renderH) / 2;

    // Draw image
    ctx.drawImage(img, renderX, renderY, renderW, renderH);

    // Draw Content Bounds (green dashed box)
    const analysis = analysisMap.get(selectedAsset.id);
    if (analysis && analysis.contentBounds) {
      ctx.save();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      const cbX = renderX + (analysis.contentBounds.minX / selectedAsset.width) * renderW;
      const cbY = renderY + (analysis.contentBounds.minY / selectedAsset.height) * renderH;
      const cbW = (analysis.contentBounds.width / selectedAsset.width) * renderW;
      const cbH = (analysis.contentBounds.height / selectedAsset.height) * renderH;
      ctx.strokeRect(cbX, cbY, cbW, cbH);
      ctx.restore();
    }

    // Draw sprite border (dark outline)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(renderX, renderY, renderW, renderH);

    // Anchor coordinates in canvas pixel space
    const anchorPxX = renderX + tempAnchorX * renderW;
    const anchorPxY = renderY + tempAnchorY * renderH;

    // Horizontal & vertical guide lines through anchor
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(renderX, anchorPxY);
    ctx.lineTo(renderX + renderW, anchorPxY);
    ctx.moveTo(anchorPxX, renderY);
    ctx.lineTo(anchorPxX, renderY + renderH);
    ctx.stroke();
    ctx.restore();

    // High-contrast Anchor marker (Red Target Crosshair)
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.arc(anchorPxX, anchorPxY, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(anchorPxX, anchorPxY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(anchorPxX - 16, anchorPxY);
    ctx.lineTo(anchorPxX + 16, anchorPxY);
    ctx.moveTo(anchorPxX, anchorPxY - 16);
    ctx.lineTo(anchorPxX, anchorPxY + 16);
    ctx.stroke();
    ctx.restore();
  }, [mode, selectedAsset, tempAnchorX, tempAnchorY, imageElements, analysisMap]);

  // Handle canvas mouse drag on editor canvas
  const handleEditorCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDraggingAnchor(true);
    updateAnchorFromMouse(e);
  };

  const handleEditorCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingAnchor) return;
    updateAnchorFromMouse(e);
  };

  const handleEditorCanvasMouseUp = () => {
    setIsDraggingAnchor(false);
  };

  const updateAnchorFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editorCanvasRef.current || !selectedAsset) return;
    const canvas = editorCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = 450;
    const height = 400;
    const padding = 40;
    const availW = width - padding * 2;
    const availH = height - padding * 2;
    const scale = Math.min(availW / selectedAsset.width, availH / selectedAsset.height, 2.5);

    const renderW = selectedAsset.width * scale;
    const renderH = selectedAsset.height * scale;
    const renderX = (width - renderW) / 2;
    const renderY = (height - renderH) / 2;

    const normX = Math.max(0, Math.min(1, (mouseX - renderX) / renderW));
    const normY = Math.max(0, Math.min(1, (mouseY - renderY) / renderH));

    setTempAnchorX(Number(normX.toFixed(4)));
    setTempAnchorY(Number(normY.toFixed(4)));
  };

  // Save anchor for currently selected asset
  const handleSaveCurrentAnchor = async () => {
    if (!selectedAsset) return;
    try {
      await mouthRepository.updateAssetAnchor(selectedAsset.id, tempAnchorX, tempAnchorY);
      setSaveSuccessMessage(`Saved anchor for "${selectedAsset.label}"!`);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
      onAssetsUpdated();
    } catch (err) {
      console.error('Failed to save anchor', err);
    }
  };

  // Apply anchor to all mouth assets in collection
  const handleApplyAnchorToAll = async () => {
    if (assets.length === 0) return;
    try {
      const updates = assets.map((a) => ({
        id: a.id,
        anchorX: tempAnchorX,
        anchorY: tempAnchorY,
      }));
      await mouthRepository.batchUpdateAnchors(updates);
      setSaveSuccessMessage(`Applied anchor (${(tempAnchorX * 100).toFixed(1)}%, ${(tempAnchorY * 100).toFixed(1)}%) to all ${assets.length} mouths!`);
      setTimeout(() => setSaveSuccessMessage(null), 3500);
      onAssetsUpdated();
    } catch (err) {
      console.error('Failed to apply anchors to all', err);
    }
  };

  // Snap anchor to upper lip estimation
  const handleSnapToUpperLip = () => {
    if (!selectedAsset) return;
    const analysis = analysisMap.get(selectedAsset.id);
    if (analysis && analysis.upperLipEstimate) {
      setTempAnchorX(analysis.upperLipEstimate.anchorX);
      setTempAnchorY(analysis.upperLipEstimate.anchorY);
    }
  };

  // Reset anchor to standard default
  const handleResetAnchorToDefault = () => {
    setTempAnchorX(STANDARD_MOUTH_ANCHOR_X);
    setTempAnchorY(STANDARD_MOUTH_ANCHOR_Y);
  };

  // Apply transparent padding
  const handleApplyPadding = async () => {
    if (!selectedAsset) return;
    setIsPadding(true);
    try {
      const result = await padSpriteImage({
        sourceBlob: selectedAsset.imageBlob,
        top: padTop,
        right: padRight,
        bottom: padBottom,
        left: padLeft,
        currentAnchorX: selectedAsset.anchorX ?? STANDARD_MOUTH_ANCHOR_X,
        currentAnchorY: selectedAsset.anchorY ?? STANDARD_MOUTH_ANCHOR_Y,
      });

      imageCache.release(selectedAsset.id);
      await mouthRepository.updateAssetPadded(
        selectedAsset.id,
        result.newBlob,
        result.newWidth,
        result.newHeight,
        result.newAnchorX,
        result.newAnchorY
      );

      setShowPaddingModal(false);
      setSaveSuccessMessage(`Added transparent padding to shape "${selectedAsset.label}"!`);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
      onAssetsUpdated();
    } catch (err) {
      console.error('Failed to pad sprite', err);
    } finally {
      setIsPadding(false);
    }
  };

  // Delete an unwanted or blank mouth asset from collection
  const handleDeleteAsset = async (assetId: string, label: string) => {
    if (!window.confirm(`Are you sure you want to delete mouth shape "${label}" from this collection?`)) {
      return;
    }
    try {
      imageCache.release(assetId);
      await mouthRepository.deleteAsset(assetId);
      setSaveSuccessMessage(`Deleted shape "${label}" from collection.`);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
      if (selectedAssetId === assetId) {
        const remaining = assets.filter((a) => a.id !== assetId);
        if (remaining.length > 0) {
          setSelectedAssetId(remaining[0].id);
        }
      }
      onAssetsUpdated();
    } catch (err) {
      console.error('Failed to delete mouth shape', err);
    }
  };

  const totalWarnings = useMemo(() => {
    let count = 0;
    analysisMap.forEach((res) => {
      if (res.warning) count++;
    });
    return count;
  }, [analysisMap]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      {/* Top Header & Mode Navigation */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-indigo-600" />
              Mouth Sprite Alignment Debugger
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-800">
              {collection.name} ({assets.length} mouths)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare mouth shapes on a shared reference anchor to diagnose jumps, cropping shifts, and vertical misalignment.
          </p>
        </div>

        {/* Tab mode buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
          <button
            onClick={() => setMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'grid'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>1. Sprite Grid</span>
          </button>

          <button
            onClick={() => setMode('overlay')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'overlay'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Overlay Comparison</span>
          </button>

          <button
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'preview'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>3. Live Stepper</span>
          </button>

          <button
            onClick={() => setMode('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'editor'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>4. Anchor Tuning</span>
          </button>
        </div>
      </div>

      {/* Diagnostic Health Banner */}
      <div className="px-5 py-2.5 bg-indigo-50/50 border-b border-indigo-100/60 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-indigo-950">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Anchor Architecture: <strong className="font-semibold text-indigo-900">Upper-Lip Reference Anchor</strong>
          </span>

          <span className="text-slate-500">|</span>

          <span className="text-slate-600">
            Standard Reference: <strong>50.0% X, 46.875% Y (256, 240px)</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {totalWarnings > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5" />
              {totalWarnings} shapes need review
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All mouth anchors verified
            </span>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessMessage && (
        <div className="bg-emerald-50 text-emerald-800 text-xs px-5 py-2 border-b border-emerald-200 flex items-center justify-between font-semibold">
          <span>{saveSuccessMessage}</span>
          <button onClick={() => setSaveSuccessMessage(null)} className="text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 1: SPRITE GRID */}
      {/* ------------------------------------------------------------- */}
      {mode === 'grid' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Inspect all mouth shapes in the collection. Click any shape to tune its anchor or add transparent padding.
            </span>
            <span>Total: {assets.length} mouth assets</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {assets.map((asset) => {
              const analysis = analysisMap.get(asset.id);
              const anchorX = asset.anchorX ?? STANDARD_MOUTH_ANCHOR_X;
              const anchorY = asset.anchorY ?? STANDARD_MOUTH_ANCHOR_Y;
              const isSelected = selectedAssetId === asset.id;

              return (
                <div
                  key={asset.id}
                  onClick={() => {
                    setSelectedAssetId(asset.id);
                    setMode('editor');
                  }}
                  className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {asset.label}
                    </span>
                    {analysis?.warning ? (
                      <span title={analysis.warning} className="text-amber-500">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                    ) : (
                      <span title="Anchor aligned" className="text-emerald-500">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    )}
                  </div>

                  {/* Thumbnail with checkerboard & anchor crosshair */}
                  <div className="relative aspect-square w-full rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center my-1.5">
                    {/* Checkerboard */}
                    <div
                      className="absolute inset-0 opacity-40"
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
                        backgroundSize: '12px 12px',
                        backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                      }}
                    />

                    {analysis && analysis.contentBounds.width === 0 ? (
                      <div className="relative z-10 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                        <AlertTriangle className="w-5 h-5 text-amber-500 mb-1" />
                        <span className="text-[10px] font-bold text-amber-800">Blank Cell</span>
                        <span className="text-[9px] text-slate-400">100% transparent</span>
                      </div>
                    ) : (
                      <img
                        src={imageCache.getObjectUrl(asset.id, asset.imageBlob)}
                        alt={asset.label}
                        className="relative z-10 max-w-[85%] max-h-[85%] object-contain pointer-events-none"
                      />
                    )}

                    {/* Red anchor dot */}
                    <div
                      className="absolute z-20 w-3 h-3 rounded-full border-2 border-red-600 bg-red-400/80 -translate-x-1/2 -translate-y-1/2 shadow-xs pointer-events-none"
                      style={{
                        left: `${anchorX * 100}%`,
                        top: `${anchorY * 100}%`,
                      }}
                      title={`Anchor: ${(anchorX * 100).toFixed(1)}%, ${(anchorY * 100).toFixed(1)}%`}
                    />
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1 pt-1.5 text-[11px] text-slate-500 border-t border-slate-100">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span>Size:</span>
                      <strong className="text-slate-700">{asset.width}×{asset.height}px</strong>
                    </div>

                    <div className="flex justify-between font-mono text-[10px]">
                      <span>Anchor:</span>
                      <strong className="text-indigo-600">
                        {(anchorX * 100).toFixed(1)}%, {(anchorY * 100).toFixed(1)}%
                      </strong>
                    </div>

                    {analysis?.padding && (
                      <div className="flex justify-between font-mono text-[9px] text-slate-400">
                        <span>Pad T/B:</span>
                        <span>{analysis.padding.top}px / {analysis.padding.bottom}px</span>
                      </div>
                    )}

                    {(analysis?.contentBounds.width === 0 || asset.label.startsWith('EXTRA_')) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAsset(asset.id, asset.label);
                        }}
                        className="mt-2 w-full flex items-center justify-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/60 rounded-md py-1 transition-colors"
                        title={`Delete ${asset.label}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete Cell</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 2: OVERLAY COMPARISON */}
      {/* ------------------------------------------------------------- */}
      {mode === 'overlay' && (
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Overlay Canvas */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center bg-slate-900 rounded-2xl p-4 overflow-hidden shadow-inner relative">
            <canvas
              ref={overlayCanvasRef}
              className="max-w-full rounded-xl border border-slate-700 shadow-2xl"
            />

            <div className="absolute top-6 left-6 flex items-center gap-2 bg-slate-800/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Green Target: Shared Anchor Center</span>
            </div>

            <div className="absolute top-6 right-6 flex items-center gap-1.5 bg-slate-800/90 backdrop-blur p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setOverlayZoom((z) => Math.max(1.0, z - 0.25))}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-200 px-1">
                {(overlayZoom * 100).toFixed(0)}%
              </span>
              <button
                onClick={() => setOverlayZoom((z) => Math.min(4.0, z + 0.25))}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Overlay Controls & Shape Selectors */}
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Overlay Controls
              </h4>

              {/* Opacity slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>Layer Opacity</span>
                  <span className="font-mono font-bold text-indigo-600">
                    {Math.round(overlayOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Guide toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-200 text-xs text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHorizontalRefLine}
                    onChange={(e) => setShowHorizontalRefLine(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Show Upper-Lip Baseline (Green line)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showVerticalRefLine}
                    onChange={(e) => setShowVerticalRefLine(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Show Centerline (Blue line)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBoundingBoxes}
                    onChange={(e) => setShowBoundingBoxes(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Show Shape Bounding Outlines</span>
                </label>
              </div>
            </div>

            {/* Shape Visibility Selector */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Active Layers
                </h4>
                <div className="flex gap-2 text-[11px]">
                  <button
                    onClick={() => setActiveOverlayShapes(new Set(assets.map((a) => a.id)))}
                    className="text-indigo-600 hover:underline font-semibold"
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveOverlayShapes(new Set())}
                    className="text-slate-400 hover:underline"
                  >
                    None
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {assets.map((a) => {
                  const isActive = activeOverlayShapes.has(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        const next = new Set(activeOverlayShapes);
                        if (next.has(a.id)) next.delete(a.id);
                        else next.add(a.id);
                        setActiveOverlayShapes(next);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{a.label}</span>
                      <span className="text-[10px] opacity-75 font-mono">
                        {(a.anchorY ?? STANDARD_MOUTH_ANCHOR_Y).toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 3: LIVE STEPPER PREVIEW */}
      {/* ------------------------------------------------------------- */}
      {mode === 'preview' && (
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stationary Character Live Preview Canvas */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center bg-slate-100 rounded-2xl p-4 overflow-hidden shadow-inner relative border border-slate-200">
            <canvas
              ref={previewCanvasRef}
              className="max-w-full rounded-xl shadow-lg border border-slate-300"
            />

            <div className="absolute top-6 left-6 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Camera & Character Completely Stationary</span>
            </div>

            <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-indigo-700 shadow-xs">
              <span>Active Shape: {stepperShapeLabel}</span>
            </div>
          </div>

          {/* Stepper Controls */}
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Cycle & Step Shapes
                </h4>
                <button
                  onClick={() => setIsAutoCycling(!isAutoCycling)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                    isAutoCycling
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isAutoCycling ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isAutoCycling ? 'Pause Cycle' : 'Auto Cycle Shapes'}</span>
                </button>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Cycle Interval</span>
                  <span className="font-mono font-bold text-indigo-600">{cycleIntervalMs}ms</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="800"
                  step="50"
                  value={cycleIntervalMs}
                  onChange={(e) => setCycleIntervalMs(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Direct Shape Selector Buttons */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Click to switch shape:
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {assets.map((a) => {
                    const isSelected = stepperShapeLabel.toUpperCase() === a.label.toUpperCase();
                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          setIsAutoCycling(false);
                          setStepperShapeLabel(a.label);
                        }}
                        className={`py-2 px-1 text-center font-bold text-xs rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs scale-105'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
              <strong className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600" />
                How to verify stability:
              </strong>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                When cycling between small shapes (e.g. <strong>E</strong>) and wide-open shapes (e.g. <strong>O</strong> or <strong>D</strong>), the green dashed upper lip line should remain stable. Open mouths will naturally expand downward without the upper lip jumping.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 4: ANCHOR TUNING & PADDING */}
      {/* ------------------------------------------------------------- */}
      {mode === 'editor' && selectedAsset && (
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Single-Sprite Editor Canvas */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center bg-slate-900 rounded-2xl p-4 overflow-hidden shadow-inner relative">
            <canvas
              ref={editorCanvasRef}
              onMouseDown={handleEditorCanvasMouseDown}
              onMouseMove={handleEditorCanvasMouseMove}
              onMouseUp={handleEditorCanvasMouseUp}
              onMouseLeave={handleEditorCanvasMouseUp}
              className="max-w-full rounded-xl cursor-crosshair border border-slate-700 shadow-2xl select-none"
            />

            <div className="absolute top-6 left-6 flex items-center gap-2 bg-slate-800/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
              <Crosshair className="w-3.5 h-3.5 text-red-500" />
              <span>Click or drag red crosshair to set upper lip anchor</span>
            </div>

            <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-slate-800/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
              <span className="w-2.5 h-2.5 border border-dashed border-blue-400" />
              <span>Blue dashed box: Visible pixel boundary</span>
            </div>
          </div>

          {/* Editor Sidebar & Controls */}
          <div className="space-y-4">
            {/* Shape Switcher */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-600 block">Select Mouth Shape:</label>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    Shape {a.label} ({a.width}×{a.height}px)
                  </option>
                ))}
              </select>
            </div>

            {/* Blank shape notice */}
            {analysisMap.get(selectedAsset.id)?.contentBounds.width === 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Blank Cell (100% Transparent)</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  This shape contains no visible pixels. It was sliced from an empty slot in your sprite sheet grid. You can safely remove it from this collection.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteAsset(selectedAsset.id, selectedAsset.label)}
                  className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Delete Blank Cell
                </Button>
              </div>
            )}

            {/* Numeric Coordinates */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Anchor Coordinates
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-medium text-slate-600 block mb-1">Anchor X (%)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={Number((tempAnchorX * 100).toFixed(2))}
                      onChange={(e) => setTempAnchorX(Math.max(0, Math.min(1, Number(e.target.value) / 100)))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-slate-400 font-mono">%</span>
                  </div>
                </div>

                <div>
                  <label className="font-medium text-slate-600 block mb-1">Anchor Y (%)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={Number((tempAnchorY * 100).toFixed(2))}
                      onChange={(e) => setTempAnchorY(Math.max(0, Math.min(1, Number(e.target.value) / 100)))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-slate-400 font-mono">%</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-500 bg-white p-2 rounded-lg border border-slate-200 flex justify-between">
                <span>Pixel Location:</span>
                <strong>
                  {Math.round(tempAnchorX * selectedAsset.width)}px, {Math.round(tempAnchorY * selectedAsset.height)}px
                </strong>
              </div>

              {/* Snap / Auto buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSnapToUpperLip}
                  icon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                >
                  Snap to Upper Lip Line
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetAnchorToDefault}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Reset to Standard (50%, 46.875%)
                </Button>
              </div>
            </div>

            {/* Actions: Save & Apply */}
            <div className="space-y-2">
              <Button
                variant="primary"
                onClick={handleSaveCurrentAnchor}
                className="w-full"
                icon={<Check className="w-4 h-4" />}
              >
                Save Anchor for Shape "{selectedAsset.label}"
              </Button>

              <Button
                variant="outline"
                onClick={handleApplyAnchorToAll}
                className="w-full text-xs"
              >
                Apply this Anchor to All Shapes
              </Button>

              <button
                type="button"
                onClick={() => setShowPaddingModal(true)}
                className="w-full text-center text-xs text-indigo-600 hover:text-indigo-800 hover:underline pt-2 font-semibold"
              >
                + Add Transparent Margins / Padding...
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transparent Padding Modal */}
      {showPaddingModal && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Maximize2 className="w-5 h-5 text-indigo-600" />
              Add Transparent Margins (Padding)
            </h3>
            <p className="text-xs text-slate-500">
              If shape <strong>{selectedAsset.label}</strong> was cropped too tightly, add transparent pixels around it without scaling or stretching the artwork.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Top Padding (px)</label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={padTop}
                  onChange={(e) => setPadTop(Math.max(0, Number(e.target.value)))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Bottom Padding (px)</label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={padBottom}
                  onChange={(e) => setPadBottom(Math.max(0, Number(e.target.value)))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Left Padding (px)</label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={padLeft}
                  onChange={(e) => setPadLeft(Math.max(0, Number(e.target.value)))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Right Padding (px)</label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={padRight}
                  onChange={(e) => setPadRight(Math.max(0, Number(e.target.value)))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
              New canvas size: <strong>{selectedAsset.width + padLeft + padRight} × {selectedAsset.height + padTop + padBottom}px</strong>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowPaddingModal(false)} disabled={isPadding}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleApplyPadding} loading={isPadding}>
                Apply Transparent Padding
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
