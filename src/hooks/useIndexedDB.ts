import { useState, useEffect } from 'react';
import { formatBytes } from '../utils/formatBytes';

export interface StorageEstimateInfo {
  usage: number;
  quota: number;
  usageFormatted: string;
  quotaFormatted: string;
  percentUsed: number;
}

export function useIndexedDBStorage() {
  const [storageInfo, setStorageInfo] = useState<StorageEstimateInfo | null>(null);

  const refreshStorageInfo = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1;
        setStorageInfo({
          usage,
          quota,
          usageFormatted: formatBytes(usage),
          quotaFormatted: formatBytes(quota),
          percentUsed: Math.min(100, Math.round((usage / quota) * 100)),
        });
      } catch (e) {
        console.warn('Storage estimate failed', e);
      }
    }
  };

  useEffect(() => {
    refreshStorageInfo();
  }, []);

  return { storageInfo, refreshStorageInfo };
}
