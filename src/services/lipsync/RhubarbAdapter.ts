import { LipSyncEngine, LipSyncOptions } from './LipSyncEngine';
import { TimelineCue } from '../../types/timeline';
import { parseRhubarbJson, parseRhubarbTsv } from './cueParser';

export class RhubarbAdapter implements LipSyncEngine {
  readonly id = 'rhubarb-companion';
  readonly name = 'Rhubarb Lip Sync (Local CLI / Companion)';
  readonly description = 'Executes Rhubarb CLI locally via a companion endpoint or imports Rhubarb output';

  private localServiceUrl = 'http://127.0.0.1:8765/analyze';

  setCompanionUrl(url: string) {
    this.localServiceUrl = url;
  }

  getCompanionUrl(): string {
    return this.localServiceUrl;
  }

  isCompanionEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('rhubarb_companion_enabled') === 'true';
  }

  setCompanionEnabled(enabled: boolean) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('rhubarb_companion_enabled', enabled ? 'true' : 'false');
  }

  async isAvailable(): Promise<boolean> {
    // Only probe local port if user explicitly enabled the optional local companion runner
    if (!this.isCompanionEnabled()) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(this.localServiceUrl.replace('/analyze', '/health'), {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateLipSync(
    audioBlob: Blob,
    scriptText: string,
    duration: number,
    options?: LipSyncOptions
  ): Promise<{ cues: TimelineCue[]; duration: number }> {
    const isUp = await this.isAvailable();
    if (!isUp) {
      throw new Error(
        'Local Rhubarb runner is not running at ' +
          this.localServiceUrl +
          '. You can run the local companion script, import a Rhubarb output file (.json / .tsv), or use the built-in browser engine.'
      );
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, 'speech.wav');
    formData.append('script', scriptText);
    formData.append('recognizer', options?.recognizer || 'phonetic');

    const response = await fetch(this.localServiceUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Rhubarb runner error: ${err}`);
    }

    const text = await response.text();
    if (text.trim().startsWith('{')) {
      return parseRhubarbJson(text);
    }
    return parseRhubarbTsv(text, duration);
  }

  /**
   * Helper to parse user-dropped or uploaded Rhubarb output file (.json / .tsv / .txt)
   */
  parseFileContent(content: string, audioDuration: number = 0): { cues: TimelineCue[]; duration: number } {
    const trimmed = content.trim();
    if (trimmed.startsWith('{')) {
      return parseRhubarbJson(trimmed);
    }
    return parseRhubarbTsv(trimmed, audioDuration);
  }
}

export const rhubarbAdapter = new RhubarbAdapter();
