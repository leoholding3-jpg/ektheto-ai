import type {
  AppLanguage,
  CustomMemorySettings,
  HistoryItem,
  ImageLoadMode,
  NewsItem,
  PermissionsState,
  StorageInfo,
  VerificationFolder,
  VerificationThread,
} from '../types';

const KEYS = {
  SAVED: 'ektheto_saved_news',
  REPORTED: 'ektheto_reported_news',
  THREADS: 'ektheto_threads',
  FOLDERS: 'ektheto_folders',
  MEMORY: 'ektheto_custom_memory',
  DARK_MODE: 'ektheto_dark_mode',
  PERMISSIONS: 'ektheto_permissions',
  COUNTRY: 'ektheto_country',
  CUSTOM_COUNTRY: 'ektheto_custom_country',
  LANGUAGE: 'ektheto_language',
  NEWS_CACHE: 'ektheto_news_cache_v1',
  IMAGE_LOAD_MODE: 'ektheto_image_load_mode',
} as const;

export const NEWS_CACHE_TTL_MS = 20 * 60 * 1000;

const APPROX_LOCAL_STORAGE_LIMIT = 5 * 1024 * 1024;
const SOFT_WARNING_THRESHOLD = 4 * 1024 * 1024;

const DEFAULT_PERMISSIONS: PermissionsState = {
  notifications: 'denied',
  location: 'denied',
};

const DEFAULT_MEMORY: CustomMemorySettings = {
  tone: 'objective',
  focusArea: '',
  instructions: '',
};

let lastStorageError = false;

export function hadStorageWriteError(): boolean {
  return lastStorageError;
}

export function clearStorageWriteError(): void {
  lastStorageError = false;
}

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteString(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    lastStorageError = false;
    return true;
  } catch {
    lastStorageError = true;
    return false;
  }
}

export function loadLanguage(): AppLanguage {
  try {
    const saved = window.localStorage.getItem(KEYS.LANGUAGE);
    if (saved === 'en' || saved === 'pt' || saved === 'es') {
      return saved;
    }
    return 'en';
  } catch {
    return 'en';
  }
}

export function saveLanguage(lang: AppLanguage): boolean {
  return safeWriteString(KEYS.LANGUAGE, lang);
}

export function loadSavedItems(): HistoryItem[] {
  return safeReadJson<HistoryItem[]>(KEYS.SAVED, []);
}

export function saveSavedItems(items: HistoryItem[]): boolean {
  return safeWriteString(KEYS.SAVED, JSON.stringify(items));
}

export function loadReportedItems(): HistoryItem[] {
  return safeReadJson<HistoryItem[]>(KEYS.REPORTED, []);
}

export function saveReportedItems(items: HistoryItem[]): boolean {
  return safeWriteString(KEYS.REPORTED, JSON.stringify(items));
}

export function loadThreads(): VerificationThread[] {
  return safeReadJson<VerificationThread[]>(KEYS.THREADS, []);
}

export function saveThreads(items: VerificationThread[]): boolean {
  return safeWriteString(KEYS.THREADS, JSON.stringify(items.slice(0, 60)));
}

export function loadFolders(): VerificationFolder[] {
  return safeReadJson<VerificationFolder[]>(KEYS.FOLDERS, []);
}

export function saveFolders(folders: VerificationFolder[]): boolean {
  return safeWriteString(KEYS.FOLDERS, JSON.stringify(folders.slice(0, 20)));
}

export function loadMemorySettings(): CustomMemorySettings {
  const stored = safeReadJson<Partial<CustomMemorySettings>>(KEYS.MEMORY, {});
  return {
    ...DEFAULT_MEMORY,
    ...stored,
  };
}

export function saveMemorySettings(settings: CustomMemorySettings): boolean {
  return safeWriteString(KEYS.MEMORY, JSON.stringify(settings));
}

export function loadDarkMode(): boolean {
  try {
    return window.localStorage.getItem(KEYS.DARK_MODE) === 'true';
  } catch {
    return false;
  }
}

export function saveDarkMode(enabled: boolean): boolean {
  return safeWriteString(KEYS.DARK_MODE, enabled ? 'true' : 'false');
}

export function loadImageLoadMode(): ImageLoadMode {
  try {
    const saved = window.localStorage.getItem(KEYS.IMAGE_LOAD_MODE);
    if (saved === 'wifi_only' || saved === 'lite' || saved === 'always') {
      return saved;
    }
    return 'always';
  } catch {
    return 'always';
  }
}

export function saveImageLoadMode(mode: ImageLoadMode): boolean {
  return safeWriteString(KEYS.IMAGE_LOAD_MODE, mode);
}

export function loadPermissions(): PermissionsState {
  const stored = safeReadJson<Partial<PermissionsState>>(KEYS.PERMISSIONS, {});
  return {
    ...DEFAULT_PERMISSIONS,
    notifications: stored.notifications === 'granted' ? 'granted' : 'denied',
    location: stored.location === 'granted' ? 'granted' : 'denied',
  };
}

export function savePermissions(state: PermissionsState): boolean {
  return safeWriteString(KEYS.PERMISSIONS, JSON.stringify(state));
}

export function loadCountrySelection(): { country: string; customCountry: string } {
  try {
    const country = window.localStorage.getItem(KEYS.COUNTRY) || 'Automático';
    const customCountry = window.localStorage.getItem(KEYS.CUSTOM_COUNTRY) || '';
    return { country, customCountry };
  } catch {
    return { country: 'Automático', customCountry: '' };
  }
}

export function saveCountrySelection(country: string, customCountry: string): boolean {
  const ok1 = safeWriteString(KEYS.COUNTRY, country);
  const ok2 = safeWriteString(KEYS.CUSTOM_COUNTRY, customCountry);
  return ok1 && ok2;
}

interface NewsCachePayload {
  cacheKey: string;
  cachedAt: number;
  items: NewsItem[];
}

export function buildNewsCacheKey(country: string, lang: AppLanguage): string {
  return `${country.trim().toLowerCase()}::${lang}`;
}

export function loadCachedNews(country: string, lang: AppLanguage): NewsItem[] | null {
  const stored = safeReadJson<NewsCachePayload | null>(KEYS.NEWS_CACHE, null);
  if (!stored || !Array.isArray(stored.items) || typeof stored.cachedAt !== 'number') {
    return null;
  }
  if (stored.cacheKey !== buildNewsCacheKey(country, lang)) {
    return null;
  }
  if (Date.now() - stored.cachedAt > NEWS_CACHE_TTL_MS) {
    return null;
  }
  return stored.items;
}

export function loadAnyFreshCachedNews(): NewsItem[] {
  const stored = safeReadJson<NewsCachePayload | null>(KEYS.NEWS_CACHE, null);
  if (!stored || !Array.isArray(stored.items) || typeof stored.cachedAt !== 'number') {
    return [];
  }
  if (Date.now() - stored.cachedAt > NEWS_CACHE_TTL_MS) {
    return [];
  }
  return stored.items;
}

export function saveCachedNews(country: string, lang: AppLanguage, items: NewsItem[]): boolean {
  const payload: NewsCachePayload = {
    cacheKey: buildNewsCacheKey(country, lang),
    cachedAt: Date.now(),
    items: items.slice(0, 30),
  };
  return safeWriteString(KEYS.NEWS_CACHE, JSON.stringify(payload));
}

export function calculateLocalStorageBytes(): number {
  let totalChars = 0;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) {
        const v = window.localStorage.getItem(k) || '';
        totalChars += k.length + v.length;
      }
    }
  } catch {
    return 0;
  }
  return totalChars * 2;
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const usedBytes = calculateLocalStorageBytes();
  const savedCount = loadSavedItems().length;
  const reportedCount = loadReportedItems().length;
  const threadsCount = loadThreads().length;
  const percentUsed = Math.min(100, Math.round((usedBytes / APPROX_LOCAL_STORAGE_LIMIT) * 100));
  const isNearLimit = usedBytes >= SOFT_WARNING_THRESHOLD || lastStorageError;
  const isFull = usedBytes >= APPROX_LOCAL_STORAGE_LIMIT || lastStorageError;

  let browserEstimateUsageMB: string | undefined;
  let browserEstimateQuotaMB: string | undefined;

  try {
    if ('storage' in navigator && typeof navigator.storage.estimate === 'function') {
      const est = await navigator.storage.estimate();
      if (typeof est.usage === 'number') {
        browserEstimateUsageMB = (est.usage / (1024 * 1024)).toFixed(2);
      }
      if (typeof est.quota === 'number') {
        browserEstimateQuotaMB = (est.quota / (1024 * 1024)).toFixed(0);
      }
    }
  } catch {
    // Ignore storage estimate unavailability
  }

  return {
    usedBytes,
    limitBytes: APPROX_LOCAL_STORAGE_LIMIT,
    percentUsed,
    isNearLimit,
    isFull,
    savedCount,
    reportedCount,
    threadsCount,
    browserEstimateUsageMB,
    browserEstimateQuotaMB,
  };
}
