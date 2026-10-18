import { describe, it, expect } from 'vitest';
import {
  calculateCharacterCanvasBounds,
  calculateMouthCanvasBounds,
  pointToNormalizedCoordinates,
} from './coordinateUtils';
import { MouthPlacement } from '../types/character';

describe('Coordinate Conversion & Separation', () => {
  const placement: MouthPlacement = {
    normalizedX: 0.5,
    normalizedY: 0.6,
    scale: 1.0,
    rotation: 0,
    anchorX: 0.5,
    anchorY: 0.5,
  };

  it('calculates character canvas bounds correctly for 16:9 landscape', () => {
    const bounds = calculateCharacterCanvasBounds(800, 1000, 1920, 1080, 'contain');
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
    // Height fits inside 1080 * 0.9 = 972
    expect(bounds.height).toBeCloseTo(972, 1);
    expect(bounds.width).toBeCloseTo(972 * (800 / 1000), 1);
    // Centered horizontally
    expect(bounds.x).toBeCloseTo((1920 - bounds.width) / 2, 1);
  });

  it('calculates character canvas bounds correctly for 9:16 portrait', () => {
    const bounds = calculateCharacterCanvasBounds(800, 1000, 1080, 1920, 'contain');
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
    // Width fits inside 1080 * 0.9 = 972
    expect(bounds.width).toBeCloseTo(972, 1);
    expect(bounds.height).toBeCloseTo(972 * (1000 / 800), 1);
    // Centered vertically
    expect(bounds.y).toBeCloseTo((1920 - bounds.height) / 2, 1);
  });

  it('ensures changing aspect ratio does not alter character-relative mouth center', () => {
    const landscapeBounds = calculateCharacterCanvasBounds(800, 1000, 1920, 1080, 'contain');
    const portraitBounds = calculateCharacterCanvasBounds(800, 1000, 1080, 1920, 'contain');

    const landscapeMouth = calculateMouthCanvasBounds(landscapeBounds, 120, 60, placement);
    const portraitMouth = calculateMouthCanvasBounds(portraitBounds, 120, 60, placement);

    // Mouth relative position inside character bounds must match exact normalized placement
    const landscapeRelX = (landscapeMouth.centerX - landscapeBounds.x) / landscapeBounds.width;
    const landscapeRelY = (landscapeMouth.centerY - landscapeBounds.y) / landscapeBounds.height;

    const portraitRelX = (portraitMouth.centerX - portraitBounds.x) / portraitBounds.width;
    const portraitRelY = (portraitMouth.centerY - portraitBounds.y) / portraitBounds.height;

    expect(landscapeRelX).toBeCloseTo(0.5, 3);
    expect(landscapeRelY).toBeCloseTo(0.6, 3);
    expect(portraitRelX).toBeCloseTo(0.5, 3);
    expect(portraitRelY).toBeCloseTo(0.6, 3);
  });

  it('converts canvas pixel click to normalized coordinates', () => {
    const bounds = { x: 100, y: 200, width: 400, height: 600 };
    // Center point
    const { normX, normY } = pointToNormalizedCoordinates(300, 500, bounds);
    expect(normX).toBeCloseTo(0.5, 3);
    expect(normY).toBeCloseTo(0.5, 3);
  });

  it('aligns mouth anchor precisely with character anchor', () => {
    const charBounds = { x: 50, y: 100, width: 400, height: 500 };
    const customPlacement: MouthPlacement = {
      normalizedX: 0.52,
      normalizedY: 0.68,
      mouthWidthPercent: 30, // 30% of 400 = 120px
      rotation: 15,
      anchorX: 0.5,
      anchorY: 0.46875,
    };

    const mouthCalc = calculateMouthCanvasBounds(
      charBounds,
      512,
      512,
      customPlacement,
      { anchorX: 0.5, anchorY: 0.46875 }
    );

    // Character anchor target point on canvas
    const expectedTargetX = 50 + 0.52 * 400; // 258
    const expectedTargetY = 100 + 0.68 * 500; // 440

    expect(mouthCalc.targetX).toBeCloseTo(expectedTargetX, 4);
    expect(mouthCalc.targetY).toBeCloseTo(expectedTargetY, 4);

    // Mouth dimensions
    expect(mouthCalc.width).toBeCloseTo(120, 4);
    expect(mouthCalc.height).toBeCloseTo(120, 4); // 512x512 is 1:1

    // Anchor offsets in rendered space
    expect(mouthCalc.anchorOffsetX).toBeCloseTo(120 * 0.5, 4); // 60px
    expect(mouthCalc.anchorOffsetY).toBeCloseTo(120 * 0.46875, 4); // 56.25px
  });

  it('changing mouth shape preserves character anchor target location', () => {
    const charBounds = { x: 0, y: 0, width: 600, height: 800 };
    const testPlacement: MouthPlacement = {
      normalizedX: 0.48,
      normalizedY: 0.62,
      mouthWidthPercent: 25,
      rotation: 0,
    };

    // Shape A (Closed/smile) - 512x512
    const shapeA = calculateMouthCanvasBounds(charBounds, 512, 512, testPlacement, {
      anchorX: 0.5,
      anchorY: 0.46875,
    });

    // Shape D (Wide open - extends downward) - 512x512
    const shapeD = calculateMouthCanvasBounds(charBounds, 512, 512, testPlacement, {
      anchorX: 0.5,
      anchorY: 0.46875,
    });

    // Shape O (Small pursed) - 256x256
    const shapeO = calculateMouthCanvasBounds(charBounds, 256, 256, testPlacement, {
      anchorX: 0.5,
      anchorY: 0.46875,
    });

    // All shapes must have identical targetX and targetY
    expect(shapeA.targetX).toBe(shapeD.targetX);
    expect(shapeA.targetY).toBe(shapeD.targetY);
    expect(shapeA.targetX).toBe(shapeO.targetX);
    expect(shapeA.targetY).toBe(shapeO.targetY);
  });
});
