import { validateAndLoadImageBlob } from '../../utils/fileValidation';

export interface PadSpriteParams {
  sourceBlob: Blob;
  top: number;
  right: number;
  bottom: number;
  left: number;
  currentAnchorX: number;
  currentAnchorY: number;
}

export interface PadSpriteResult {
  newBlob: Blob;
  newWidth: number;
  newHeight: number;
  newAnchorX: number;
  newAnchorY: number;
}

/**
 * Adds transparent padding around an existing mouth sprite without scaling or distorting pixels.
 * Automatically recalculates normalized anchor coordinates so the physical attachment point is preserved.
 */
export async function padSpriteImage(params: PadSpriteParams): Promise<PadSpriteResult> {
  const { sourceBlob, top, right, bottom, left, currentAnchorX, currentAnchorY } = params;

  const { img, metadata } = await validateAndLoadImageBlob(sourceBlob);
  const origWidth = metadata.width;
  const origHeight = metadata.height;

  const padTop = Math.max(0, Math.round(top));
  const padRight = Math.max(0, Math.round(right));
  const padBottom = Math.max(0, Math.round(bottom));
  const padLeft = Math.max(0, Math.round(left));

  const newWidth = origWidth + padLeft + padRight;
  const newHeight = origHeight + padTop + padBottom;

  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context for sprite padding');

  // Clear with 100% transparency
  ctx.clearRect(0, 0, newWidth, newHeight);

  // Draw original image offset by (padLeft, padTop)
  ctx.drawImage(img, padLeft, padTop, origWidth, origHeight);

  // Recalculate anchor in new canvas
  const oldAnchorPxX = currentAnchorX * origWidth;
  const oldAnchorPxY = currentAnchorY * origHeight;

  const newAnchorPxX = oldAnchorPxX + padLeft;
  const newAnchorPxY = oldAnchorPxY + padTop;

  const newAnchorX = Number((newAnchorPxX / newWidth).toFixed(5));
  const newAnchorY = Number((newAnchorPxY / newHeight).toFixed(5));

  const newBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode padded image to PNG blob'));
    }, 'image/png');
  });

  return {
    newBlob,
    newWidth,
    newHeight,
    newAnchorX,
    newAnchorY,
  };
}
