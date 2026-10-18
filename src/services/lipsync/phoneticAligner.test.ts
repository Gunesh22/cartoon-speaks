import { describe, it, expect } from 'vitest';
import {
  extractWordVisemes,
  buildSpeechTimelineCues,
  smoothAndFilterCues,
  validateTimelineCues,
} from './phoneticAligner';

describe('Phonetic Aligner & Natural Lip-Sync Engine', () => {
  it('extracts natural phoneme visemes with bilabial closures', () => {
    // "Happy" must contain bilabial closure 'A' (/p/)
    const happyVisemes = extractWordVisemes('Happy');
    expect(happyVisemes.some((v) => v.shape === 'A')).toBe(true);

    // "Manan" starts with M closure 'A'
    const mananVisemes = extractWordVisemes('Manan');
    expect(mananVisemes[0].shape).toBe('A');

    // "Ashram" ends with M closure 'A'
    const ashramVisemes = extractWordVisemes('Ashram');
    expect(ashramVisemes.some((v) => v.shape === 'A')).toBe(true);

    // "swagat" has pursed 'O' (/w/) and open vowel 'D'
    const swagatVisemes = extractWordVisemes('swagat');
    expect(swagatVisemes.some((v) => v.shape === 'O')).toBe(true);
    expect(swagatVisemes.some((v) => v.shape === 'D')).toBe(true);
  });

  it('generates speech-aligned cues for "Happy Thoughts, Manan Ashram par aapka swagat hai" without long open holds', () => {
    const words = ['Happy', 'Thoughts,', 'Manan', 'Ashram', 'par', 'aapka', 'swagat', 'hai'];
    const totalDuration = 3.87;
    const speechIntervals = [{ start: 0.12, end: 3.65 }];
    const silenceIntervals = [
      { start: 0, end: 0.12 },
      { start: 3.65, end: 3.87 },
    ];

    const cues = buildSpeechTimelineCues(
      words,
      speechIntervals,
      totalDuration,
      { speed: 'natural', smoothness: 'medium', minDurationMs: 90 },
      silenceIntervals
    );

    expect(cues.length).toBeGreaterThan(15);

    // 1. Initial silence
    expect(cues[0].shape).toBe('X');
    expect(cues[0].start).toBe(0);

    // 2. Final silence
    const lastCue = cues[cues.length - 1];
    expect(lastCue.shape).toBe('X');
    expect(lastCue.end).toBeCloseTo(totalDuration, 2);

    // 3. NO mouth shape should stay open for >= 500ms (Requirement 2 & 5)
    for (const cue of cues) {
      const dur = cue.end - cue.start;
      if (cue.shape !== 'X') {
        expect(dur).toBeLessThanOrEqual(0.35); // Max 350ms for natural speech articulation
      }
    }

    // 4. Closed-lip consonants ('A' for M, P, B) must be represented throughout the sentence
    const aCues = cues.filter((c) => c.shape === 'A');
    expect(aCues.length).toBeGreaterThanOrEqual(4);

    // 5. Contiguous boundaries (no overlapping cues or negative durations)
    for (let i = 0; i < cues.length - 1; i++) {
      expect(cues[i].end).toBeCloseTo(cues[i + 1].start, 3);
      expect(cues[i].end).toBeGreaterThan(cues[i].start);
    }

    // 6. Validation should report 0 warnings
    const warnings = validateTimelineCues(cues, totalDuration, silenceIntervals);
    expect(warnings.length).toBe(0);
  });

  it('flags mouth shapes held longer than 500ms in validateTimelineCues', () => {
    const problematicCues = [
      { id: '1', start: 0.0, end: 0.85, shape: 'D' }, // 850ms open mouth hold!
      { id: '2', start: 0.85, end: 1.0, shape: 'A' },
      { id: '3', start: 1.0, end: 3.87, shape: 'X' },
    ];

    const warnings = validateTimelineCues(problematicCues, 3.87);
    expect(warnings.some((w) => w.type === 'long-duration')).toBe(true);
  });

  it('smooths consecutive identical shapes without eating essential closures', () => {
    const raw = [
      { id: '1', start: 0.0, end: 0.12, shape: 'D' },
      { id: '2', start: 0.12, end: 0.20, shape: 'A' }, // 80ms closure
      { id: '3', start: 0.20, end: 0.35, shape: 'C' },
    ];

    const smoothed = smoothAndFilterCues(raw, 0.35);
    // Closure 'A' must still be present
    expect(smoothed.some((c) => c.shape === 'A')).toBe(true);
  });

  it('aligns punctuation clauses accurately to distinct speech intervals across pauses', () => {
    // 2 speech intervals separated by a 200ms breath pause between 1.10s and 1.30s
    const words = ['Happy', 'Thoughts,', 'Manan', 'Ashram', 'par', 'aapka', 'swagat', 'hai'];
    const speechIntervals = [
      { start: 0.12, end: 1.10 }, // "Happy Thoughts,"
      { start: 1.30, end: 3.65 }, // "Manan Ashram par aapka swagat hai"
    ];
    const totalDuration = 3.87;

    const cues = buildSpeechTimelineCues(words, speechIntervals, totalDuration);

    // 1. Cues in Interval 0 (up to 1.10s) must only belong to "Happy Thoughts,"
    const interval0Cues = cues.filter((c) => c.start >= 0.12 && c.end <= 1.10);
    expect(interval0Cues.length).toBeGreaterThan(0);
    for (const c of interval0Cues) {
      if (c.text) {
        expect(['Happy', 'Thoughts', 'pause']).toContain(c.text);
      }
    }

    // 2. Pause between 1.10s and 1.30s must be marked as 'X'
    const pauseCue = cues.find((c) => Math.abs(c.start - 1.10) < 0.05 && c.shape === 'X');
    expect(pauseCue).toBeDefined();

    // 3. Immediately after the pause (at 1.30s), the second interval starts with "Manan" /m/ closure 'A'
    const mananFirstCue = cues.find((c) => Math.abs(c.start - 1.30) < 0.05);
    expect(mananFirstCue).toBeDefined();
    expect(mananFirstCue?.shape).toBe('A'); // Bilabial /m/ closure
    expect(mananFirstCue?.text).toBe('Manan');
    expect(mananFirstCue?.source).toBe('heuristic');
  });

  it('adjusts mouth cue density and count according to minDurationMs and speed tuning', () => {
    const words = [
      'Welcome', 'to', 'our', 'channel,', 'today', 'we', 'are', 'exploring', 'the',
      'beautiful', 'campus', 'and', 'learning', 'about', 'animation.'
    ];
    const totalDuration = 6.0;
    const speechIntervals = [{ start: 0.1, end: 5.8 }];

    // 1. Snappy / Fast (minDuration 60ms)
    const snappyCues = buildSpeechTimelineCues(
      words,
      speechIntervals,
      totalDuration,
      { speed: 'faster', smoothness: 'low', minDurationMs: 60 }
    );

    // 2. Slow / Deliberate (minDuration 180ms)
    const slowCues = buildSpeechTimelineCues(
      words,
      speechIntervals,
      totalDuration,
      { speed: 'slower', smoothness: 'high', minDurationMs: 180 }
    );

    // Snappy must generate significantly more mouth cues than slow
    expect(snappyCues.length).toBeGreaterThan(slowCues.length);
    // Slow cues must have fewer mouth movements
    expect(slowCues.length).toBeLessThan(snappyCues.length * 0.75);

    // In slowCues, every speech cue should respect minDurationMs (>= 170ms, allowing minor rounding)
    // closures (A, F) are protected down to 50ms
    for (const cue of slowCues) {
      if (cue.shape !== 'X' && cue.shape !== 'A' && cue.shape !== 'F') {
        expect(cue.end - cue.start).toBeGreaterThanOrEqual(0.16);
      }
    }
  });
});
