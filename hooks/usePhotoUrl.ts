import { useState, useEffect } from 'react';
import { StorageService } from '@/services/StorageService';
import { LRUCache } from '@/utils/lruCache';

const photoUrlCache = new LRUCache<string, string>(100);

/**
 * 写真URLをキャッシュ付きで取得するフック
 * 同じパスに対して複数回の非同期リクエストを防止
 */
export function usePhotoUrl(photoPath: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!photoPath) return null;
    return photoUrlCache.get(photoPath) ?? null;
  });

  useEffect(() => {
    if (!photoPath) {
      setUrl(null);
      return;
    }

    const cached = photoUrlCache.get(photoPath);
    if (cached) {
      setUrl(cached);
      return;
    }

    let cancelled = false;

    StorageService.getPublicUrl(photoPath).then((fetchedUrl) => {
      if (cancelled) return;
      if (fetchedUrl) {
        photoUrlCache.set(photoPath, fetchedUrl);
        setUrl(fetchedUrl);
      }
    }).catch(() => {
      if (!cancelled) {
        setUrl(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  return url;
}

/**
 * テスト用: キャッシュをクリア
 */
export function clearPhotoUrlCache(): void {
  photoUrlCache.clear();
}
