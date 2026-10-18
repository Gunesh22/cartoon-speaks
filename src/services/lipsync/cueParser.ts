import { TimelineCue } from '../../types/timeline';
import { generateId } from '../../utils/ids';

export interface RhubarbJsonCue {
  start: number;
  end: number;
  value: string;
}

export interface RhubarbJsonObject {
  metadata?: {
    duration?: number;
    soundFile?: string;
  };
  mouthCues?: RhubarbJsonCue[];
}

/**
 * Parses Rhubarb CLI JSON output format.
 */
export function parseRhubarbJson(jsonStr: string): { duration: number; cues: TimelineCue[] } {
  let parsed: RhubarbJsonObject;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(`Failed to parse Rhubarb JSON: ${err instanceof Error ? err.message : 'Invalid JSON'}`);
  }

  const rawCues = parsed.mouthCues || [];
  const duration = parsed.metadata?.duration || (rawCues.length > 0 ? rawCues[rawCues.length - 1].end : 0);

  const cues: TimelineCue[] = rawCues.map((c) => ({
    id: generateId('cue'),
    start: Number(c.start),
    end: Number(c.end),
    shape: c.value.toUpperCase(),
    source: 'rhubarb',
  }));

  return { duration, cues: sanitizeCues(cues) };
}

/**
 * Parses Rhubarb CLI TSV / tab-delimited output format.
 * Format 1: <start>\t<end>\t<shape>
 * Format 2: <start>\t<shape> (where end is the next start)
 */
export function parseRhubarbTsv(tsvStr: string, totalDuration: number = 0): { duration: number; cues: TimelineCue[] } {
  const lines = tsvStr.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  const tempEntries: Array<{ start: number; end?: number; shape: string }> = [];

  for (const line of lines) {
    const parts = line.split(/\t|\s+/);
    if (parts.length >= 3) {
      const start = parseFloat(parts[0]);
      const end = parseFloat(parts[1]);
      const shape = parts[2].trim().toUpperCase();
      if (!isNaN(start) && !isNaN(end)) {
        tempEntries.push({ start, end, shape });
      }
    } else if (parts.length === 2) {
      const start = parseFloat(parts[0]);
      const shape = parts[1].trim().toUpperCase();
      if (!isNaN(start)) {
        tempEntries.push({ start, shape });
      }
    }
  }

  const cues: TimelineCue[] = [];
  for (let i = 0; i < tempEntries.length; i++) {
    const curr = tempEntries[i];
    const next = tempEntries[i + 1];
    const start = curr.start;
    const end = curr.end !== undefined ? curr.end : next ? next.start : Math.max(start + 0.2, totalDuration);

    cues.push({
      id: generateId('cue'),
      start,
      end,
      shape: curr.shape,
      source: 'rhubarb',
    });
  }

  const maxEnd = cues.length > 0 ? cues[cues.length - 1].end : totalDuration;
  return { duration: Math.max(maxEnd, totalDuration), cues: sanitizeCues(cues) };
}

/**
 * Ensures cues are sorted chronologically and non-overlapping.
 */
export function sanitizeCues(cues: TimelineCue[]): TimelineCue[] {
  const sorted = [...cues].sort((a, b) => a.start - b.start);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (current.end <= current.start) {
      current.end = current.start + 0.05;
    }
    const next = sorted[i + 1];
    if (next && current.end > next.start) {
      current.end = next.start;
    }
  }

  return sorted.filter((c) => c.end > c.start);
}

/**
 * Modifies the start, end, or duration of a specific cue, seamlessly adjusting adjacent cues
 * so mouth transitions stay connected without unwanted gaps or overlaps.
 */
export function modifyCueTiming(
  cues: TimelineCue[],
  cueId: string,
  newStart?: number,
  newEnd?: number,
  maxDuration?: number
): TimelineCue[] {
  const sorted = cues.map((c) => ({ ...c })).sort((a, b) => a.start - b.start);
  const idx = sorted.findIndex((c) => c.id === cueId);
  if (idx === -1) return sorted;

  const target = sorted[idx];
  const MIN_DUR = 0.04;
  const totalMax = maxDuration && maxDuration > 0 ? maxDuration : 999999;

  let start = newStart !== undefined ? Math.max(0, newStart) : target.start;
  let end = newEnd !== undefined ? Math.min(totalMax, newEnd) : target.end;

  const prevCue = idx > 0 ? sorted[idx - 1] : null;
  const nextCue = idx < sorted.length - 1 ? sorted[idx + 1] : null;

  // 1. Adjusting start time (e.g. dragging left handle)
  if (newStart !== undefined) {
    if (prevCue) {
      const wasTouching = Math.abs(prevCue.end - target.start) < 0.03;
      if (wasTouching || start < prevCue.end) {
        start = Math.max(prevCue.start + MIN_DUR, start);
        prevCue.end = start;
      }
    }
    start = Math.min(start, end - MIN_DUR);
  }

  // 2. Adjusting end time (e.g. dragging right handle or modifying duration)
  if (newEnd !== undefined) {
    if (nextCue) {
      const wasTouching = Math.abs(nextCue.start - target.end) < 0.03;
      if (wasTouching || end > nextCue.start) {
        end = Math.min(nextCue.end - MIN_DUR, end);
        nextCue.start = end;
      }
    }
    end = Math.min(totalMax, Math.max(start + MIN_DUR, end));
  }

  target.start = Number(start.toFixed(3));
  target.end = Number(end.toFixed(3));
  if (prevCue) prevCue.end = Number(prevCue.end.toFixed(3));
  if (nextCue) nextCue.start = Number(nextCue.start.toFixed(3));

  return sanitizeCues(sorted);
}
