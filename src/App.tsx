import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  History,
  Home,
  Newspaper,
  ShieldCheck,
  User,
} from 'lucide-react';
import type {
  AppLanguage,
  CustomMemorySettings,
  HistoryItem,
  ImageLoadMode,
  MediaType,
  MetadataSearchFilters,
  NewsItem,
  PermissionKey,
  PermissionsState,
  StorageInfo,
  StreamStage,
  TabId,
  VerificationFolder,
  VerificationResult,
  VerificationThread,
} from './types';
import { getTranslations } from './i18n/translations';
import {
  detectCountryFromDevice,
  requestSinglePermission,
  syncBrowserPermissionStates,
} from './utils/permissions';
import {
  getStorageInfo,
  hadStorageWriteError,
  loadAnyFreshCachedNews,
  loadCachedNews,
  loadCountrySelection,
  loadDarkMode,
  loadFolders,
  loadImageLoadMode,
  loadLanguage,
  loadMemorySettings,
  loadPermissions,
  loadReportedItems,
  loadSavedItems,
  loadThreads,
  saveCachedNews,
  saveCountrySelection,
  saveDarkMode,
  saveFolders,
  saveImageLoadMode,
  saveLanguage,
  saveMemorySettings,
  savePermissions,
  saveReportedItems,
  saveSavedItems,
  saveThreads,
} from './utils/storage';
import { clearImageRamCache } from './utils/imageCache';
import { EkthetoLogo } from './components/EkthetoLogo';
import { OfflineIndicator } from './components/PWAInstallButton';
import { TabInicio } from './components/TabInicio';
import { TabVerificar } from './components/TabVerificar';
import { TabNoticias } from './components/TabNoticias';
import { TabHistorico } from './components/TabHistorico';
import { TabAprender } from './components/TabAprender';
import { TabPerfil } from './components/TabPerfil';

export default function App() {
  const [lang, setLang] = useState<AppLanguage>(() => loadLanguage());
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [darkMode, setDarkMode] = useState<boolean>(() => loadDarkMode());
  const [imageLoadMode, setImageLoadMode] = useState<ImageLoadMode>(() => loadImageLoadMode());
  const [permissions, setPermissions] = useState<PermissionsState>(() => loadPermissions());
  const [requestingAllPermissions, setRequestingAllPermissions] = useState(false);

  const t = useMemo(() => getTranslations(lang), [lang]);

  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [savedItems, setSavedItems] = useState<HistoryItem[]>(() => loadSavedItems());
  const [reportedItems, setReportedItems] = useState<HistoryItem[]>(() => loadReportedItems());

  const [threads, setThreads] = useState<VerificationThread[]>(() => loadThreads());
  const [folders, setFolders] = useState<VerificationFolder[]>(() => loadFolders());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [memorySettings, setMemorySettings] = useState<CustomMemorySettings>(() =>
    loadMemorySettings()
  );

  const [verifyType, setVerifyType] = useState<MediaType>('link');
  const [verifyContent, setVerifyContent] = useState('');
  const [verifyRagContext, setVerifyRagContext] = useState('');
  const [metadataFilters, setMetadataFilters] = useState<MetadataSearchFilters>({
    dateWindow: 'any',
    category: 'all',
  });
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [streamStage, setStreamStage] = useState<StreamStage>('idle');
  const [streamingText, setStreamingText] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const initialCountry = useMemo(() => loadCountrySelection(), []);
  const [countryChoice, setCountryChoice] = useState<string>(initialCountry.country);
  const [customCountry, setCustomCountry] = useState<string>(initialCountry.customCountry);
  const [resolvedCountry, setResolvedCountry] = useState<string>('Angola');
  const [newsItems, setNewsItems] = useState<NewsItem[]>(() => loadAnyFreshCachedNews());
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [verifyingNewsId, setVerifyingNewsId] = useState<string | null>(null);
  const newsLoadedOnceRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const refreshStorageCheck = useCallback(async () => {
    const info = await getStorageInfo();
    setStorageInfo(info);
    if (info.isFull || hadStorageWriteError()) {
      setStorageWarning(t.toasts.storageFullBanner);
    } else if (info.isNearLimit) {
      setStorageWarning(`${t.toasts.storageNearBanner} (${info.percentUsed}% / ~5 MB).`);
    } else {
      setStorageWarning(null);
    }
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = lang;
    saveLanguage(lang);
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    const ok = saveDarkMode(darkMode);
    if (!ok) refreshStorageCheck();
  }, [darkMode, refreshStorageCheck]);

  useEffect(() => {
    syncBrowserPermissionStates(loadPermissions()).then((synced) => {
      setPermissions(synced);
      savePermissions(synced);
    });
    refreshStorageCheck();
  }, [refreshStorageCheck]);

  const savedIds = useMemo(() => new Set(savedItems.map((i) => i.id)), [savedItems]);
  const reportedIds = useMemo(() => new Set(reportedItems.map((i) => i.id)), [reportedItems]);

  const fetchRealNews = useCallback(
    async (
      choice: string,
      customName: string,
      locationGranted: boolean,
      activeLang: AppLanguage,
      forceRefresh = false
    ) => {
      setNewsError(null);

      let targetCountry = choice;
      if (choice === 'Automático') {
        targetCountry = await detectCountryFromDevice(locationGranted);
      } else if (choice === 'Escrever outro país') {
        targetCountry = customName.trim() || 'Angola';
      }
      setResolvedCountry(targetCountry);

      if (!forceRefresh) {
        const cachedLocal = loadCachedNews(targetCountry, activeLang);
        if (cachedLocal && cachedLocal.length > 0) {
          setNewsItems(cachedLocal);
          setNewsLoading(false);
          return;
        }
      }

      setNewsLoading(true);

      try {
        const res = await fetch(
          `/api/news?country=${encodeURIComponent(targetCountry)}&lang=${activeLang}${
            forceRefresh ? '&refresh=true' : ''
          }`
        );
        const data = (await res.json()) as {
          ok?: boolean;
          items?: NewsItem[];
          error?: string;
        };

        if (!res.ok || !data.ok || !Array.isArray(data.items) || data.items.length === 0) {
          setNewsItems([]);
          setNewsError(getTranslations(activeLang).noticias.errorTitle);
        } else {
          setNewsItems(data.items);
          setNewsError(null);
          const ok = saveCachedNews(targetCountry, activeLang, data.items);
          if (!ok) refreshStorageCheck();
        }
      } catch {
        setNewsItems([]);
        setNewsError(getTranslations(activeLang).noticias.errorTitle);
      } finally {
        setNewsLoading(false);
      }
    },
    [refreshStorageCheck]
  );

  // Lazy-fetch RSS/API news ONLY when user opens the News tab (using 20-minute local cache first)
  useEffect(() => {
    if (activeTab === 'noticias' && !newsLoadedOnceRef.current) {
      newsLoadedOnceRef.current = true;
      fetchRealNews(countryChoice, customCountry, permissions.location === 'granted', lang, false);
    }
  }, [activeTab, countryChoice, customCountry, permissions.location, lang, fetchRealNews]);

  const handleChangeLang = (nextLang: AppLanguage) => {
    setLang(nextLang);
    if (activeTab === 'noticias' || newsLoadedOnceRef.current) {
      fetchRealNews(countryChoice, customCountry, permissions.location === 'granted', nextLang, false);
    }
  };

  const handleChangeImageLoadMode = (mode: ImageLoadMode) => {
    setImageLoadMode(mode);
    saveImageLoadMode(mode);
    showToast(t.toasts.imageModeUpdated);
  };

  const handleClearImageRamCache = () => {
    clearImageRamCache();
    showToast(t.toasts.ramCacheCleared);
  };

  const handleSelectCountry = (choice: string, custom?: string) => {
    const nextCustom = custom !== undefined ? custom : customCountry;
    setCountryChoice(choice);
    setCustomCountry(nextCustom);
    const ok = saveCountrySelection(choice, nextCustom);
    if (!ok) refreshStorageCheck();

    if (choice !== 'Escrever outro país' || nextCustom.trim()) {
      newsLoadedOnceRef.current = true;
      fetchRealNews(choice, nextCustom, permissions.location === 'granted', lang, false);
    }
  };

  const recordCompletedVerification = useCallback(
    (
      data: VerificationResult,
      payload: { type: MediaType; content: string }
    ) => {
      setVerifyResult(data);
      const threadId = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const titleSource = payload.content.trim() || data.queryUsed || data.source;
      const newThread: VerificationThread = {
        id: threadId,
        folderId: 'default',
        title: titleSource.slice(0, 90),
        type: payload.type,
        content: payload.content,
        result: data,
        createdAt: new Date().toISOString(),
      };
      setThreads((prev) => {
        const next = [newThread, ...prev].slice(0, 60);
        const ok = saveThreads(next);
        if (!ok) refreshStorageCheck();
        return next;
      });
      setActiveThreadId(threadId);

      if (
        permissions.notifications === 'granted' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification('Ektheto', {
            body: `${t.toasts.notificationDone} ${data.sealLabel}`,
          });
        } catch {
          // Ignore notification errors
        }
      }
    },
    [permissions.notifications, refreshStorageCheck, t.toasts.notificationDone]
  );

  const handleRunVerify = async (payload: {
    type: MediaType;
    content: string;
    ragContext?: string;
    metadataFilters?: MetadataSearchFilters;
  }) => {
    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyResult(null);
    setStreamingText('');
    setStreamStage('checking_cache');

    const activeFilters = payload.metadataFilters || metadataFilters;
    const conversationHistory = threads.slice(0, 3).map((th) => th.title);

    try {
      const res = await fetch('/api/verify/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          metadataFilters: activeFilters,
          conversationHistory,
          lang,
          memory: memorySettings,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || contentType.includes('application/json')) {
        const data = (await res.json()) as VerificationResult & { error?: string };
        if (!res.ok || !data.ok) {
          setVerifyError(data.error || t.verificar.errVerifyFailed);
        } else {
          recordCompletedVerification(data, payload);
        }
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setVerifyError(t.verificar.errVerifyFailed);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: VerificationResult | null = null;
      let sawStreamError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';

        for (const frame of frames) {
          const lines = frame.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const rawJson = line.slice(6).trim();
            if (!rawJson) continue;
            try {
              const event = JSON.parse(rawJson) as
                | { type: 'stage'; stage: StreamStage }
                | { type: 'chunk'; text: string }
                | { type: 'result'; data: VerificationResult }
                | { type: 'error'; error: string };

              if (event.type === 'stage') {
                setStreamStage(event.stage);
              } else if (event.type === 'chunk') {
                setStreamingText((prev) => prev + event.text);
              } else if (event.type === 'result') {
                finalResult = event.data;
              } else if (event.type === 'error') {
                sawStreamError = true;
                setVerifyError(event.error || t.verificar.errVerifyFailed);
              }
            } catch {
              // Ignore malformed SSE fragment
            }
          }
        }
      }

      if (finalResult && finalResult.ok) {
        recordCompletedVerification(finalResult, payload);
      } else if (!sawStreamError) {
        setVerifyError(t.verificar.errVerifyFailed);
      }
    } catch {
      setVerifyError(t.verificar.errConnection);
    } finally {
      setVerifyLoading(false);
      setStreamStage('idle');
    }
  };

  const handleStartVerifyFromHome = (
    type: MediaType,
    content: string,
    autoRun: boolean
  ) => {
    setVerifyType(type);
    setVerifyContent(content);
    setVerifyError(null);
    setActiveTab('verificar');
    if (autoRun && content.trim()) {
      handleRunVerify({
        type,
        content,
        ragContext: verifyRagContext.trim() || undefined,
        metadataFilters,
      });
    }
  };

  const handleSelectThread = (thread: VerificationThread) => {
    setVerifyType(thread.type === 'link' ? 'link' : 'text');
    setVerifyContent(thread.content);
    setVerifyResult(thread.result);
    setVerifyError(null);
    setActiveThreadId(thread.id);
  };

  const handleDeleteThread = (threadId: string) => {
    setThreads((prev) => {
      const next = prev.filter((item) => item.id !== threadId);
      saveThreads(next);
      return next;
    });
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
    }
    refreshStorageCheck();
  };

  const handleCreateFolder = (name: string) => {
    const newFolder: VerificationFolder = {
      id: `folder-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
    };
    setFolders((prev) => {
      const next = [...prev, newFolder];
      saveFolders(next);
      return next;
    });
    refreshStorageCheck();
  };

  const handleMoveThreadToFolder = (threadId: string, folderId: string) => {
    setThreads((prev) => {
      const next = prev.map((th) => (th.id === threadId ? { ...th, folderId } : th));
      saveThreads(next);
      return next;
    });
  };

  const handleSaveMemory = (next: CustomMemorySettings) => {
    setMemorySettings(next);
    const ok = saveMemorySettings(next);
    if (!ok) refreshStorageCheck();
    showToast(t.toasts.memorySaved);
  };

  const handleClearAllData = () => {
    const resetMemory: CustomMemorySettings = {
      tone: 'objective',
      focusArea: '',
      instructions: '',
    };
    setSavedItems([]);
    setReportedItems([]);
    setThreads([]);
    setFolders([]);
    setActiveThreadId(null);
    setVerifyResult(null);
    setVerifyContent('');
    setVerifyRagContext('');
    setMemorySettings(resetMemory);

    saveSavedItems([]);
    saveReportedItems([]);
    saveThreads([]);
    saveFolders([]);
    saveMemorySettings(resetMemory);
    refreshStorageCheck();
    showToast(t.toasts.allDataCleared);
  };

  const handleVerifyNewsItem = async (item: NewsItem) => {
    setVerifyingNewsId(item.id);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'link',
          lang,
          content: item.link,
          titleHint: item.title,
          sourceHint: item.source,
          publishedAtHint: item.publishedAt,
          memory: memorySettings,
        }),
      });
      const data = (await res.json()) as VerificationResult;
      if (res.ok && data.ok) {
        setNewsItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, verification: data } : n))
        );
      } else {
        showToast(t.toasts.moreInfoUnavailable);
      }
    } catch {
      showToast(t.toasts.verifyError);
    } finally {
      setVerifyingNewsId(null);
    }
  };

  const toggleSaveNewsItem = (item: NewsItem) => {
    const exists = savedItems.some((s) => s.id === item.id);
    let next: HistoryItem[];
    if (exists) {
      next = savedItems.filter((s) => s.id !== item.id);
      showToast(t.toasts.removedSaved);
    } else {
      const entry: HistoryItem = {
        id: item.id,
        kind: 'saved',
        title: item.title,
        source: item.source,
        publishedAt: item.publishedAt,
        link: item.link,
        seal: item.verification?.seal || 'unverified',
        sealLabel: item.verification?.sealLabel || t.result.unverified,
        sourcesCount: item.verification?.sourcesCount,
        createdAt: new Date().toISOString(),
      };
      next = [entry, ...savedItems];
      showToast(t.toasts.savedHistory);
    }
    setSavedItems(next);
    const ok = saveSavedItems(next);
    if (!ok) refreshStorageCheck();
  };

  const reportNewsItem = (item: NewsItem) => {
    const exists = reportedItems.some((r) => r.id === item.id);
    if (!exists) {
      const entry: HistoryItem = {
        id: item.id,
        kind: 'reported',
        title: item.title,
        source: item.source,
        publishedAt: item.publishedAt,
        link: item.link,
        seal: item.verification?.seal || 'unverified',
        sealLabel: item.verification?.sealLabel || t.result.unverified,
        sourcesCount: item.verification?.sourcesCount,
        createdAt: new Date().toISOString(),
      };
      const next = [entry, ...reportedItems];
      setReportedItems(next);
      const ok = saveReportedItems(next);
      if (!ok) refreshStorageCheck();
    }
    showToast(t.toasts.reportRegistered);
  };

  const currentVerifyId = useMemo(() => {
    if (!verifyResult) return '';
    return `verify-${(verifyResult.originalLink || verifyResult.queryUsed || verifyResult.checkedAt).slice(0, 64)}`;
  }, [verifyResult]);

  const handleSaveVerifyResult = () => {
    if (!verifyResult) return;
    const exists = savedItems.some((s) => s.id === currentVerifyId);
    let next: HistoryItem[];
    if (exists) {
      next = savedItems.filter((s) => s.id !== currentVerifyId);
      showToast(t.toasts.removedSaved);
    } else {
      const entry: HistoryItem = {
        id: currentVerifyId,
        kind: 'saved',
        title: verifyResult.queryUsed || verifyResult.originalLink || 'Manual check',
        source: verifyResult.source,
        publishedAt: verifyResult.publishedAt,
        link: verifyResult.originalLink,
        seal: verifyResult.seal,
        sealLabel: verifyResult.sealLabel,
        sourcesCount: verifyResult.sourcesCount,
        createdAt: new Date().toISOString(),
      };
      next = [entry, ...savedItems];
      showToast(t.toasts.savedHistory);
    }
    setSavedItems(next);
    const ok = saveSavedItems(next);
    if (!ok) refreshStorageCheck();
  };

  const handleReportVerifyResult = () => {
    if (!verifyResult) return;
    const exists = reportedItems.some((r) => r.id === currentVerifyId);
    if (!exists) {
      const entry: HistoryItem = {
        id: currentVerifyId,
        kind: 'reported',
        title: verifyResult.queryUsed || verifyResult.originalLink || 'Reported item',
        source: verifyResult.source,
        publishedAt: verifyResult.publishedAt,
        link: verifyResult.originalLink,
        seal: verifyResult.seal,
        sealLabel: verifyResult.sealLabel,
        sourcesCount: verifyResult.sourcesCount,
        createdAt: new Date().toISOString(),
      };
      const next = [entry, ...reportedItems];
      setReportedItems(next);
      const ok = saveReportedItems(next);
      if (!ok) refreshStorageCheck();
    }
    showToast(t.toasts.reportRegistered);
  };

  const handleAllowAllPermissions = async () => {
    setRequestingAllPermissions(true);
    try {
      const next: PermissionsState = {
        ...permissions,
        notifications: await requestSinglePermission('notifications'),
        location: await requestSinglePermission('location'),
      };
      setPermissions(next);
      savePermissions(next);
      const grantedCount = [next.notifications, next.location].filter(
        (status) => status === 'granted'
      ).length;
      if (grantedCount === 2) {
        showToast(t.toasts.allPermissionsGranted);
      } else {
        showToast(`${grantedCount}/2 ${t.toasts.partialPermissionsGranted}`);
      }
      if (countryChoice === 'Automático' && newsLoadedOnceRef.current) {
        fetchRealNews(countryChoice, customCountry, next.location === 'granted', lang);
      }
    } finally {
      setRequestingAllPermissions(false);
    }
  };

  const handleTogglePermission = async (key: PermissionKey) => {
    const currentlyGranted = permissions[key] === 'granted';
    if (currentlyGranted) {
      const next: PermissionsState = { ...permissions, [key]: 'denied' };
      setPermissions(next);
      savePermissions(next);
      showToast(t.toasts.permissionDeniedFallback);
    } else {
      const status = await requestSinglePermission(key);
      const next: PermissionsState = { ...permissions, [key]: status };
      setPermissions(next);
      savePermissions(next);
      if (status === 'granted') {
        showToast(t.toasts.permissionGranted);
        if (key === 'location' && countryChoice === 'Automático' && newsLoadedOnceRef.current) {
          fetchRealNews(countryChoice, customCountry, true, lang);
        }
      } else {
        showToast(t.toasts.permissionBlockedBrowser);
      }
    }
  };

  const handleClearHistory = () => {
    setSavedItems([]);
    setReportedItems([]);
    saveSavedItems([]);
    saveReportedItems([]);
    refreshStorageCheck();
    showToast(t.toasts.historyCleared);
  };

  const navItems: Array<{ id: TabId; label: string; icon: typeof Home }> = [
    { id: 'inicio', label: t.nav.inicio, icon: Home },
    { id: 'verificar', label: t.nav.verificar, icon: ShieldCheck },
    { id: 'noticias', label: t.nav.noticias, icon: Newspaper },
    { id: 'historico', label: t.nav.historico, icon: History },
    { id: 'aprender', label: t.nav.aprender, icon: BookOpen },
    { id: 'perfil', label: t.nav.perfil, icon: User },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#111827] dark:bg-[#111827] dark:text-[#F8FAFC]">
      {/* Clean institutional top bar (logo left, single-line desktop nav links, no dark mode toggle in header) */}
      <header
        id="app-header"
        className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-white dark:border-slate-800 dark:bg-[#1E293B]"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab('inicio')}
            className="flex min-w-0 shrink-0 items-center gap-2 text-left"
          >
            <EkthetoLogo size={48} className="shrink-0" />
          </button>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-6 md:flex"
          >
            {navItems.map(({ id, label }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`min-h-[40px] px-1 text-sm transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'font-semibold text-[#0A2A3F] underline decoration-2 underline-offset-8 dark:text-white'
                      : 'font-medium text-[#4B5563] hover:text-[#111827] hover:underline hover:underline-offset-8 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <OfflineIndicator label={t.toasts.offlineNotice} />

      {storageWarning && (
        <div
          role="status"
          className="border-b border-[#E2E8F0] bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 dark:border-slate-800 dark:bg-amber-950/60 dark:text-amber-200"
        >
          <div className="mx-auto flex max-w-6xl items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{storageWarning}</span>
          </div>
        </div>
      )}

      <main id="app-main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-8 sm:px-6">
        <section id="tab-inicio" aria-label={t.nav.inicio} hidden={activeTab !== 'inicio'}>
          <TabInicio
            lang={lang}
            threads={threads}
            newsItems={newsItems}
            imageLoadMode={imageLoadMode}
            onStartVerify={handleStartVerifyFromHome}
            onOpenThread={(th) => {
              handleSelectThread(th);
              setActiveTab('verificar');
            }}
            onOpenArchive={() => setActiveTab('historico')}
          />
        </section>

        <section id="tab-verificar" aria-label={t.nav.verificar} hidden={activeTab !== 'verificar'}>
          <TabVerificar
            lang={lang}
            selectedType={verifyType}
            onSelectType={setVerifyType}
            content={verifyContent}
            onChangeContent={setVerifyContent}
            ragContext={verifyRagContext}
            onChangeRagContext={setVerifyRagContext}
            metadataFilters={metadataFilters}
            onChangeMetadataFilters={setMetadataFilters}
            result={verifyResult}
            loading={verifyLoading}
            streamStage={streamStage}
            streamingText={streamingText}
            error={verifyError}
            onRunVerify={handleRunVerify}
            isResultSaved={Boolean(verifyResult && savedIds.has(currentVerifyId))}
            isResultReported={Boolean(verifyResult && reportedIds.has(currentVerifyId))}
            onSaveResult={handleSaveVerifyResult}
            onReportResult={handleReportVerifyResult}
            threads={threads}
            folders={folders}
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectThread}
            onDeleteThread={handleDeleteThread}
            onCreateFolder={handleCreateFolder}
            onMoveThreadToFolder={handleMoveThreadToFolder}
          />
        </section>

        <section id="tab-noticias" aria-label={t.nav.noticias} hidden={activeTab !== 'noticias'}>
          <TabNoticias
            lang={lang}
            items={newsItems}
            loading={newsLoading}
            error={newsError}
            countryChoice={countryChoice}
            customCountry={customCountry}
            resolvedCountry={resolvedCountry}
            imageLoadMode={imageLoadMode}
            onSelectCountry={handleSelectCountry}
            onRetryLoad={() =>
              fetchRealNews(countryChoice, customCountry, permissions.location === 'granted', lang, true)
            }
            onVerifyNewsItem={handleVerifyNewsItem}
            verifyingId={verifyingNewsId}
            savedIds={savedIds}
            reportedIds={reportedIds}
            onToggleSave={toggleSaveNewsItem}
            onReport={reportNewsItem}
          />
        </section>

        <section id="tab-historico" aria-label={t.nav.historico} hidden={activeTab !== 'historico'}>
          <TabHistorico
            lang={lang}
            savedItems={savedItems}
            reportedItems={reportedItems}
            onRemoveSaved={(id) => {
              const next = savedItems.filter((i) => i.id !== id);
              setSavedItems(next);
              saveSavedItems(next);
              refreshStorageCheck();
              showToast(t.toasts.removedSaved);
            }}
            onRemoveReported={(id) => {
              const next = reportedItems.filter((i) => i.id !== id);
              setReportedItems(next);
              saveReportedItems(next);
              refreshStorageCheck();
              showToast(t.toasts.removedReported);
            }}
            onVerifyFromHistory={(item) => {
              const target = item.link || item.title;
              setVerifyType(item.link ? 'link' : 'text');
              setVerifyContent(target);
              setActiveTab('verificar');
              handleRunVerify({
                type: item.link ? 'link' : 'text',
                content: target,
                ragContext: verifyRagContext.trim() || undefined,
                metadataFilters,
              });
            }}
          />
        </section>

        <section id="tab-aprender" aria-label={t.nav.aprender} hidden={activeTab !== 'aprender'}>
          <TabAprender lang={lang} onGoToVerify={() => setActiveTab('verificar')} />
        </section>

        <section id="tab-perfil" aria-label={t.nav.perfil} hidden={activeTab !== 'perfil'}>
          <TabPerfil
            lang={lang}
            onChangeLang={handleChangeLang}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode((d) => !d)}
            imageLoadMode={imageLoadMode}
            onChangeImageLoadMode={handleChangeImageLoadMode}
            onClearImageRamCache={handleClearImageRamCache}
            permissions={permissions}
            requestingAllPermissions={requestingAllPermissions}
            onAllowAllPermissions={handleAllowAllPermissions}
            onTogglePermission={handleTogglePermission}
            storageInfo={storageInfo}
            onCheckStorage={refreshStorageCheck}
            onClearHistory={handleClearHistory}
            memorySettings={memorySettings}
            onSaveMemory={handleSaveMemory}
            onClearAllData={handleClearAllData}
          />
        </section>
      </main>

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-[#E5E7EB] bg-[#111827] px-4 py-2.5 text-center text-sm font-medium text-white dark:border-slate-700 dark:bg-slate-100 dark:text-[#111827]"
        >
          {toastMessage}
        </div>
      )}

      <nav
        id="app-nav"
        aria-label="Main menu"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E5E7EB] bg-white pb-safe dark:border-slate-800 dark:bg-[#111827]"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-6 items-center">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[54px] flex-col items-center justify-center gap-1 px-1 py-1.5 transition-colors ${
                  active
                    ? 'text-[#0F172A] dark:text-white'
                    : 'text-[#6B7280] hover:text-[#111827] dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                <span
                  className={`truncate text-[11px] tracking-tight whitespace-nowrap ${
                    active ? 'font-semibold' : 'font-normal'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
