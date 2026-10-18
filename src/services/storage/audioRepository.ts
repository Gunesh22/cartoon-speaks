import { db } from './database';
import { AudioAsset, AnimationTimeline, TimelineCue } from '../../types/timeline';
import { generateId } from '../../utils/ids';

export const audioRepository = {
  async getAllAudio(): Promise<AudioAsset[]> {
    return db.audioAssets.orderBy('createdAt').reverse().toArray();
  },

  async getAudioById(id: string): Promise<AudioAsset | undefined> {
    return db.audioAssets.get(id);
  },

  async createAudio(
    name: string,
    blob: Blob,
    duration: number,
    sampleRate: number,
    channels: number
  ): Promise<AudioAsset> {
    const audio: AudioAsset = {
      id: generateId('audio'),
      name,
      blob,
      duration,
      sampleRate,
      channels,
      createdAt: Date.now(),
    };
    await db.audioAssets.add(audio);
    return audio;
  },

  async deleteAudio(id: string): Promise<void> {
    await db.audioAssets.delete(id);
  },

  async getTimelineByProjectId(projectId: string): Promise<AnimationTimeline | undefined> {
    return db.timelines.where('projectId').equals(projectId).first();
  },

  async saveTimeline(
    projectId: string,
    duration: number,
    cues: TimelineCue[],
    smoothing: boolean = true
  ): Promise<AnimationTimeline> {
    const existing = await db.timelines.where('projectId').equals(projectId).first();
    if (existing) {
      const updated: AnimationTimeline = {
        ...existing,
        duration,
        cues,
        smoothing,
        updatedAt: Date.now(),
      };
      await db.timelines.put(updated);
      return updated;
    }

    const timeline: AnimationTimeline = {
      id: generateId('timeline'),
      projectId,
      duration,
      cues,
      smoothing,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.timelines.add(timeline);

    // Update project reference
    await db.projects.update(projectId, {
      timelineId: timeline.id,
      updatedAt: Date.now(),
    });

    return timeline;
  },

  async updateCue(
    timelineId: string,
    cueId: string,
    updates: Partial<TimelineCue>
  ): Promise<void> {
    const timeline = await db.timelines.get(timelineId);
    if (!timeline) return;

    const newCues = timeline.cues.map((c) => (c.id === cueId ? { ...c, ...updates } : c));
    await db.timelines.update(timelineId, {
      cues: newCues,
      updatedAt: Date.now(),
    });
  },
};
