import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Database,
  HardDrive,
  ImageDown,
  Languages,
  Lock,
  Moon,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
} from 'lucide-react';
import type {
  AppLanguage,
  CustomMemorySettings,
  ImageLoadMode,
  PermissionKey,
  PermissionsState,
  StorageInfo,
} from '../types';
import { getTranslations } from '../i18n/translations';
import { getImageRamCacheStats } from '../utils/imageCache';
import { PWAInstallButton } from './PWAInstallButton';

interface TabPerfilProps {
  lang: AppLanguage;
  onChangeLang: (lang: AppLanguage) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  imageLoadMode: ImageLoadMode;
  onChangeImageLoadMode: (mode: ImageLoadMode) => void;
  onClearImageRamCache: () => void;
  permissions: PermissionsState;
  requestingAllPermissions: boolean;
  onAllowAllPermissions: () => void;
  onTogglePermission: (key: PermissionKey) => void;
  storageInfo: StorageInfo | null;
  onCheckStorage: () => Promise<void>;
  onClearHistory: () => void;
  memorySettings: CustomMemorySettings;
  onSaveMemory: (next: CustomMemorySettings) => void;
  dailyUsageCount: number;
  dailyLimit: number;
  onClearAllData: () => void;
}

const LANGUAGE_OPTIONS: Array<{ code: AppLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Español' },
];

const PERMISSION_KEYS: PermissionKey[] = [
  'notifications',
  'location',
];

export function TabPerfil({
  lang,
  onChangeLang,
  darkMode,
  onToggleDarkMode,
  imageLoadMode,
  onChangeImageLoadMode,
  onClearImageRamCache,
  permissions,
  requestingAllPermissions,
  onAllowAllPermissions,
  onTogglePermission,
  storageInfo,
  onCheckStorage,
  onClearHistory,
  memorySettings,
  onSaveMemory,
  dailyUsageCount,
  dailyLimit,
  onClearAllData,
}: TabPerfilProps) {
  const t = getTranslations(lang).perfil;
  const [showPermissions, setShowPermissions] = useState(true);
  const [checkingStorage, setCheckingStorage] = useState(false);
  const [ramStats, setRamStats] = useState(() => getImageRamCacheStats());
  const [draftMemory, setDraftMemory] = useState<CustomMemorySettings>(memorySettings);
  const permissionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftMemory(memorySettings);
  }, [memorySettings]);

  const handleOpenPermissions = () => {
    setShowPermissions(true);
    setTimeout(() => {
      permissionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleCheckStorage = async () => {
    setCheckingStorage(true);
    await onCheckStorage();
    setRamStats(getImageRamCacheStats());
    setCheckingStorage(false);
  };

  const handleClearRamCacheClick = () => {
    onClearImageRamCache();
    setRamStats(getImageRamCacheStats());
  };

  const handleSaveMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveMemory({
      tone: draftMemory.tone,
      focusArea: draftMemory.focusArea.trim(),
      instructions: draftMemory.instructions.trim(),
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const usagePercent = Math.min(100, Math.round((dailyUsageCount / dailyLimit) * 100));

  return (
    <div className="space-y-4">
      {/* Header, Official Brand Emblem & Theme Toggle (Dark/Light Mode is exclusively inside Profile) */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-11-15_at_15.44.28_d681c03e.jpeg"
              alt="VERITAS AI official brand emblem"
              className="h-14 w-14 shrink-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] object-contain p-1 dark:border-slate-700"
            />
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[#111827] dark:text-white">
                VERITAS AI
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-slate-400">
                {t.subtitle} · {t.freePlan}
              </p>
              <p className="mt-0.5 text-[11px] text-[#6B7280] dark:text-slate-400">
                {t.adaptiveIconNote}
              </p>
            </div>
          </div>

          <PWAInstallButton
            installLabel={t.pwaInstallBtn}
            installIosLabel={t.pwaInstallIosBtn}
            iosTitle={t.pwaIosTitle}
            iosSteps={t.pwaIosSteps}
            closeLabel={t.pwaCloseBtn}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <button
            type="button"
            onClick={handleOpenPermissions}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition-colors hover:bg-[#F9FAFB] dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Shield className="h-4 w-4 text-[#4B5563] dark:text-slate-300" />
            <span>{t.permissionsBtn}</span>
          </button>

          <button
            type="button"
            onClick={onToggleDarkMode}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition-colors hover:bg-[#F9FAFB] dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-[#4B5563] dark:text-slate-300" />
            ) : (
              <Moon className="h-4 w-4 text-[#4B5563] dark:text-slate-300" />
            )}
            <span>{darkMode ? t.lightModeBtn : t.darkModeBtn}</span>
          </button>

          <button
            type="button"
            onClick={handleCheckStorage}
            disabled={checkingStorage}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1E293B] disabled:opacity-60 dark:bg-slate-100 dark:text-[#0F172A] dark:hover:bg-white whitespace-nowrap"
          >
            <HardDrive className="h-4 w-4" />
            <span>{checkingStorage ? t.checkingStorage : t.checkStorageBtn}</span>
          </button>
        </div>
      </div>

      {/* Language Selector */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-[#4B5563] dark:text-slate-300" />
          <h3 className="text-base font-semibold text-[#111827] dark:text-white">
            {t.languageTitle}
          </h3>
        </div>
        <p className="mt-1 text-sm text-[#4B5563] dark:text-slate-400">{t.languageDesc}</p>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-[#F3F4F6] p-1 dark:bg-slate-800/80">
          {LANGUAGE_OPTIONS.map((opt) => {
            const active = lang === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => onChangeLang(opt.code)}
                aria-pressed={active}
                className={`min-h-[42px] rounded-md px-3 py-2 text-sm transition-colors whitespace-nowrap ${
                  active
                    ? 'border border-[#E5E7EB] bg-white font-semibold text-[#111827] dark:border-slate-700 dark:bg-[#111827] dark:text-white'
                    : 'border border-transparent font-medium text-[#4B5563] hover:text-[#111827] dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Saver & Image Streaming */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex items-center gap-2">
          <ImageDown className="h-4 w-4 text-[#4B5563] dark:text-slate-300" />
          <h3 className="text-base font-semibold text-[#111827] dark:text-white">
            {t.dataSaverTitle}
          </h3>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-[#4B5563] dark:text-slate-400">
          {t.dataSaverDesc}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {(
            [
              { id: 'always', label: t.imageModeAlways, desc: t.imageModeAlwaysDesc },
              { id: 'wifi_only', label: t.imageModeWifi, desc: t.imageModeWifiDesc },
              { id: 'lite', label: t.imageModeLite, desc: t.imageModeLiteDesc },
            ] as Array<{ id: ImageLoadMode; label: string; desc: string }>
          ).map((opt) => {
            const active = imageLoadMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeImageLoadMode(opt.id)}
                aria-pressed={active}
                className={`flex flex-col items-start rounded-lg border p-3.5 text-left transition-colors ${
                  active
                    ? 'border-[#0A2A3F] bg-[#F8FAFC] dark:border-slate-300 dark:bg-slate-800/70'
                    : 'border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] dark:border-slate-700 dark:bg-[#111827] dark:hover:bg-slate-800/40'
                }`}
              >
                <span className="text-sm font-semibold text-[#111827] dark:text-white">
                  {opt.label}
                </span>
                <span className="mt-1 text-xs leading-snug text-[#4B5563] dark:text-slate-300">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] pt-3.5 dark:border-slate-800">
          <p className="text-xs text-[#4B5563] dark:text-slate-400 tabular-nums">
            {t.ramCacheLabel} {ramStats.count} ({formatBytes(ramStats.totalBytes)})
          </p>
          <button
            type="button"
            onClick={handleClearRamCacheClick}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB] dark:border-slate-700 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t.clearRamCacheBtn}</span>
          </button>
        </div>
      </div>

      {/* Memory & Personalization */}
      <form
        onSubmit={handleSaveMemorySubmit}
        className="rounded-lg border border-[#E5E7EB] bg-white p-5 dark:border-slate-800 dark:bg-[#111827]"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#4B5563] dark:text-slate-300" />
          <h3 className="text-base font-semibold text-[#111827] dark:text-white">
            {t.memoryTitle}
          </h3>
        </div>
        <p className="mt-1 text-sm text-[#4B5563] dark:text-slate-400">{t.memoryDesc}</p>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-[#374151] dark:text-slate-300">
              {t.toneLabel}
            </p>
            <div className="mt-1.5 grid grid-cols-1 gap-1 rounded-lg bg-[#F3F4F6] p-1 dark:bg-slate-800/80 sm:grid-cols-3">
              {(
                [
                  { id: 'objective', label: t.toneObjective },
                  { id: 'detailed', label: t.toneDetailed },
                  { id: 'simple', label: t.toneSimple },
                ] as const
              ).map((opt) => {
                const active = draftMemory.tone === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraftMemory((prev) => ({ ...prev, tone: opt.id }))}
                    className={`min-h-[40px] rounded-md px-3 py-1.5 text-xs transition-colors whitespace-nowrap ${
                      active
                        ? 'border border-[#E5E7EB] bg-white font-semibold text-[#111827] dark:border-slate-700 dark:bg-[#111827] dark:text-white'
                        : 'border border-transparent font-medium text-[#4B5563] hover:text-[#111827] dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="memory-focus-area"
              className="block text-xs font-medium text-[#374151] dark:text-slate-300"
            >
              {t.focusAreaLabel}
            </label>
            <input
              id="memory-focus-area"
              type="text"
              value={draftMemory.focusArea}
              onChange={(e) =>
                setDraftMemory((prev) => ({ ...prev, focusArea: e.target.value }))
              }
              placeholder={t.focusAreaPlaceholder}
              className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm text-[#111827] placeholder:text-[#6B7280] focus:border-[#0F172A] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="memory-custom-instructions"
              className="block text-xs font-medium text-[#374151] dark:text-slate-300"
            >
              {t.customInstructionsLabel}
            </label>
            <textarea
              id="memory-custom-instructions"
              rows={3}
              value={draftMemory.instructions}
              onChange={(e) =>
                setDraftMemory((prev) => ({ ...prev, instructions: e.target.value }))
              }
              placeholder={t.customInstructionsPlaceholder}
              className="mt-1.5 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm text-[#111827] placeholder:text-[#6B7280] focus:border-[#0F172A] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1E293B] dark:bg-slate-100 dark:text-[#0F172A] dark:hover:bg-white"
          >
            {t.saveMemoryBtn}
          </button>
        </div>
      </form>

      {/* Plans, Usage Limits & Routing */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-[#111827] dark:text-white">
            {t.planTitle}
          </h3>
          <span className="text-xs font-medium text-[#6B7280] dark:text-slate-400 tabular-nums">
            {t.usageTodayLabel}: {`${dailyUsageCount} / ${dailyLimit}`}
          </span>
        </div>
        <p className="mt-1 text-sm text-[#4B5563] dark:text-slate-400">{t.planDesc}</p>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-sm bg-[#E5E7EB] dark:bg-slate-800">
          <div
            className={`h-full ${
              dailyUsageCount >= dailyLimit
                ? 'bg-amber-600'
                : 'bg-[#0F172A] dark:bg-slate-300'
            }`}
            style={{ width: `${Math.max(4, usagePercent)}%` }}
          />
        </div>

        <div className="mt-4">
          <div className="rounded-lg border border-[#0F172A] bg-[#F9FAFB] p-4 dark:border-slate-400 dark:bg-slate-800/50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#111827] dark:text-white">
                {t.freePlan}
              </p>
              <span className="text-xs font-medium text-[#0F172A] dark:text-slate-200">
                {t.activePlanBadge}
              </span>
            </div>
            <ul className="mt-2.5 space-y-1.5 text-xs text-[#4B5563] dark:text-slate-300">
              {t.freePlanFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span aria-hidden="true">·</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Privacy & Data Deletion */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#4B5563] dark:text-slate-300" />
          <h3 className="text-base font-semibold text-[#111827] dark:text-white">
            {t.privacyTitle}
          </h3>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-[#4B5563] dark:text-slate-400">
          {t.privacyDesc}
        </p>

        <button
          type="button"
          onClick={onClearAllData}
          className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-slate-700 dark:bg-[#111827] dark:text-rose-400 dark:hover:bg-rose-950/40"
        >
          <Trash2 className="h-4 w-4" />
          <span>{t.clearAllDataBtn}</span>
        </button>
      </div>

      {storageInfo && (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#4B5563] dark:text-slate-300" />
              <h3 className="text-base font-semibold text-[#111827] dark:text-white">
                {t.storageTitle}
              </h3>
            </div>
            <span className="text-sm font-semibold text-[#111827] dark:text-white tabular-nums">
              {storageInfo.percentUsed}
              {t.usedPercent}
            </span>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-sm bg-[#E5E7EB] dark:bg-slate-800">
            <div
              className={`h-full ${
                storageInfo.isFull || storageInfo.isNearLimit
                  ? 'bg-amber-600'
                  : 'bg-[#0F172A] dark:bg-slate-300'
              }`}
              style={{ width: `${Math.max(3, storageInfo.percentUsed)}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#E5E7EB] pt-4 text-sm dark:border-slate-800 sm:grid-cols-3">
            <div>
              <p className="text-xs text-[#6B7280] dark:text-slate-400">{t.usedSpace}</p>
              <p className="mt-0.5 font-semibold text-[#111827] dark:text-white tabular-nums">
                {formatBytes(storageInfo.usedBytes)} / ~5 MB
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280] dark:text-slate-400">{t.savedLabel}</p>
              <p className="mt-0.5 font-semibold text-[#111827] dark:text-white tabular-nums">
                {storageInfo.savedCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280] dark:text-slate-400">{t.reportedLabel}</p>
              <p className="mt-0.5 font-semibold text-[#111827] dark:text-white tabular-nums">
                {storageInfo.reportedCount}
              </p>
            </div>
          </div>

          {storageInfo.browserEstimateUsageMB && storageInfo.browserEstimateQuotaMB && (
            <p className="mt-3 text-xs text-[#6B7280] dark:text-slate-400 tabular-nums">
              {t.browserEstimate} {storageInfo.browserEstimateUsageMB} MB /{' '}
              {storageInfo.browserEstimateQuotaMB} MB.
            </p>
          )}

          {(storageInfo.isNearLimit || storageInfo.isFull) && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              {t.storageWarningInline}
            </div>
          )}

          {(storageInfo.savedCount > 0 || storageInfo.reportedCount > 0) && (
            <button
              type="button"
              onClick={onClearHistory}
              className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-slate-700 dark:bg-[#111827] dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-4 w-4" />
              <span>{t.clearSavedReported}</span>
            </button>
          )}
        </div>
      )}

      {showPermissions && (
        <div
          ref={permissionsRef}
          className="rounded-lg border border-[#E5E7EB] bg-white p-5 dark:border-slate-800 dark:bg-[#111827]"
        >
          <div>
            <h3 className="text-base font-semibold text-[#111827] dark:text-white">
              {t.permissionsTitle}
            </h3>
            <p className="mt-0.5 text-sm text-[#4B5563] dark:text-slate-400">
              {t.permissionsDesc}
            </p>
          </div>

          <button
            type="button"
            onClick={onAllowAllPermissions}
            disabled={requestingAllPermissions}
            className="mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1E293B] disabled:opacity-60 dark:bg-slate-100 dark:text-[#0F172A] dark:hover:bg-white"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{requestingAllPermissions ? t.requestingAll : t.allowAllBtn}</span>
          </button>

          <div className="mt-5 divide-y divide-[#E5E7EB] dark:divide-slate-800">
            {PERMISSION_KEYS.map((key) => {
              const meta = t.permissionsMeta[key];
              const isGranted = permissions[key] === 'granted';
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 py-3.5 first:pt-1 last:pb-1"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#111827] dark:text-white">
                        {meta.label}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          isGranted
                            ? 'text-emerald-800 dark:text-emerald-400'
                            : 'text-[#6B7280] dark:text-slate-400'
                        }`}
                      >
                        {isGranted && <CheckCircle2 className="h-3.5 w-3.5" />}
                        <span>{isGranted ? t.allowed : t.denied}</span>
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#4B5563] dark:text-slate-400">
                      {isGranted ? meta.description : meta.fallbackText}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isGranted}
                    aria-label={`${t.toggleAria} ${meta.label}`}
                    onClick={() => onTogglePermission(key)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] dark:focus-visible:ring-slate-300 ${
                      isGranted ? 'bg-[#0F172A] dark:bg-slate-200' : 'bg-[#D1D5DB] dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform dark:bg-[#0F172A] ${
                        isGranted ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
