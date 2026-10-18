import { useState, useEffect, useCallback } from 'react';
import { Character, MouthPlacement } from '../types/character';
import { characterRepository } from '../services/storage/characterRepository';

export function useCharacters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCharacters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await characterRepository.getAll();
      setCharacters(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load characters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  const createCharacter = useCallback(
    async (name: string, imageBlob: Blob, width: number, height: number) => {
      const char = await characterRepository.create(name, imageBlob, width, height);
      await loadCharacters();
      return char;
    },
    [loadCharacters]
  );

  const updateCharacterPlacement = useCallback(
    async (id: string, placement: MouthPlacement) => {
      await characterRepository.updatePlacement(id, placement);
      setCharacters((prev) =>
        prev.map((c) => (c.id === id ? { ...c, placement, updatedAt: Date.now() } : c))
      );
    },
    []
  );

  const updateCharacterMouthMapping = useCallback(
    async (
      id: string,
      collectionId: string,
      mapping: Record<string, string>
    ) => {
      await characterRepository.updateMouthMapping(id, collectionId, mapping);
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, mouthCollectionId: collectionId, mouthMapping: mapping, updatedAt: Date.now() }
            : c
        )
      );
    },
    []
  );

  const duplicateCharacter = useCallback(
    async (id: string) => {
      const copy = await characterRepository.duplicate(id);
      await loadCharacters();
      return copy;
    },
    [loadCharacters]
  );

  const deleteCharacter = useCallback(
    async (id: string) => {
      await characterRepository.delete(id);
      await loadCharacters();
    },
    [loadCharacters]
  );

  return {
    characters,
    loading,
    error,
    loadCharacters,
    createCharacter,
    updateCharacterPlacement,
    updateCharacterMouthMapping,
    duplicateCharacter,
    deleteCharacter,
  };
}
