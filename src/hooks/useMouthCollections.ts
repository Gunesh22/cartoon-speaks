import { useState, useEffect, useCallback } from 'react';
import { MouthCollection, MouthAsset } from '../types/mouth';
import { mouthRepository } from '../services/storage/mouthRepository';

export function useMouthCollections() {
  const [collections, setCollections] = useState<MouthCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await mouthRepository.getAllCollections();
      setCollections(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mouth collections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const getAssetsForCollection = useCallback(async (collectionId: string): Promise<MouthAsset[]> => {
    return mouthRepository.getAssetsByCollectionId(collectionId);
  }, []);

  const deleteCollection = useCallback(async (id: string) => {
    await mouthRepository.deleteCollection(id);
    await loadCollections();
  }, [loadCollections]);

  const deleteAsset = useCallback(async (assetId: string) => {
    await mouthRepository.deleteAsset(assetId);
  }, []);

  return {
    collections,
    loading,
    error,
    loadCollections,
    getAssetsForCollection,
    deleteCollection,
    deleteAsset,
  };
}

