export interface SpriteAnalysisResult {
  width: number;
  height: number;
  contentBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fillRatio: number;
  touchesBorder: boolean;
  upperLipEstimate: {
    anchorX: number;
    anchorY: number;
  };
  isAnchorValid: boolean;
  anchorDistanceToContentPx: number;
  warning?: string;
}

/**
 * Pure analysis on RGBA pixel buffer. Works in both browser DOM and Node environments.
 */
export function analyzeSpriteImageData(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
  currentAnchorX: number = 0.5,
  currentAnchorY: number = 0.46875
): SpriteAnalysisResult {
  if (width <= 0 || height <= 0 || data.length === 0) {
    return {
      width: Math.max(0, width),
      height: Math.max(0, height),
      contentBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      fillRatio: 0,
      touchesBorder: false,
      upperLipEstimate: { anchorX: 0.5, anchorY: 0.46875 },
      isAnchorValid: true,
      anchorDistanceToContentPx: 0,
    };
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let visibleCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 20) {
        visibleCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (visibleCount === 0 || maxX < minX || maxY < minY) {
    return {
      width,
      height,
      contentBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      fillRatio: 0,
      touchesBorder: false,
      upperLipEstimate: { anchorX: 0.5, anchorY: 0.46875 },
      isAnchorValid: false,
      anchorDistanceToContentPx: 999,
      warning: 'Image appears completely transparent / empty',
    };
  }

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  const totalPixels = width * height;
  const fillRatio = visibleCount / totalPixels;

  const touchesBorder = minX === 0 || minY === 0 || maxX === width - 1 || maxY === height - 1;

  // Upper lip line estimation:
  // Find the top edge of visible pixels, and locate the center of the upper boundary
  const topSliceLimit = Math.min(maxY, minY + Math.max(4, Math.round(contentH * 0.2)));
  let topSliceSumX = 0;
  let topSliceCount = 0;
  let topSliceMinY = minY;

  for (let y = minY; y <= topSliceLimit; y++) {
    for (let x = minX; x <= maxX; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 20) {
        topSliceSumX += x;
        topSliceCount++;
      }
    }
    if (topSliceCount > 5) break; // found the upper rim
  }

  const upperLipPxX = topSliceCount > 0 ? topSliceSumX / topSliceCount : (minX + maxX) / 2;
  const upperLipPxY = topSliceMinY + Math.min(8, contentH * 0.1);

  const upperLipEstimate = {
    anchorX: Number((upperLipPxX / width).toFixed(4)),
    anchorY: Number((upperLipPxY / height).toFixed(4)),
  };

  // Check if current anchor is valid
  const anchorPxX = currentAnchorX * width;
  const anchorPxY = currentAnchorY * height;

  let anchorDistanceToContentPx = 0;
  if (anchorPxX < minX) anchorDistanceToContentPx += minX - anchorPxX;
  if (anchorPxX > maxX) anchorDistanceToContentPx += anchorPxX - maxX;
  if (anchorPxY < minY) anchorDistanceToContentPx += minY - anchorPxY;
  if (anchorPxY > maxY) anchorDistanceToContentPx += anchorPxY - maxY;

  // Check alpha at exact anchor point
  const clampedAnchorX = Math.max(0, Math.min(width - 1, Math.round(anchorPxX)));
  const clampedAnchorY = Math.max(0, Math.min(height - 1, Math.round(anchorPxY)));
  const anchorAlpha = data[(clampedAnchorY * width + clampedAnchorX) * 4 + 3];

  let isAnchorValid = true;
  let warning: string | undefined;

  if (touchesBorder) {
    warning = 'Artwork touches image edge (risk of clipping)';
  } else if (anchorDistanceToContentPx > 25) {
    isAnchorValid = false;
    warning = `Anchor is ${Math.round(anchorDistanceToContentPx)}px outside visible mouth`;
  } else if (anchorAlpha === 0 && anchorDistanceToContentPx > 10) {
    warning = 'Anchor is in empty transparent space';
  }

  return {
    width,
    height,
    contentBounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: contentW,
      height: contentH,
    },
    padding: {
      top: minY,
      left: minX,
      right: width - 1 - maxX,
      bottom: height - 1 - maxY,
    },
    fillRatio,
    touchesBorder,
    upperLipEstimate,
    isAnchorValid,
    anchorDistanceToContentPx,
    warning,
  };
}

/**
 * Extracts and analyzes transparency, content boundaries, and upper-lip position of a mouth sprite.
 */
export function analyzeSpriteImage(
  img: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  currentAnchorX: number = 0.5,
  currentAnchorY: number = 0.46875
): SpriteAnalysisResult {
  const width = 'naturalWidth' in img ? img.naturalWidth : img.width;
  const height = 'naturalHeight' in img ? img.naturalHeight : img.height;

  if (typeof document === 'undefined') {
    return analyzeSpriteImageData(new Uint8ClampedArray(0), width, height, currentAnchorX, currentAnchorY);
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');

  if (!ctx || width === 0 || height === 0) {
    return analyzeSpriteImageData(new Uint8ClampedArray(0), width, height, currentAnchorX, currentAnchorY);
  }

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  return analyzeSpriteImageData(imageData.data, width, height, currentAnchorX, currentAnchorY);
}
