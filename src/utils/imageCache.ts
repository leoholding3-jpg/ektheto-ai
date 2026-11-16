import type { ImageLoadMode } from '../types';

interface NetworkInformationLike {
  type?: string;
  effectiveType?: string;
  saveData?: boolean;
}

interface RamImageEntry {
  objectUrl: string;
  bytes: number;
  cachedAt: number;
}

export const IMAGE_RAM_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours short-lived RAM cache
const IMAGE_RAM_MAX_ENTRIES = 40;

const ramCache = new Map<string, RamImageEntry>();

function pruneRamCache(): void {
  const now = Date.now();
  for (const [key, entry] of ramCache.entries()) {
    if (now - entry.cachedAt > IMAGE_RAM_TTL_MS) {
      URL.revokeObjectURL(entry.objectUrl);
      ramCache.delete(key);
    }
  }
  while (ramCache.size > IMAGE_RAM_MAX_ENTRIES) {
    const oldestKey = ramCache.keys().next().value;
    if (!oldestKey) break;
    const evicted = ramCache.get(oldestKey);
    if (evicted) URL.revokeObjectURL(evicted.objectUrl);
    ramCache.delete(oldestKey);
  }
}

export function clearImageRamCache(): void {
  for (const entry of ramCache.values()) {
    URL.revokeObjectURL(entry.objectUrl);
  }
  ramCache.clear();
}

export function getImageRamCacheStats(): { count: number; totalBytes: number } {
  pruneRamCache();
  let totalBytes = 0;
  for (const entry of ramCache.values()) {
    totalBytes += entry.bytes;
  }
  return { count: ramCache.size, totalBytes };
}

function getNetworkConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const nav = navigator as Navigator & {
    connection?: NetworkInformationLike;
    mozConnection?: NetworkInformationLike;
    webkitConnection?: NetworkInformationLike;
  };
  return nav.connection || nav.mozConnection || nav.webkitConnection;
}

export function shouldAutoLoadImages(mode: ImageLoadMode): {
  allowed: boolean;
  reason: 'ok' | 'lite' | 'wifi_paused';
} {
  if (mode === 'lite') {
    return { allowed: false, reason: 'lite' };
  }
  const conn = getNetworkConnection();
  if (mode === 'wifi_only') {
    if (conn?.saveData) {
      return { allowed: false, reason: 'wifi_paused' };
    }
    if (conn?.type && conn.type !== 'wifi' && conn.type !== 'ethernet') {
      return { allowed: false, reason: 'wifi_paused' };
    }
    if (
      conn?.effectiveType &&
      (conn.effectiveType === 'slow-2g' ||
        conn.effectiveType === '2g' ||
        conn.effectiveType === '3g')
    ) {
      return { allowed: false, reason: 'wifi_paused' };
    }
  }
  return { allowed: true, reason: 'ok' };
}

export function buildOptimizedMediaUrl(
  rawUrl: string,
  options: { width: number; height: number; lite?: boolean }
): string {
  const conn = getNetworkConnection();
  const ect = conn?.effectiveType || '4g';
  const dpr =
    typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number'
      ? Math.min(1.5, Math.max(1, window.devicePixelRatio))
      : 1;

  const params = new URLSearchParams({
    url: rawUrl,
    w: String(Math.round(options.width)),
    h: String(Math.round(options.height)),
    fmt: 'auto',
    ect,
    dpr: dpr.toFixed(2),
  });
  if (options.lite) {
    params.set('lite', '1');
  }
  return `/api/media?${params.toString()}`;
}

export async function fetchCachedImageObjectUrl(
  optimizedUrl: string,
  signal?: AbortSignal
): Promise<string> {
  pruneRamCache();
  const existing = ramCache.get(optimizedUrl);
  if (existing) {
    // Refresh LRU order
    ramCache.delete(optimizedUrl);
    ramCache.set(optimizedUrl, existing);
    return existing.objectUrl;
  }

  const res = await fetch(optimizedUrl, { signal });
  if (!res.ok) {
    throw new Error(`Media load failed: ${res.status}`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  ramCache.set(optimizedUrl, {
    objectUrl,
    bytes: blob.size,
    cachedAt: Date.now(),
  });
  pruneRamCache();

  return objectUrl;
}
