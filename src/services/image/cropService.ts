import { CropRect } from '../../types/mouth';

/**
 * Extracts a rectangular region from an image or canvas and converts it to a PNG Blob.
 */
export async function extractCropToBlob(
  sourceImage: CanvasImageSource,
  crop: CropRect
): Promise<{ blob: Blob; width: number; height: number }> {
  const canvas = document.createElement('canvas');
  const width = Math.max(1, Math.round(crop.width));
  const height = Math.max(1, Math.round(crop.height));
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context for crop extraction');

  // Draw region to canvas
  ctx.drawImage(
    sourceImage,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    width,
    height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({ blob, width, height });
      } else {
        reject(new Error('Failed to create blob from cropped canvas'));
      }
    }, 'image/png');
  });
}
