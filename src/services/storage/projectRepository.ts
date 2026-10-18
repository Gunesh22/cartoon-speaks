import { db } from './database';
import { Project, createDefaultProject } from '../../types/project';
import { ExportSettings } from '../../types/export';
import { generateId } from '../../utils/ids';

export const projectRepository = {
  async getAll(): Promise<Project[]> {
    return db.projects.orderBy('updatedAt').reverse().toArray();
  },

  async getById(id: string): Promise<Project | undefined> {
    return db.projects.get(id);
  },

  async create(name?: string): Promise<Project> {
    const id = generateId('proj');
    const project = createDefaultProject(id, name || 'Untitled Project');
    await db.projects.add(project);
    return project;
  },

  async update(id: string, updates: Partial<Project>): Promise<void> {
    await db.projects.update(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  async updateExportSettings(id: string, settings: ExportSettings): Promise<void> {
    await db.projects.update(id, {
      exportSettings: settings,
      updatedAt: Date.now(),
    });
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.projects, db.timelines, async () => {
      const proj = await db.projects.get(id);
      if (proj?.timelineId) {
        await db.timelines.delete(proj.timelineId);
      }
      await db.projects.delete(id);
    });
  },

  /**
   * Export all project data, character, mouths, and audio as a single JSON exportable backup.
   */
  async exportProjectBackup(projectId: string): Promise<string> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const character = project.characterId ? await db.characters.get(project.characterId) : undefined;
    const audio = project.audioAssetId ? await db.audioAssets.get(project.audioAssetId) : undefined;
    const timeline = project.timelineId ? await db.timelines.get(project.timelineId) : undefined;

    let mouthCollection = undefined;
    let mouthAssets: Array<{ id: string; label: string; cropRect: unknown; width: number; height: number; base64: string }> = [];

    if (character?.mouthCollectionId) {
      mouthCollection = await db.mouthCollections.get(character.mouthCollectionId);
      const assets = await db.mouthAssets.where('collectionId').equals(character.mouthCollectionId).toArray();
      mouthAssets = await Promise.all(
        assets.map(async (a) => ({
          id: a.id,
          label: a.label,
          cropRect: a.cropRect,
          width: a.width,
          height: a.height,
          base64: await blobToBase64(a.imageBlob),
        }))
      );
    }

    const backupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      project,
      character: character
        ? {
            ...character,
            imageBase64: await blobToBase64(character.imageBlob),
          }
        : null,
      audio: audio
        ? {
            ...audio,
            audioBase64: await blobToBase64(audio.blob),
          }
        : null,
      timeline,
      mouthCollection,
      mouthAssets,
    };

    return JSON.stringify(backupPayload, null, 2);
  },

  async importProjectBackup(jsonString: string): Promise<string> {
    const data = JSON.parse(jsonString);
    if (!data.project) throw new Error('Invalid project backup file format');

    const newProjectId = generateId('proj');
    const newProject: Project = {
      ...data.project,
      id: newProjectId,
      name: `${data.project.name} (Restored)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Restore character if present
    if (data.character && data.character.imageBase64) {
      const charId = generateId('char');
      const charBlob = base64ToBlob(data.character.imageBase64, 'image/png');
      const newChar = {
        ...data.character,
        id: charId,
        imageBlob: charBlob,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      delete (newChar as { imageBase64?: string }).imageBase64;
      await db.characters.add(newChar);
      newProject.characterId = charId;

      // Restore mouth collection if present
      if (data.mouthCollection && Array.isArray(data.mouthAssets)) {
        const colId = generateId('mouth_col');
        const assetIds: string[] = [];
        const newMapping: Record<string, string> = {};

        for (const ma of data.mouthAssets) {
          const maId = generateId('mouth_asset');
          const maBlob = base64ToBlob(ma.base64, 'image/png');
          await db.mouthAssets.add({
            id: maId,
            collectionId: colId,
            label: ma.label,
            imageBlob: maBlob,
            cropRect: ma.cropRect,
            width: ma.width,
            height: ma.height,
            createdAt: Date.now(),
          });
          assetIds.push(maId);
          newMapping[ma.label] = maId;
        }

        await db.mouthCollections.add({
          id: colId,
          name: data.mouthCollection.name || 'Restored Mouths',
          templateType: data.mouthCollection.templateType || 'grid',
          assetIds,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await db.characters.update(charId, {
          mouthCollectionId: colId,
          mouthMapping: newMapping,
        });
      }
    }

    // Restore audio if present
    if (data.audio && data.audio.audioBase64) {
      const audioId = generateId('audio');
      const audioBlob = base64ToBlob(data.audio.audioBase64, 'audio/wav');
      await db.audioAssets.add({
        id: audioId,
        name: data.audio.name || 'Restored Audio',
        blob: audioBlob,
        duration: data.audio.duration || 0,
        sampleRate: data.audio.sampleRate || 44100,
        channels: data.audio.channels || 2,
        createdAt: Date.now(),
      });
      newProject.audioAssetId = audioId;
    }

    // Restore timeline
    if (data.timeline) {
      const timelineId = generateId('timeline');
      await db.timelines.add({
        ...data.timeline,
        id: timelineId,
        projectId: newProjectId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      newProject.timelineId = timelineId;
    }

    await db.projects.add(newProject);
    return newProjectId;
  },
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, fallbackType: string): Blob {
  const parts = base64.split(';base64,');
  const contentType = parts.length > 1 ? parts[0].replace('data:', '') : fallbackType;
  const raw = window.atob(parts.length > 1 ? parts[1] : parts[0]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}
