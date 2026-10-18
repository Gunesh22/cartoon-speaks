import { describe, it, expect } from 'vitest';
import { analyzeSpriteImageData } from './spriteAnalyzer';

describe('spriteAnalyzer', () => {
  it('correctly calculates content bounds and upper-lip estimate on mock image data', () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4); // all 0 (transparent)

    // Fill a 40x20 opaque rectangle at x: 30..69, y: 40..59
    for (let y = 40; y < 60; y++) {
      for (let x = 30; x < 70; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 255;     // R
        data[idx + 1] = 0;   // G
        data[idx + 2] = 0;   // B
        data[idx + 3] = 255; // A (opaque)
      }
    }

    const result = analyzeSpriteImageData(data, width, height, 0.5, 0.4);

    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
    expect(result.contentBounds.minX).toBe(30);
    expect(result.contentBounds.minY).toBe(40);
    expect(result.contentBounds.maxX).toBe(69);
    expect(result.contentBounds.maxY).toBe(59);
    expect(result.contentBounds.width).toBe(40);
    expect(result.contentBounds.height).toBe(20);

    // Padding
    expect(result.padding.top).toBe(40);
    expect(result.padding.left).toBe(30);
    expect(result.padding.right).toBe(30);
    expect(result.padding.bottom).toBe(40);

    // Upper lip center estimate
    expect(result.upperLipEstimate.anchorX).toBeCloseTo(0.495, 2);
    expect(result.upperLipEstimate.anchorY).toBeCloseTo(0.42, 2);

    // Anchor is valid because (50px, 40px) is right on the upper lip!
    expect(result.isAnchorValid).toBe(true);
  });

  it('detects anchor placed outside visible content', () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);

    // Draw mouth near the bottom at y: 70..89, x: 30..69
    for (let y = 70; y < 90; y++) {
      for (let x = 30; x < 70; x++) {
        const idx = (y * width + x) * 4;
        data[idx + 3] = 255;
      }
    }

    // Anchor set at (0.5, 0.2) = (50px, 20px) which is 50px away from the mouth!
    const result = analyzeSpriteImageData(data, width, height, 0.5, 0.2);
    expect(result.isAnchorValid).toBe(false);
    expect(result.warning).toContain('outside visible mouth');
  });
});
