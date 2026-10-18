import Dexie, { Table } from 'dexie';
import { Character } from '../../types/character';
import { MouthCollection, MouthAsset } from '../../types/mouth';
import { Project } from '../../types/project';
import { AudioAsset, AnimationTimeline } from '../../types/timeline';

export class AnimationDatabase extends Dexie {
  characters!: Table<Character, string>;
  mouthCollections!: Table<MouthCollection, string>;
  mouthAssets!: Table<MouthAsset, string>;
  projects!: Table<Project, string>;
  audioAssets!: Table<AudioAsset, string>;
  timelines!: Table<AnimationTimeline, string>;

  constructor() {
    super('CartoonSpeaksDB');
    this.version(1).stores({
      characters: 'id, name, mouthCollectionId, createdAt, updatedAt',
      mouthCollections: 'id, name, createdAt, updatedAt',
      mouthAssets: 'id, collectionId, label, createdAt',
      projects: 'id, name, characterId, audioAssetId, timelineId, createdAt, updatedAt',
      audioAssets: 'id, name, createdAt',
      timelines: 'id, projectId, createdAt, updatedAt',
    });
  }
}

export const db = new AnimationDatabase();
