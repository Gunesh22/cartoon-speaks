import { db } from './database';
import { MouthCollection, MouthAsset, CropRect } from '../../types/mouth';
import { generateId } from '../../utils/ids';

export const mouthRepository = {
  async getAllCollections(): Promise<MouthCollection[]> {
    return db.mouthCollections.orderBy('updatedAt').reverse().toArray();
  },

  async getCollectionById(id: string): Promise<MouthCollection | undefined> {
    return db.mouthCollections.get(id);
  },

  async getAssetsByCollectionId(collectionId: string): Promise<MouthAsset[]> {
    return db.mouthAssets.where('collectionId').equals(collectionId).toArray();
  },

  async createCollection(
    name: string,
    templateType: MouthCollection['templateType'],
    sourceSheetBlob?: Blob,
    sourceSheetWidth?: number,
    sourceSheetHeight?: number
  ): Promise<MouthCollection> {
    const collection: MouthCollection = {
      id: generateId('mouth_col'),
      name,
      templateType,
      sourceSheetBlob,
      sourceSheetWidth,
      sourceSheetHeight,
      assetIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.mouthCollections.add(collection);
    return collection;
  },

  async addMouthAsset(
    collectionId: string,
    label: string,
    imageBlob: Blob,
    cropRect: CropRect,
    width: number,
    height: number,
    warning?: string,
    anchorX: number = 0.5,
    anchorY: number = 0.46875
  ): Promise<MouthAsset> {
    const asset: MouthAsset = {
      id: generateId('mouth_asset'),
      collectionId,
      label,
      imageBlob,
      cropRect,
      width,
      height,
      anchorX,
      anchorY,
      warning,
      createdAt: Date.now(),
    };

    await db.transaction('rw', db.mouthAssets, db.mouthCollections, async () => {
      await db.mouthAssets.add(asset);
      const col = await db.mouthCollections.get(collectionId);
      if (col) {
        await db.mouthCollections.update(collectionId, {
          assetIds: [...col.assetIds, asset.id],
          updatedAt: Date.now(),
        });
      }
    });

    return asset;
  },

  async updateAssetLabel(assetId: string, label: string): Promise<void> {
    await db.mouthAssets.update(assetId, { label });
  },

  async updateAssetCrop(
    assetId: string,
    imageBlob: Blob,
    cropRect: CropRect,
    width: number,
    height: number,
    warning?: string
  ): Promise<void> {
    await db.mouthAssets.update(assetId, {
      imageBlob,
      cropRect,
      width,
      height,
      warning,
    });
  },

  async updateAssetAnchor(
    assetId: string,
    anchorX: number,
    anchorY: number
  ): Promise<void> {
    await db.mouthAssets.update(assetId, {
      anchorX,
      anchorY,
    });
  },

  async batchUpdateAnchors(
    updates: Array<{ id: string; anchorX: number; anchorY: number }>
  ): Promise<void> {
    await db.transaction('rw', db.mouthAssets, async () => {
      for (const u of updates) {
        await db.mouthAssets.update(u.id, {
          anchorX: u.anchorX,
          anchorY: u.anchorY,
        });
      }
    });
  },

  async updateAssetPadded(
    assetId: string,
    imageBlob: Blob,
    width: number,
    height: number,
    anchorX: number,
    anchorY: number,
    warning?: string
  ): Promise<void> {
    await db.mouthAssets.update(assetId, {
      imageBlob,
      width,
      height,
      anchorX,
      anchorY,
      warning,
    });
  },

  async deleteAsset(assetId: string): Promise<void> {
    const asset = await db.mouthAssets.get(assetId);
    if (!asset) return;

    await db.transaction('rw', db.mouthAssets, db.mouthCollections, async () => {
      await db.mouthAssets.delete(assetId);
      const col = await db.mouthCollections.get(asset.collectionId);
      if (col) {
        await db.mouthCollections.update(asset.collectionId, {
          assetIds: col.assetIds.filter((id) => id !== assetId),
          updatedAt: Date.now(),
        });
      }
    });
  },

  async deleteCollection(collectionId: string): Promise<void> {
    await db.transaction('rw', db.mouthAssets, db.mouthCollections, async () => {
      await db.mouthAssets.where('collectionId').equals(collectionId).delete();
      await db.mouthCollections.delete(collectionId);
    });
  },

  /**
   * Replaces an entire collection's mouth shapes with newly extracted ones,
   * retaining stable IDs for matching labels whenever possible to preserve mappings.
   */
  async replaceCollectionAssets(
    collectionId: string,
    newAssets: Array<{
      label: string;
      imageBlob: Blob;
      cropRect: CropRect;
      width: number;
      height: number;
      warning?: string;
      anchorX?: number;
      anchorY?: number;
    }>,
    newSourceSheetBlob?: Blob,
    newWidth?: number,
    newHeight?: number
  ): Promise<MouthAsset[]> {
    return db.transaction('rw', db.mouthAssets, db.mouthCollections, async () => {
      const existingAssets = await db.mouthAssets.where('collectionId').equals(collectionId).toArray();
      const existingByLabel = new Map(existingAssets.map((a) => [a.label, a]));

      // Clear old assets
      await db.mouthAssets.where('collectionId').equals(collectionId).delete();

      const createdAssets: MouthAsset[] = [];
      const newAssetIds: string[] = [];

      for (const item of newAssets) {
        // Reuse existing asset ID if matching label existed
        const reusable = existingByLabel.get(item.label);
        const assetId = reusable ? reusable.id : generateId('mouth_asset');

        const asset: MouthAsset = {
          id: assetId,
          collectionId,
          label: item.label,
          imageBlob: item.imageBlob,
          cropRect: item.cropRect,
          width: item.width,
          height: item.height,
          anchorX: item.anchorX ?? 0.5,
          anchorY: item.anchorY ?? 0.46875,
          warning: item.warning,
          createdAt: reusable ? reusable.createdAt : Date.now(),
        };

        await db.mouthAssets.add(asset);
        createdAssets.push(asset);
        newAssetIds.push(assetId);
      }

      await db.mouthCollections.update(collectionId, {
        assetIds: newAssetIds,
        sourceSheetBlob: newSourceSheetBlob,
        sourceSheetWidth: newWidth,
        sourceSheetHeight: newHeight,
        updatedAt: Date.now(),
      });

      return createdAssets;
    });
  },
};
