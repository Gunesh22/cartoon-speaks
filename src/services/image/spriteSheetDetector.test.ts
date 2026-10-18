import { describe, it, expect } from 'vitest';
import { generateGridCrops, validateCropContent } from './spriteSheetDetector';
import { DEFAULT_STANDARD_TEMPLATE } from '../../types/mouth';

describe('Sprite Sheet Detection & Grid Generation', () => {
  it('generates standard 3x3 grid crops with correct coordinates and labels', () => {
    const crops = generateGridCrops(900, 900, 3, 3, DEFAULT_STANDARD_TEMPLATE.expectedOrder);
    expect(crops.length).toBe(9);

    // Cell size is 300x300
    expect(crops[0].label).toBe('A');
    expect(crops[0].rect).toEqual({ x: 0, y: 0, width: 300, height: 300 });

    expect(crops[1].label).toBe('B');
    expect(crops[1].rect).toEqual({ x: 300, y: 0, width: 300, height: 300 });

    expect(crops[4].label).toBe('E');
    expect(crops[4].rect).toEqual({ x: 300, y: 300, width: 300, height: 300 });

    expect(crops[8].label).toBe('X');
    expect(crops[8].rect).toEqual({ x: 600, y: 600, width: 300, height: 300 });
  });

  it('detects blank transparent cells during crop validation', () => {
    // 50x50 transparent image
    const data = new Uint8ClampedArray(50 * 50 * 4); // all 0 alpha
    const imgData = {
      width: 50,
      height: 50,
      data,
    } as ImageData;

    const validation = validateCropContent(imgData, { x: 0, y: 0, width: 50, height: 50 });
    expect(validation.hasContent).toBe(false);
    expect(validation.warning).toContain('blank');
  });
});
