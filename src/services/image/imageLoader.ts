class ImageCacheManager {
  private urlMap = new Map<string, string>(); // assetId -> objectUrl
  private imageMap = new Map<string, HTMLImageElement>(); // assetId -> HTMLImageElement

  async getLoadedImage(assetId: string, blob: Blob): Promise<HTMLImageElement> {
    if (this.imageMap.has(assetId)) {
      return this.imageMap.get(assetId)!;
    }

    let url = this.urlMap.get(assetId);
    if (!url) {
      url = URL.createObjectURL(blob);
      this.urlMap.set(assetId, url);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.imageMap.set(assetId, img);
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image asset ${assetId}`));
      };
      img.src = url!;
    });
  }

  getObjectUrl(assetId: string, blob: Blob): string {
    let url = this.urlMap.get(assetId);
    if (!url) {
      url = URL.createObjectURL(blob);
      this.urlMap.set(assetId, url);
    }
    return url;
  }

  release(assetId: string): void {
    const url = this.urlMap.get(assetId);
    if (url) {
      URL.revokeObjectURL(url);
      this.urlMap.delete(assetId);
    }
    this.imageMap.delete(assetId);
  }

  clear(): void {
    for (const url of this.urlMap.values()) {
      URL.revokeObjectURL(url);
    }
    this.urlMap.clear();
    this.imageMap.clear();
  }
}

export const imageCache = new ImageCacheManager();
