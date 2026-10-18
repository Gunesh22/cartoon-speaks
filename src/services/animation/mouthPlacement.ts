import { TimelineCue } from '../../types/timeline';

/**
 * Finds active mouth cue at a specific time in seconds.
 * Binary/linear search with rest shape 'X' fallback.
 */
export function getActiveCueAtTime(
  cues: TimelineCue[],
  currentTime: number
): TimelineCue | null {
  if (!cues || cues.length === 0) return null;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (currentTime >= cue.start && currentTime < cue.end) {
      return cue;
    }
  }

  return null;
}

/**
 * Resolves which mouth asset ID should be rendered at a given timestamp.
 */
export function resolveMouthAssetIdAtTime(
  cues: TimelineCue[],
  currentTime: number,
  mouthMapping?: Record<string, string>,
  defaultShape: string = 'X'
): string | undefined {
  if (!mouthMapping || Object.keys(mouthMapping).length === 0) {
    return undefined;
  }

  const activeCue = getActiveCueAtTime(cues, currentTime);
  const rawShape = activeCue ? activeCue.shape : defaultShape;
  const upperShape = (rawShape || 'X').toUpperCase();

  // 1. Direct match
  if (mouthMapping[rawShape]) {
    return mouthMapping[rawShape];
  }
  if (mouthMapping[upperShape]) {
    return mouthMapping[upperShape];
  }

  // 2. Case-insensitive lookup in keys
  const matchingKey = Object.keys(mouthMapping).find(
    (k) => k.toUpperCase() === upperShape
  );
  if (matchingKey && mouthMapping[matchingKey]) {
    return mouthMapping[matchingKey];
  }

  // 3. Fallbacks: 'X', 'A', then first available asset
  if (mouthMapping['X'] || mouthMapping['x']) return mouthMapping['X'] || mouthMapping['x'];
  if (mouthMapping['A'] || mouthMapping['a']) return mouthMapping['A'] || mouthMapping['a'];

  const firstAvailable = Object.values(mouthMapping)[0];
  return firstAvailable;
}
