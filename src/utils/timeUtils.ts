export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function formatTimeCompact(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0.00s';
  return `${seconds.toFixed(2)}s`;
}

export function parseSeconds(timeStr: string): number | null {
  const match = timeStr.trim().match(/^(\d+):(\d+(?:\.\d+)?)$/);
  if (match) {
    const mins = parseFloat(match[1]);
    const secs = parseFloat(match[2]);
    return mins * 60 + secs;
  }
  const plainNum = parseFloat(timeStr);
  return isNaN(plainNum) ? null : plainNum;
}
