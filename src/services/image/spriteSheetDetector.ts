import { CropRect, RhubarbShape, DEFAULT_STANDARD_TEMPLATE } from '../../types/mouth';

export interface DetectedCrop {
  index: number;
  label: RhubarbShape | string;
  rect: CropRect;
  warning?: string;
  hasContent: boolean;
}

/**
 * Generates grid-based crops for standard or custom grid configurations.
 */
export function generateGridCrops(
  imageWidth: number,
  imageHeight: number,
  columns: number = 3,
  rows: number = 3,
  labels: string[] = DEFAULT_STANDARD_TEMPLATE.expectedOrder
): DetectedCrop[] {
  const crops: DetectedCrop[] = [];
  const cellWidth = imageWidth / columns;
  const cellHeight = imageHeight / rows;

  let labelIdx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const rect: CropRect = {
        x: Math.round(c * cellWidth),
        y: Math.round(r * cellHeight),
        width: Math.round(cellWidth),
        height: Math.round(cellHeight),
      };

      crops.push({
        index: labelIdx,
        label: labels[labelIdx] || `Shape_${labelIdx + 1}`,
        rect,
        hasContent: true,
      });

      labelIdx++;
    }
  }

  return crops;
}

/**
 * Validates a crop against the image data, checking for clipping, empty space, and opacity.
 */
export function validateCropContent(
  imageData: ImageData,
  crop: CropRect,
  allCrops?: CropRect[]
): { hasContent: boolean; warning?: string } {
  const { width: fullWidth, height: fullHeight, data } = imageData;

  // Clamp crop within image boundaries
  const startX = Math.max(0, Math.min(fullWidth - 1, Math.round(crop.x)));
  const startY = Math.max(0, Math.min(fullHeight - 1, Math.round(crop.y)));
  const endX = Math.min(fullWidth, Math.round(crop.x + crop.width));
  const endY = Math.min(fullHeight, Math.round(crop.y + crop.height));

  const totalPixels = Math.max(1, (endX - startX) * (endY - startY));
  let visiblePixels = 0;
  let touchesEdge = false;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * fullWidth + x) * 4;
      const alpha = data[idx + 3];

      if (alpha > 25) {
        visiblePixels++;
        // Check if edge pixels are non-transparent (clipping indicator)
        if (x === startX || x === endX - 1 || y === startY || y === endY - 1) {
          touchesEdge = true;
        }
      }
    }
  }

  const fillRatio = visiblePixels / totalPixels;

  if (visiblePixels === 0) {
    return { hasContent: false, warning: 'Cell is blank (no visible pixels detected)' };
  }

  if (touchesEdge) {
    return { hasContent: true, warning: 'Mouth may be clipped by the crop boundary' };
  }

  if (fillRatio < 0.03) {
    return { hasContent: true, warning: 'Excessive empty transparent space in cell' };
  }

  // Check if overlapping another crop excessively
  if (allCrops) {
    for (const other of allCrops) {
      if (other === crop) continue;
      const overlapX = Math.max(0, Math.min(crop.x + crop.width, other.x + other.width) - Math.max(crop.x, other.x));
      const overlapY = Math.max(0, Math.min(crop.y + crop.height, other.y + other.height) - Math.max(crop.y, other.y));
      const overlapArea = overlapX * overlapY;
      if (overlapArea > 0.3 * Math.min(crop.width * crop.height, other.width * other.height)) {
        return { hasContent: true, warning: 'Crop heavily overlaps a neighbouring cell' };
      }
    }
  }

  return { hasContent: true };
}

/**
 * Automatically segments distinct non-transparent islands on a sprite sheet
 * using a fast connected-component scan.
 */
export function detectMouthRegions(
  imageData: ImageData,
  minArea: number = 400
): CropRect[] {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const regions: CropRect[] = [];

  // Downsample grid for performance on large sprite sheets
  const step = Math.max(1, Math.floor(Math.min(width, height) / 400));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const alpha = data[idx * 4 + 3];
      if (alpha > 30) {
        // Flood fill to find bounding box
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;

        const queue: number[] = [idx];
        visited[idx] = 1;

        while (queue.length > 0) {
          const curr = queue.pop()!;
          const cy = Math.floor(curr / width);
          const cx = curr % width;

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // Check 4-connected neighbors
          const neighbors = [
            cy > 0 ? (cy - step) * width + cx : -1,
            cy + step < height ? (cy + step) * width + cx : -1,
            cx > 0 ? cy * width + (cx - step) : -1,
            cx + step < width ? cy * width + (cx + step) : -1,
          ];

          for (const n of neighbors) {
            if (n >= 0 && !visited[n]) {
              visited[n] = 1;
              if (data[n * 4 + 3] > 30) {
                queue.push(n);
              }
            }
          }
        }

        const boxWidth = maxX - minX + step;
        const boxHeight = maxY - minY + step;
        const area = boxWidth * boxHeight;

        if (area >= minArea) {
          // Add padding
          const pad = 8;
          regions.push({
            x: Math.max(0, minX - pad),
            y: Math.max(0, minY - pad),
            width: Math.min(width - minX + pad, boxWidth + pad * 2),
            height: Math.min(height - minY + pad, boxHeight + pad * 2),
          });
        }
      }
    }
  }

  // Sort top-to-bottom, left-to-right
  regions.sort((a, b) => {
    const rowA = Math.floor(a.y / 80);
    const rowB = Math.floor(b.y / 80);
    if (rowA !== rowB) return rowA - rowB;
    return a.x - b.x;
  });

  return regions;
}
