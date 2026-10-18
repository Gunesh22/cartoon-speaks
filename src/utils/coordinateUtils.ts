import { MouthPlacement } from '../types/character';
import { CharacterFitMode } from '../types/export';
import { STANDARD_MOUTH_ANCHOR_X, STANDARD_MOUTH_ANCHOR_Y } from '../types/mouth';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MouthCanvasCalculation {
  /** Target character anchor position in canvas space */
  targetX: number;
  targetY: number;
  /** Center of the mouth bounding box in canvas space (pre-rotation) */
  centerX: number;
  centerY: number;
  /** Rendered width of mouth on canvas */
  width: number;
  /** Rendered height of mouth on canvas */
  height: number;
  /** Rotation angle in degrees applied around the anchor */
  rotation: number;
  /** Horizontal distance from mouth image top-left to mouth anchor point in rendered pixels */
  anchorOffsetX: number;
  /** Vertical distance from mouth image top-left to mouth anchor point in rendered pixels */
  anchorOffsetY: number;
  /** Normalized mouth anchor X (0..1) */
  mouthAnchorX: number;
  /** Normalized mouth anchor Y (0..1) */
  mouthAnchorY: number;
}

/**
 * Calculates character draw destination on an arbitrary canvas (export canvas or preview canvas)
 * without altering character properties.
 */
export function calculateCharacterCanvasBounds(
  charWidth: number,
  charHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  fitMode: CharacterFitMode = 'contain',
  manualScale: number = 1.0,
  manualOffsetX: number = 0,
  manualOffsetY: number = 0
): BoundingBox {
  if (charWidth <= 0 || charHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
  }

  const charAspect = charWidth / charHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  let baseWidth: number;
  let baseHeight: number;

  if (fitMode === 'contain') {
    if (charAspect > canvasAspect) {
      // Character is wider than canvas ratio -> fit by width
      baseWidth = canvasWidth * 0.9;
      baseHeight = baseWidth / charAspect;
    } else {
      // Character is taller than canvas ratio -> fit by height
      baseHeight = canvasHeight * 0.9;
      baseWidth = baseHeight * charAspect;
    }
  } else if (fitMode === 'cover') {
    if (charAspect > canvasAspect) {
      baseHeight = canvasHeight;
      baseWidth = baseHeight * charAspect;
    } else {
      baseWidth = canvasWidth;
      baseHeight = baseWidth / charAspect;
    }
  } else {
    // Manual
    baseWidth = charWidth * manualScale;
    baseHeight = charHeight * manualScale;
  }

  const finalWidth = baseWidth * manualScale;
  const finalHeight = baseHeight * manualScale;

  // Center on canvas + offset
  const x = (canvasWidth - finalWidth) / 2 + manualOffsetX;
  const y = (canvasHeight - finalHeight) / 2 + manualOffsetY;

  return { x, y, width: finalWidth, height: finalHeight };
}

/**
 * Computes exact canvas placement by aligning the mouth anchor with the character anchor.
 * 
 * Rules:
 * - Character anchor determines target point: (charBounds.x + normX * charBounds.width, charBounds.y + normY * charBounds.height)
 * - Mouth anchor determines source point: (mouthAnchorX * width, mouthAnchorY * height)
 * - Rendered size is determined by mouth width as % of character width
 * - Rotation is applied around the mouth anchor point
 * - Changing mouth shape or aspect ratio NEVER shifts the character anchor
 */
export function calculateMouthCanvasBounds(
  charBounds: BoundingBox,
  mouthWidth: number,
  mouthHeight: number,
  placement: MouthPlacement,
  mouthAssetAnchor?: { anchorX?: number; anchorY?: number }
): MouthCanvasCalculation {
  // Target position on canvas: Character Anchor Point
  const targetX = charBounds.x + placement.normalizedX * charBounds.width;
  const targetY = charBounds.y + placement.normalizedY * charBounds.height;

  // Rendered mouth width as percentage of character canvas width
  const widthPercent = placement.mouthWidthPercent !== undefined
    ? placement.mouthWidthPercent
    : (placement.scale || 1.0) * 25.0;

  const baseMouthWidth = (charBounds.width * (widthPercent / 100));

  // Maintain mouth's intrinsic aspect ratio
  const mouthAspect = mouthWidth > 0 && mouthHeight > 0 ? mouthWidth / mouthHeight : 1;
  const baseMouthHeight = baseMouthWidth / mouthAspect;

  // Mouth's internal anchor point (centre of upper lip line)
  const mouthAnchorX = mouthAssetAnchor?.anchorX ?? placement.anchorX ?? STANDARD_MOUTH_ANCHOR_X;
  const mouthAnchorY = mouthAssetAnchor?.anchorY ?? placement.anchorY ?? STANDARD_MOUTH_ANCHOR_Y;

  const anchorOffsetX = mouthAnchorX * baseMouthWidth;
  const anchorOffsetY = mouthAnchorY * baseMouthHeight;

  const centerX = targetX - anchorOffsetX + baseMouthWidth / 2;
  const centerY = targetY - anchorOffsetY + baseMouthHeight / 2;

  return {
    targetX,
    targetY,
    centerX,
    centerY,
    width: baseMouthWidth,
    height: baseMouthHeight,
    rotation: placement.rotation || 0,
    anchorOffsetX,
    anchorOffsetY,
    mouthAnchorX,
    mouthAnchorY,
  };
}

/**
 * Converts a point on the character canvas (pixels) to normalized coordinates (0..1)
 */
export function pointToNormalizedCoordinates(
  pointX: number,
  pointY: number,
  charBounds: BoundingBox
): { normX: number; normY: number } {
  if (charBounds.width === 0 || charBounds.height === 0) {
    return { normX: 0.5, normY: 0.5 };
  }
  const normX = Math.max(0, Math.min(1, (pointX - charBounds.x) / charBounds.width));
  const normY = Math.max(0, Math.min(1, (pointY - charBounds.y) / charBounds.height));
  return { normX, normY };
}
