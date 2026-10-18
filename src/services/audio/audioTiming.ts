export class AnimationTicker {
  private rafId: number | null = null;
  private isRunning: boolean = false;
  private onTick: (time: number) => void;
  private getTime: () => number;

  constructor(getTime: () => number, onTick: (time: number) => void) {
    this.getTime = getTime;
    this.onTick = onTick;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = () => {
      if (!this.isRunning) return;
      this.onTick(this.getTime());
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
