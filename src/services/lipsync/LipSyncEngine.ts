import { TimelineCue, LipSyncTuningSettings } from '../../types/timeline';

export interface LipSyncOptions {
  recognizer?: 'pocketSphinx' | 'phonetic';
  dialogText?: string;
  extendedShapes?: boolean;
  tuning?: LipSyncTuningSettings;
}

export interface LipSyncEngine {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  
  isAvailable(): Promise<boolean>;
  generateLipSync(
    audioBlob: Blob,
    scriptText: string,
    duration: number,
    options?: LipSyncOptions
  ): Promise<{ cues: TimelineCue[]; duration: number }>;
}
