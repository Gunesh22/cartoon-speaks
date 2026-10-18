import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Character, MouthPlacement } from '../../types/character';
import { MouthAsset } from '../../types/mouth';
import { renderAnimationFrame } from '../../services/animation/frameRenderer';
import { DEFAULT_EXPORT_SETTINGS } from '../../types/export';
import { calculateCharacterCanvasBounds, calculateMouthCanvasBounds } from '../../utils/coordinateUtils';
import { ZoomIn, ZoomOut, RotateCcw, Hand, Crosshair, Eye, EyeOff } from 'lucide-react';

export interface CharacterPreviewProps {
  character: Character;
  characterImg: HTMLImageElement | null;
  mouthAssets: Map<string, { img: CanvasImageSource; asset: MouthAsset }>;
  activeTestShape?: string;
  onPlacementChange?: (placement: MouthPlacement) => void;
  interactive?: boolean;
  showCrosshair?: boolean;
  onToggleCrosshair?: (show: boolean) => void;
  showAlignmentGuides?: boolean;
}

export const CharacterPreview: React.FC<CharacterPreviewProps> = ({
  character,
  characterImg,
  mouthAssets,
  activeTestShape = 'A',
  onPlacementChange,
  interactive = true,
  showCrosshair = true,
  onToggleCrosshair,
  showAlignmentGuides = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState<'crosshair' | 'pan'>('crosshair');
  const [isDraggingAnchor, setIsDraggingAnchor] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Internal synchronized crosshair visibility
  const [internalShowCrosshair, setInternalShowCrosshair] = useState<boolean>(showCrosshair);

  useEffect(() => {
    setInternalShowCrosshair(showCrosshair);
  }, [showCrosshair]);

  const toggleCrosshair = useCallback(() => {
    setInternalShowCrosshair((prev) => {
      const next = !prev;
      onToggleCrosshair?.(next);
      return next;
    });
  }, [onToggleCrosshair]);

  const panStartRef = useRef<{ startX: number; startY: number; initialPanX: number; initialPanY: number }>({
    startX: 0,
    startY: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  // Keyboard shortcuts: Space to pan, 'H' to toggle crosshair
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if ((e.key === 'h' || e.key === 'H') && !e.repeat) {
        toggleCrosshair();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [toggleCrosshair]);

  // Render preview frame (1200x1200 for crisp zoom fidelity)
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 1200;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Resolve test mouth
    const mouthAssetId =
      character.mouthMapping[activeTestShape] ||
      character.mouthMapping['A'] ||
      Object.values(character.mouthMapping)[0];
    const mouthEntry = mouthAssetId ? mouthAssets.get(mouthAssetId) : undefined;

    // Render character + mouth + alignment guides
    renderAnimationFrame({
      ctx,
      canvasWidth: width,
      canvasHeight: height,
      exportSettings: {
        ...DEFAULT_EXPORT_SETTINGS,
        backgroundType: 'color',
        backgroundColor: '#ffffff',
        fitMode: 'contain',
      },
      characterImg,
      charOriginalWidth: character.imageWidth,
      charOriginalHeight: character.imageHeight,
      mouthImg: mouthEntry?.img,
      mouthOriginalWidth: mouthEntry?.asset.width || 0,
      mouthOriginalHeight: mouthEntry?.asset.height || 0,
      placement: character.placement,
      mouthAssetAnchor: mouthEntry?.asset
        ? {
            anchorX: mouthEntry.asset.anchorX,
            anchorY: mouthEntry.asset.anchorY,
          }
        : undefined,
      showAlignmentGuides: showAlignmentGuides && internalShowCrosshair,
      showCrosshair: internalShowCrosshair,
    });

    // If showCrosshair is enabled but showAlignmentGuides is false, still render high-contrast character crosshair
    if (internalShowCrosshair && !showAlignmentGuides && characterImg) {
      const charBounds = calculateCharacterCanvasBounds(
        character.imageWidth,
        character.imageHeight,
        width,
        height,
        'contain'
      );

      const targetX = charBounds.x + character.placement.normalizedX * charBounds.width;
      const targetY = charBounds.y + character.placement.normalizedY * charBounds.height;
      const rotation = character.placement.rotation || 0;

      ctx.save();
      ctx.translate(targetX, targetY);
      if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
      }

      // Outer shadow/halo for visibility on light and dark characters
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;

      // High-contrast emerald crosshair
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(20, 0);
      ctx.moveTo(0, -20);
      ctx.lineTo(0, 20);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // If showAlignmentGuides is enabled and crosshair is visible, also draw the rotated mouth bounding box for visual reference
    if (showAlignmentGuides && internalShowCrosshair && characterImg && mouthEntry) {
      const charBounds = calculateCharacterCanvasBounds(
        character.imageWidth,
        character.imageHeight,
        width,
        height,
        'contain'
      );

      const mouthBounds = calculateMouthCanvasBounds(
        charBounds,
        mouthEntry.asset.width || 512,
        mouthEntry.asset.height || 512,
        character.placement,
        {
          anchorX: mouthEntry.asset.anchorX,
          anchorY: mouthEntry.asset.anchorY,
        }
      );

      ctx.save();
      ctx.translate(mouthBounds.targetX, mouthBounds.targetY);
      if (mouthBounds.rotation !== 0) {
        ctx.rotate((mouthBounds.rotation * Math.PI) / 180);
      }

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)'; // Indigo dashed outline
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(
        -mouthBounds.anchorOffsetX,
        -mouthBounds.anchorOffsetY,
        mouthBounds.width,
        mouthBounds.height
      );

      ctx.restore();
    }
  }, [
    character,
    characterImg,
    mouthAssets,
    activeTestShape,
    internalShowCrosshair,
    showAlignmentGuides,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer position update helper: converts client coordinates to normalized character coordinates
  const updateAnchorPosition = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !onPlacementChange || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    // Character bounds on canvas
    const charBounds = calculateCharacterCanvasBounds(
      character.imageWidth,
      character.imageHeight,
      canvas.width,
      canvas.height,
      'contain'
    );

    // Convert canvas click to normalized character space [0.0 - 1.0]
    const normX = Math.max(0, Math.min(1, (canvasX - charBounds.x) / charBounds.width));
    const normY = Math.max(0, Math.min(1, (canvasY - charBounds.y) / charBounds.height));

    onPlacementChange({
      ...character.placement,
      normalizedX: parseFloat(normX.toFixed(4)),
      normalizedY: parseFloat(normY.toFixed(4)),
    });
  };

  // Handle pointer down (places crosshair or starts pan)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;

    // Panning conditions: pan tool active, space held, or right/middle click
    const shouldPan =
      activeTool === 'pan' || isSpacePressed || e.button === 1 || e.button === 2;

    if (shouldPan) {
      setIsPanning(true);
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // Default action: place crosshair
    if (e.button === 0 && onPlacementChange) {
      setIsDraggingAnchor(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateAnchorPosition(e);
    }
  };

  // Handle pointer move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.startX;
      const dy = e.clientY - panStartRef.current.startY;

      const container = containerRef.current;
      const maxPan = container
        ? Math.max(100, ((zoom - 1) * container.clientWidth) / 1.5 + 80)
        : 300;

      setPan({
        x: Math.max(-maxPan, Math.min(maxPan, panStartRef.current.initialPanX + dx)),
        y: Math.max(-maxPan, Math.min(maxPan, panStartRef.current.initialPanY + dy)),
      });
      return;
    }

    if (isDraggingAnchor) {
      updateAnchorPosition(e);
    }
  };

  // Handle pointer release
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    if (isDraggingAnchor) {
      setIsDraggingAnchor(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoom((prev) => {
      const next = Math.max(1, Math.min(5, Math.round((prev + delta) * 100) / 100));
      if (next === 1) {
        setPan({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(5, Math.round((z + 0.5) * 10) / 10));
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(1, Math.round((z - 0.5) * 10) / 10);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getCursorClass = () => {
    if (isPanning) return 'cursor-grabbing';
    if (activeTool === 'pan' || isSpacePressed) return 'cursor-grab';
    if (interactive) return 'cursor-crosshair';
    return 'cursor-default';
  };

  const xPercent = (character.placement.normalizedX * 100).toFixed(1);
  const yPercent = (character.placement.normalizedY * 100).toFixed(1);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full aspect-square bg-transparency-checker rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center select-none shadow-xs group"
    >
      {/* Zoomable & Pannable Viewport */}
      <div
        className="w-full h-full flex items-center justify-center select-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDraggingAnchor || isPanning ? 'none' : 'transform 0.12s ease-out',
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-full h-full object-contain ${getCursorClass()}`}
        />
      </div>

      {/* Top Left: Anchor Coordinate Display */}
      {interactive && (
        <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200/80 shadow-xs pointer-events-none flex items-center gap-2 z-10">
          <span
            className={`w-2 h-2 rounded-full ${
              internalShowCrosshair ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`}
          />
          <span>Anchor: {xPercent}%, {yPercent}%</span>
        </div>
      )}

      {/* Top Right: Zoom & Tool Controls */}
      {interactive && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-lg border border-slate-200/80 shadow-xs z-10">
          {/* Tool Selector: Crosshair vs Pan */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => setActiveTool('crosshair')}
              title="Place tool: Click or drag on character to place mouth"
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                activeTool === 'crosshair'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Place</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTool('pan')}
              title="Pan tool: Drag to move the zoomed image around (or hold Space)"
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                activeTool === 'pan'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Pan</span>
            </button>
          </div>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Toggle Crosshair Visibility Button */}
          <button
            type="button"
            onClick={toggleCrosshair}
            title={internalShowCrosshair ? 'Hide crosshair & guides (Press H)' : 'Show crosshair & guides (Press H)'}
            className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs font-semibold transition-colors ${
              internalShowCrosshair
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            {internalShowCrosshair ? (
              <>
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline text-[11px]">Guides</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[11px] font-bold">Hidden</span>
              </>
            )}
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Zoom Buttons */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            title="Zoom Out"
            className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              // Cycle zoom presets: 1x -> 2x -> 3x -> 4x -> 1x
              setZoom((prev) => {
                if (prev < 2) return 2;
                if (prev < 3) return 3;
                if (prev < 4) return 4;
                setPan({ x: 0, y: 0 });
                return 1;
              });
            }}
            title="Click to cycle zoom presets (1x, 2x, 3x, 4x)"
            className="px-1.5 py-0.5 text-xs font-mono font-bold text-slate-700 hover:bg-slate-100 rounded"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            title="Zoom In"
            className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {zoom > 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset Zoom & Pan (100%)"
              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Bottom Hint Bar */}
      {interactive && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          <div className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 border border-slate-200 shadow-2xs">
            {!internalShowCrosshair
              ? '👁️ Crosshair hidden for clean preview • Click "Hidden" or press H to show'
              : zoom > 1
              ? activeTool === 'pan'
                ? '✋ Drag to move image • Switch to Place to set crosshair'
                : '🎯 Click or drag to place crosshair • Hold Space or Right-click to pan'
              : 'Click or drag crosshair • Press H to hide/show • Scroll wheel zooms'}
          </div>
        </div>
      )}
    </div>
  );
};
