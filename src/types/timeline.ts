import { RhubarbShape } from './mouth';

export interface TimelineCue {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  shape: RhubarbShape | string;
  text?: string; // phoneme, word, or sound associated with this cue
  source?: 'rhubarb' | 'heuristic' | 'manual'; // distinction between acoustic Rhubarb timestamps and heuristic estimates
}

export interface CueWarning {
  cueId: string;
  type: 'long-duration' | 'open-in-silence' | 'exceeds-duration' | 'overlap' | 'negative-duration';
  message: string;
  severity: 'warning' | 'error';
}

export interface AnimationTimeline {
  id: string;
  projectId: string;
  duration: number; // total duration in seconds
  cues: TimelineCue[];
  smoothing: boolean;
  createdAt: number;
  updatedAt: number;
}

export type LipSyncSpeed = 'slower' | 'natural' | 'faster';
export type TransitionSmoothness = 'low' | 'medium' | 'high';

export interface LipSyncTuningSettings {
  speed: LipSyncSpeed;
  smoothness: TransitionSmoothness;
  minDurationMs: number; // in milliseconds (default 90)
}

export const DEFAULT_LIPSYNC_TUNING: LipSyncTuningSettings = {
  speed: 'natural',
  smoothness: 'medium',
  minDurationMs: 90,
};

export interface AudioAsset {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  sampleRate: number;
  channels: number;
  createdAt: number;
}
