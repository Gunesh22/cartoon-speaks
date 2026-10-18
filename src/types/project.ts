import { ExportSettings, DEFAULT_EXPORT_SETTINGS } from './export';
import { LipSyncTuningSettings, DEFAULT_LIPSYNC_TUNING } from './timeline';

export interface Project {
  id: string;
  name: string;
  characterId?: string;
  audioAssetId?: string;
  scriptText: string;
  timelineId?: string;
  exportSettings: ExportSettings;
  lipSyncSettings?: LipSyncTuningSettings;
  createdAt: number;
  updatedAt: number;
}

export const createDefaultProject = (id: string, name: string = 'Untitled Animation'): Project => ({
  id,
  name,
  scriptText: '',
  exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
  lipSyncSettings: { ...DEFAULT_LIPSYNC_TUNING },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

