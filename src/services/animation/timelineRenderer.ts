export interface FrameTimeStep {
  frameIndex: number;
  timestamp: number; // in seconds
  timestampMicros: number; // microseconds for WebCodecs
}

export function generateFrameTimeSteps(duration: number, fps: number): FrameTimeStep[] {
  const steps: FrameTimeStep[] = [];
  const totalFrames = Math.max(1, Math.ceil(duration * fps));
  const frameDuration = 1 / fps;

  for (let i = 0; i < totalFrames; i++) {
    const time = i * frameDuration;
    steps.push({
      frameIndex: i,
      timestamp: time,
      timestampMicros: Math.round(time * 1_000_000),
    });
  }

  return steps;
}
