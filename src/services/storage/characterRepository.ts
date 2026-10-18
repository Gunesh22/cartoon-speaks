import { db } from './database';
import { Character, MouthPlacement, DEFAULT_MOUTH_PLACEMENT } from '../../types/character';
import { generateId } from '../../utils/ids';

export const characterRepository = {
  async getAll(): Promise<Character[]> {
    return db.characters.orderBy('updatedAt').reverse().toArray();
  },

  async getById(id: string): Promise<Character | undefined> {
    return db.characters.get(id);
  },

  async create(name: string, imageBlob: Blob, width: number, height: number): Promise<Character> {
    const character: Character = {
      id: generateId('char'),
      name,
      imageBlob,
      imageWidth: width,
      imageHeight: height,
      mouthMapping: {},
      placement: { ...DEFAULT_MOUTH_PLACEMENT },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.characters.add(character);
    return character;
  },

  async update(id: string, updates: Partial<Character>): Promise<void> {
    await db.characters.update(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  async updatePlacement(id: string, placement: MouthPlacement): Promise<void> {
    await db.characters.update(id, {
      placement,
      updatedAt: Date.now(),
    });
  },

  async updateMouthMapping(id: string, mouthCollectionId: string, mapping: Record<string, string>): Promise<void> {
    await db.characters.update(id, {
      mouthCollectionId,
      mouthMapping: mapping,
      updatedAt: Date.now(),
    });
  },

  async duplicate(id: string): Promise<Character | undefined> {
    const original = await db.characters.get(id);
    if (!original) return undefined;

    const copy: Character = {
      ...original,
      id: generateId('char'),
      name: `${original.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.characters.add(copy);
    return copy;
  },

  async delete(id: string): Promise<void> {
    await db.characters.delete(id);
  },
};
