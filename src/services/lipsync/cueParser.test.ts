import { describe, it, expect } from 'vitest';
import { parseRhubarbJson, parseRhubarbTsv, sanitizeCues, modifyCueTiming } from './cueParser';

describe('Rhubarb Cue Parser', () => {
  it('parses valid Rhubarb CLI JSON output', () => {
    const jsonStr = JSON.stringify({
      metadata: {
        soundFile: 'speech.wav',
        duration: 3.5,
      },
      mouthCues: [
        { start: 0.0, end: 0.25, value: 'X' },
        { start: 0.25, end: 0.65, value: 'B' },
        { start: 0.65, end: 1.1, value: 'C' },
        { start: 1.1, end: 1.8, value: 'D' },
        { start: 1.8, end: 3.5, value: 'X' },
      ],
    });

    const result = parseRhubarbJson(jsonStr);
    expect(result.duration).toBe(3.5);
    expect(result.cues.length).toBe(5);
    expect(result.cues[0].shape).toBe('X');
    expect(result.cues[1].shape).toBe('B');
    expect(result.cues[2].shape).toBe('C');
    expect(result.cues[3].shape).toBe('D');
    expect(result.cues[4].shape).toBe('X');
  });

  it('parses Rhubarb 3-column TSV format', () => {
    const tsv = `0.00\t0.30\tX
0.30\t0.75\tB
0.75\t1.20\tC
1.20\t2.00\tX`;

    const result = parseRhubarbTsv(tsv);
    expect(result.cues.length).toBe(4);
    expect(result.cues[0].start).toBe(0.0);
    expect(result.cues[0].end).toBe(0.3);
    expect(result.cues[1].shape).toBe('B');
    expect(result.duration).toBe(2.0);
  });

  it('parses Rhubarb 2-column TSV format', () => {
    const tsv = `0.00\tX
0.40\tC
0.90\tB
1.50\tX`;

    const result = parseRhubarbTsv(tsv, 2.0);
    expect(result.cues.length).toBe(4);
    expect(result.cues[0].end).toBe(0.4);
    expect(result.cues[1].start).toBe(0.4);
    expect(result.cues[1].end).toBe(0.9);
  });

  it('sanitizes overlapping cues and sorts chronologically', () => {
    const rawCues = [
      { id: '1', start: 0.5, end: 0.8, shape: 'B' },
      { id: '2', start: 0.0, end: 0.6, shape: 'X' }, // Overlaps cue 1
      { id: '3', start: 0.7, end: 1.2, shape: 'C' }, // Overlaps cue 1
    ];

    const sanitized = sanitizeCues(rawCues);
    expect(sanitized[0].start).toBe(0.0);
    expect(sanitized[0].end).toBe(0.5); // Clamped to cue 1 start
    expect(sanitized[1].start).toBe(0.5);
    expect(sanitized[1].end).toBe(0.7); // Clamped to cue 3 start
    expect(sanitized[2].start).toBe(0.7);
  });

  it('increases and decreases cue duration seamlessly adjusting adjacent cues', () => {
    const cues = [
      { id: '1', start: 0.0, end: 0.2, shape: 'X' },
      { id: '2', start: 0.2, end: 0.5, shape: 'A' },
      { id: '3', start: 0.5, end: 0.9, shape: 'C' },
    ];

    // Increase cue 2 duration by setting new end to 0.65
    const extended = modifyCueTiming(cues, '2', undefined, 0.65, 2.0);
    expect(extended[1].start).toBe(0.2);
    expect(extended[1].end).toBe(0.65);
    expect(extended[2].start).toBe(0.65); // Cue 3 start adjusted seamlessly!
    expect(extended[2].end).toBe(0.9);

    // Decrease cue 2 duration by setting new end to 0.35
    const shortened = modifyCueTiming(cues, '2', undefined, 0.35, 2.0);
    expect(shortened[1].start).toBe(0.2);
    expect(shortened[1].end).toBe(0.35);
    expect(shortened[2].start).toBe(0.35); // Cue 3 start moved earlier!

    // Adjust start time of cue 2 (dragging left handle)
    const startMoved = modifyCueTiming(cues, '2', 0.15, undefined, 2.0);
    expect(startMoved[0].end).toBe(0.15); // Cue 1 end adjusted!
    expect(startMoved[1].start).toBe(0.15);
  });
});
