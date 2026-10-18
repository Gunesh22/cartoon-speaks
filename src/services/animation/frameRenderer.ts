import { MouthPlacement } from '../../types/character';
import { ExportSettings } from '../../types/export';
import {
  calculateCharacterCanvasBounds,
  calculateMouthCanvasBounds,
} from '../../utils/coordinateUtils';

export interface FrameRenderOptions {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  exportSettings: ExportSettings;
  characterImg?: CanvasImageSource | null;
  charOriginalWidth: number;
  charOriginalHeight: number;
  mouthImg?: CanvasImageSource | null;
  mouthOriginalWidth: number;
  mouthOriginalHeight: number;
  mouthAssetAnchor?: { anchorX?: number; anchorY?: number };
  placement: MouthPlacement;
  bgImage?: CanvasImageSource | null;
  /** Debugging guides (crosshairs, anchor dots, badges). Never used during video export. */
  showAlignmentGuides?: boolean;
  /** Whether to render the mouth anchor crosshair (default true) */
  showCrosshair?: boolean;
  /** Smooth transition blending support */
  prevMouthImg?: CanvasImageSource | null;
  prevMouthWidth?: number;
  prevMouthHeight?: number;
  prevMouthAnchor?: { anchorX?: number; anchorY?: number };
  transitionAlpha?: number; // 0.0 to 1.0 (1.0 = fully current mouth)
}

/**
 * Deterministically renders a single frame for preview or video encoding.
 */
export function renderAnimationFrame(options: FrameRenderOptions): void {
  const {
    ctx,
    canvasWidth,
    canvasHeight,
    exportSettings,
    characterImg,
    charOriginalWidth,
    charOriginalHeight,
    mouthImg,
    mouthOriginalWidth,
    mouthOriginalHeight,
    mouthAssetAnchor,
    placement,
    bgImage,
    showAlignmentGuides = false,
    showCrosshair = true,
    prevMouthImg,
    prevMouthWidth,
    prevMouthHeight,
    prevMouthAnchor,
    transitionAlpha,
  } = options;

  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 1. Draw Background
  if (exportSettings.backgroundType === 'color') {
    ctx.fillStyle = exportSettings.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (exportSettings.backgroundType === 'image' && bgImage) {
    ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
  }
  // 'transparent': clearRect already made it transparent

  // 2. Draw Character
  if (!characterImg || charOriginalWidth <= 0 || charOriginalHeight <= 0) {
    return;
  }

  const charBounds = calculateCharacterCanvasBounds(
    charOriginalWidth,
    charOriginalHeight,
    canvasWidth,
    canvasHeight,
    exportSettings.fitMode,
    exportSettings.manualScale,
    exportSettings.manualOffsetX,
    exportSettings.manualOffsetY
  );

  ctx.drawImage(
    characterImg,
    charBounds.x,
    charBounds.y,
    charBounds.width,
    charBounds.height
  );

  const effectiveMouthWidth = mouthOriginalWidth > 0 ? mouthOriginalWidth : ((mouthImg as any)?.naturalWidth || (mouthImg as any)?.width || 512);
  const effectiveMouthHeight = mouthOriginalHeight > 0 ? mouthOriginalHeight : ((mouthImg as any)?.naturalHeight || (mouthImg as any)?.height || 512);

  // Calculate mouth canvas bounds & anchor alignment
  const mouthBounds = calculateMouthCanvasBounds(
    charBounds,
    effectiveMouthWidth,
    effectiveMouthHeight,
    placement,
    mouthAssetAnchor
  );

  // 3. Draw Mouth (if active and available)
  if (mouthImg && effectiveMouthWidth > 0 && effectiveMouthHeight > 0) {
    ctx.save();
    // Translate directly to Character Anchor (target point)
    ctx.translate(mouthBounds.targetX, mouthBounds.targetY);

    // Rotate around the anchor point
    if (mouthBounds.rotation !== 0) {
      ctx.rotate((mouthBounds.rotation * Math.PI) / 180);
    }

    const isTransitioning =
      prevMouthImg &&
      transitionAlpha !== undefined &&
      transitionAlpha < 1.0 &&
      transitionAlpha >= 0;

    if (isTransitioning) {
      // 3a. Draw previous mouth shape fading out
      const prevW = prevMouthWidth && prevMouthWidth > 0 ? prevMouthWidth : effectiveMouthWidth;
      const prevH = prevMouthHeight && prevMouthHeight > 0 ? prevMouthHeight : effectiveMouthHeight;
      const prevBounds = calculateMouthCanvasBounds(
        charBounds,
        prevW,
        prevH,
        placement,
        prevMouthAnchor
      );

      ctx.save();
      ctx.globalAlpha = Math.max(0, 1.0 - transitionAlpha);
      ctx.drawImage(
        prevMouthImg,
        -prevBounds.anchorOffsetX,
        -prevBounds.anchorOffsetY,
        prevBounds.width,
        prevBounds.height
      );
      ctx.restore();

      // 3b. Fade in current mouth shape
      ctx.globalAlpha = Math.min(1.0, Math.max(0, transitionAlpha));
    }

    // Draw offset by mouth's anchor point so the anchor aligns exactly with targetX, targetY
    ctx.drawImage(
      mouthImg,
      -mouthBounds.anchorOffsetX,
      -mouthBounds.anchorOffsetY,
      mouthBounds.width,
      mouthBounds.height
    );

    ctx.restore();
  }

  // 4. Alignment Guides & Debugging (Preview mode only, NEVER exported)
  if (showAlignmentGuides && showCrosshair) {
    ctx.save();

    const { targetX, targetY, rotation = 0 } = mouthBounds;

    // Translate to anchor target and rotate crosshair along with mouth rotation
    ctx.translate(targetX, targetY);
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }

    // Outer subtle shadow for contrast against all image backgrounds
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 3;

    // Green Character Anchor crosshair & dot (aligned with mouth rotation)
    ctx.strokeStyle = '#10b981'; // Emerald 500
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 18);
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Contrasting Mouth Anchor circle (Magenta / Fuchsia)
    ctx.strokeStyle = '#f43f5e'; // Rose 500
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
