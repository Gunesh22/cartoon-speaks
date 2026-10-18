export type AspectRatioId = '9:16' | '16:9' | '1:1' | '4:5' | 'custom';

export interface AspectRatioPreset {
  id: AspectRatioId;
  label: string;
  width: number;
  height: number;
  ratioText: string;
}

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { id: '9:16', label: 'Story / Reel / Shorts', width: 1080, height: 1920, ratioText: '9:16' },
  { id: '16:9', label: 'Landscape Video', width: 1920, height: 1080, ratioText: '16:9' },
  { id: '1:1', label: 'Square Post', width: 1080, height: 1080, ratioText: '1:1' },
  { id: '4:5', label: 'Portrait Feed', width: 1080, height: 1350, ratioText: '4:5' },
];

export type BackgroundType = 'transparent' | 'color' | 'image';
export type CharacterFitMode = 'contain' | 'cover' | 'manual';
export type ExportFormat = 'mp4' | 'webm-alpha' | 'webm';

export interface ExportSettings {
  aspectRatio: AspectRatioId;
  width: number;
  height: number;
  fps: number; // e.g. 30 or 60
  format: ExportFormat;
  includeAudio: boolean; // export video with audio track or video-only
  backgroundType: BackgroundType;
  backgroundColor: string; // hex
  backgroundImageBlob?: Blob;
  fitMode: CharacterFitMode;
  manualScale: number;
  manualOffsetX: number; // pixels on canvas
  manualOffsetY: number; // pixels on canvas
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  aspectRatio: '16:9',
  width: 1920,
  height: 1080,
  fps: 30,
  format: 'mp4',
  includeAudio: true,
  backgroundType: 'color',
  backgroundColor: '#ffffff',
  fitMode: 'contain',
  manualScale: 1.0,
  manualOffsetX: 0,
  manualOffsetY: 0,
};

export interface CodecCapabilities {
  webCodecsSupported: boolean;
  mp4Supported: boolean;
  vp9AlphaSupported: boolean;
  vp8AlphaSupported: boolean;
  mediaRecorderSupported: boolean;
}

export interface ExportProgress {
  status: 'idle' | 'rendering' | 'muxing' | 'complete' | 'error' | 'cancelled';
  renderedFrames: number;
  totalFrames: number;
  percentage: number;
  errorMessage?: string;
  outputBlob?: Blob;
}
