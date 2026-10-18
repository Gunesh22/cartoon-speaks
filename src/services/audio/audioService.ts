export interface WaveformData {
  peaks: Float32Array; // min and max peak pairs
  duration: number;
}

export class AudioService {
  private audioCtx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private isMuted: boolean = false;
  private onEndedCallbacks: Set<() => void> = new Set();

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    return this.audioCtx;
  }

  loadAudioBlob(blob: Blob): Promise<{ duration: number; url: string }> {
    this.cleanup();
    this.currentObjectUrl = URL.createObjectURL(blob);
    this.audioElement = new Audio(this.currentObjectUrl);
    this.audioElement.muted = this.isMuted;
    this.audioElement.onended = () => {
      this.onEndedCallbacks.forEach((cb) => cb());
    };

    return new Promise((resolve, reject) => {
      if (!this.audioElement) return reject(new Error('Audio element not initialized'));

      this.audioElement.onloadedmetadata = () => {
        resolve({
          duration: this.audioElement?.duration || 0,
          url: this.currentObjectUrl!,
        });
      };
      this.audioElement.onerror = () => {
        reject(new Error('Failed to load audio element'));
      };
    });
  }

  async generateWaveformData(blob: Blob, targetBins: number = 200): Promise<WaveformData> {
    const OfflineCtx =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    const ctx = OfflineCtx ? new OfflineCtx(1, 1, 44100) : this.getAudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.floor(channelData.length / targetBins));
    const peaks = new Float32Array(targetBins * 2);

    for (let i = 0; i < targetBins; i++) {
      let min = 1.0;
      let max = -1.0;
      const start = i * step;
      const end = Math.min(channelData.length, start + step);

      for (let j = start; j < end; j++) {
        const val = channelData[j];
        if (val < min) min = val;
        if (val > max) max = val;
      }

      peaks[i * 2] = min;
      peaks[i * 2 + 1] = max;
    }

    return {
      peaks,
      duration: audioBuffer.duration,
    };
  }

  play(): Promise<void> {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    if (this.audioElement) {
      return this.audioElement.play();
    }
    return Promise.resolve();
  }

  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  seek(timeInSeconds: number): void {
    if (this.audioElement) {
      this.audioElement.currentTime = Math.max(0, Math.min(timeInSeconds, this.audioElement.duration || 0));
    }
  }

  getCurrentTime(): number {
    return this.audioElement ? this.audioElement.currentTime : 0;
  }

  getDuration(): number {
    return this.audioElement ? this.audioElement.duration || 0 : 0;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.audioElement) {
      this.audioElement.muted = muted;
    }
  }

  onEnded(callback: () => void): () => void {
    this.onEndedCallbacks.add(callback);
    if (this.audioElement) {
      this.audioElement.onended = () => {
        this.onEndedCallbacks.forEach((cb) => cb());
      };
    }
    return () => {
      this.onEndedCallbacks.delete(callback);
    };
  }

  cleanup(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }
}

export const audioService = new AudioService();
