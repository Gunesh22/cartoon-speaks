export interface BackgroundAnalysis {
  isTransparent: boolean;
  solidColor?: { r: number; g: number; b: number; hex: string };
  confidence: number;
}

/**
 * Analyzes the corners and borders of an image to detect whether it has
 * genuine alpha transparency or a solid chroma key background (e.g. green screen, white).
 */
export function analyzeImageBackground(
  imageData: ImageData
): BackgroundAnalysis {
  const { data, width, height } = imageData;
  const samplePoints: number[] = [];

  // Sample top row, bottom row, left col, right col, and corners
  const addPixel = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    samplePoints.push(idx);
  };

  // 4 corners
  addPixel(0, 0);
  addPixel(width - 1, 0);
  addPixel(0, height - 1);
  addPixel(width - 1, height - 1);

  // Sample border points
  const stepX = Math.max(1, Math.floor(width / 20));
  const stepY = Math.max(1, Math.floor(height / 20));

  for (let x = 0; x < width; x += stepX) {
    addPixel(x, 0);
    addPixel(x, height - 1);
  }
  for (let y = 0; y < height; y += stepY) {
    addPixel(0, y);
    addPixel(width - 1, y);
  }

  let transparentSamples = 0;
  const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (const idx of samplePoints) {
    const a = data[idx + 3];
    if (a < 20) {
      transparentSamples++;
      continue;
    }
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    // Quantize color to group minor variations
    const qr = Math.round(r / 8) * 8;
    const qg = Math.round(g / 8) * 8;
    const qb = Math.round(b / 8) * 8;
    const key = `${qr},${qg},${qb}`;

    const existing = colorMap.get(key) || { r, g, b, count: 0 };
    existing.count++;
    colorMap.set(key, existing);
  }

  const total = samplePoints.length;
  if (transparentSamples / total > 0.6) {
    return {
      isTransparent: true,
      confidence: transparentSamples / total,
    };
  }

  // Find dominant solid color
  let dominantColor: { r: number; g: number; b: number; count: number } | undefined;
  for (const entry of colorMap.values()) {
    if (!dominantColor || entry.count > dominantColor.count) {
      dominantColor = entry;
    }
  }

  if (dominantColor && dominantColor.count / total > 0.4) {
    const toHex = (c: number) => c.toString(16).padStart(2, '0');
    const hex = `#${toHex(dominantColor.r)}${toHex(dominantColor.g)}${toHex(dominantColor.b)}`;
    return {
      isTransparent: false,
      solidColor: { r: dominantColor.r, g: dominantColor.g, b: dominantColor.b, hex },
      confidence: dominantColor.count / total,
    };
  }

  return {
    isTransparent: false,
    confidence: 0.5,
  };
}
