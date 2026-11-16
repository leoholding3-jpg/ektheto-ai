import { useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flag,
  Globe,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  X,
} from 'lucide-react';
import type { AppLanguage, ImageLoadMode, NewsItem } from '../types';
import { getTranslations } from '../i18n/translations';
import { formatDateLocalized, formatRelativeLocalized } from '../utils/formatDate';
import { StreamImage } from './StreamImage';

export type NewsFilter = 'todas' | 'guardadas' | 'denunciadas';

export const COUNTRY_OPTIONS = [
  'Automático',
  'Angola',
  'Brasil',
  'Portugal',
  'Moçambique',
  'Cabo Verde',
  'Guiné-Bissau',
  'São Tomé e Príncipe',
  'Timor-Leste',
  'Escrever outro país',
];

interface TabNoticiasProps {
  lang: AppLanguage;
  items: NewsItem[];
  loading: boolean;
  error: string | null;
  countryChoice: string;
  customCountry: string;
  resolvedCountry: string;
  imageLoadMode: ImageLoadMode;
  onSelectCountry: (choice: string, custom?: string) => void;
  onRetryLoad: () => void;
  onVerifyNewsItem: (item: NewsItem) => void;
  verifyingId: string | null;
  savedIds: Set<string>;
  reportedIds: Set<string>;
  onToggleSave: (item: NewsItem) => void;
  onReport: (item: NewsItem) => void;
}

export function TabNoticias({
  lang,
  items,
  loading,
  error,
  countryChoice,
  customCountry,
  resolvedCountry,
  imageLoadMode,
  onSelectCountry,
  onRetryLoad,
  onVerifyNewsItem,
  verifyingId,
  savedIds,
  reportedIds,
  onToggleSave,
  onReport,
}: TabNoticiasProps) {
  const bundle = getTranslations(lang);
  const t = bundle.noticias;
  const resultT = bundle.result;

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<NewsFilter>('todas');
  const [customInput, setCustomInput] = useState(customCountry);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredItems = items.filter((item) => {
    if (filter === 'guardadas' && !savedIds.has(item.id)) return false;
    if (filter === 'denunciadas' && !reportedIds.has(item.id)) return false;
    if (normalizedQuery) {
      const matchTitle = item.title.toLowerCase().includes(normalizedQuery);
      const matchSource = item.source.toLowerCase().includes(normalizedQuery);
      if (!matchTitle && !matchSource) return false;
    }
    return true;
  });

  const hasActiveFilters = Boolean(searchQuery.trim()) || filter !== 'todas';

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilter('todas');
  };

  const localizedResolvedCountry = bundle.countries[resolvedCountry] || resolvedCountry;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-[#111827] dark:text-white">
            {t.title}
          </h2>
          <button
            type="button"
            onClick={onRetryLoad}
            disabled={loading}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB] disabled:opacity-50 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            <span>{t.refresh}</span>
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <label htmlFor="noticias-search" className="sr-only">
            {t.searchPlaceholder}
          </label>
          <input
            id="noticias-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="min-h-[44px] w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-10 text-sm text-[#111827] placeholder:text-[#6B7280] focus:border-[#0F172A] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-white dark:placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={t.clearSearch}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#E5E7EB]/60 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 shrink-0 text-[#6B7280] dark:text-slate-400" />
            <label htmlFor="country-select" className="text-xs font-medium text-[#4B5563] dark:text-slate-300">
              {t.countryLabel}
              {countryChoice === 'Automático' ? ` (${localizedResolvedCountry})` : ''}
            </label>
          </div>
          <select
            id="country-select"
            value={countryChoice}
            onChange={(e) => {
              const val = e.target.value;
              onSelectCountry(val, val === 'Escrever outro país' ? customInput : undefined);
            }}
            className="min-h-[44px] w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm font-medium text-[#111827] focus:border-[#0F172A] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-white"
          >
            {COUNTRY_OPTIONS.map((c) => {
              const label = bundle.countries[c] || c;
              return (
                <option key={c} value={c}>
                  {c === 'Automático' ? `${t.autoLabel} (${localizedResolvedCountry})` : label}
                </option>
              );
            })}
          </select>

          {countryChoice === 'Escrever outro país' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customInput.trim()) {
                  onSelectCountry('Escrever outro país', customInput.trim());
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder={t.otherCountryPlaceholder}
                className="min-h-[44px] flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] focus:border-[#0F172A] focus:outline-none dark:border-slate-700 dark:bg-[#0B1120] dark:text-white"
              />
              <button
                type="submit"
                className="min-h-[44px] rounded-lg bg-[#0F172A] px-4 text-sm font-medium text-white hover:bg-[#1E293B] dark:bg-slate-100 dark:text-[#0F172A] whitespace-nowrap"
              >
                {t.apply}
              </button>
            </form>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-[#F3F4F6] p-1 dark:bg-slate-800/80">
            {(['todas', 'guardadas', 'denunciadas'] as NewsFilter[]).map((f) => {
              const labels: Record<NewsFilter, string> = {
                todas: t.filterAll,
                guardadas: t.filterSaved,
                denunciadas: t.filterReported,
              };
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs transition-colors whitespace-nowrap ${
                    active
                      ? 'border border-[#E5E7EB] bg-white font-semibold text-[#111827] dark:border-slate-700 dark:bg-[#111827] dark:text-white'
                      : 'border border-transparent font-medium text-[#4B5563] hover:text-[#111827] dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="min-h-[40px] rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827] dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              {t.clearFilters}
            </button>
          )}
        </div>
      </div>

      {loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[#E5E7EB] bg-white p-10 text-center dark:border-slate-800 dark:bg-[#111827]">
          <Clock className="h-6 w-6 text-[#6B7280] dark:text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-[#111827] dark:text-white">
            {t.loadingTitle}
          </p>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-slate-400">
            {t.loadingDesc} {localizedResolvedCountry}.
          </p>
        </div>
      )}

      {!loading && error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-amber-300 bg-white p-8 text-center dark:border-amber-800 dark:bg-[#111827]">
          <AlertTriangle className="h-7 w-7 text-amber-700 dark:text-amber-400" />
          <p className="mt-3 text-base font-semibold text-[#111827] dark:text-white">
            {t.errorTitle}
          </p>
          <p className="mt-1 text-sm text-[#4B5563] dark:text-slate-300">{t.errorDesc}</p>
          <button
            type="button"
            onClick={onRetryLoad}
            className="mt-5 flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1E293B] dark:bg-slate-100 dark:text-[#0F172A]"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{t.retry}</span>
          </button>
        </div>
      )}

      {!loading && !error && filteredItems.length === 0 && (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-8 text-center dark:border-slate-800 dark:bg-[#111827]">
          <p className="text-sm font-semibold text-[#111827] dark:text-white">
            {t.emptyFiltered}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-4 min-h-[44px] rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-medium text-white dark:bg-slate-100 dark:text-[#0F172A]"
            >
              {t.clearFilters}
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {filteredItems.map((item) => {
          const isSaved = savedIds.has(item.id);
          const isReported = reportedIds.has(item.id);
          const isVerifying = verifyingId === item.id;
          const seal = item.verification?.seal || 'unverified';

          const badgeClass =
            seal === 'verified_public_sources'
              ? 'bg-emerald-700 text-white'
              : seal === 'false_claim'
                ? 'bg-rose-700 text-white'
                : seal === 'exaggerated' || seal === 'out_of_context'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-white';

          const badgeText =
            seal === 'verified_public_sources'
              ? resultT.badgeTrue
              : seal === 'false_claim'
                ? resultT.badgeFalse
                : seal === 'exaggerated' || seal === 'out_of_context'
                  ? resultT.badgeMisleading
                  : resultT.badgeUnverified;

          const SealIcon =
            seal === 'verified_public_sources'
              ? CheckCircle2
              : seal === 'false_claim'
                ? ShieldX
                : seal === 'exaggerated' || seal === 'out_of_context'
                  ? AlertTriangle
                  : ShieldAlert;

          return (
            <article
              key={item.id}
              className="rounded-lg border border-[#E2E8F0] bg-white p-4 dark:border-slate-700 dark:bg-[#1E293B] sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 tabular-nums">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold ${badgeClass}`}
                  >
                    <SealIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>{badgeText}</span>
                  </span>
                  {item.verification && (
                    <>
                      <span aria-hidden="true" className="text-[#9CA3AF]">·</span>
                      <span className="font-semibold text-[#111827] dark:text-slate-200">
                        {item.verification.reliabilityScore}%
                      </span>
                    </>
                  )}
                  <span aria-hidden="true" className="text-[#9CA3AF]">·</span>
                  <span className="text-[#4B5563] dark:text-slate-300">{item.source}</span>
                  <span aria-hidden="true" className="text-[#9CA3AF]">·</span>
                  <span className="text-[#4B5563] dark:text-slate-300">
                    {formatRelativeLocalized(item.publishedAt, lang)}
                  </span>
                </div>

                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A2A3F] hover:underline dark:text-slate-200 whitespace-nowrap"
                >
                  <span>{t.readOriginal}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="flex-1 text-lg font-semibold leading-snug text-[#111827] dark:text-white">
                  {item.title}
                </h3>

                {item.imageUrl && (
                  <div className="aspect-[3/2] w-full shrink-0 overflow-hidden rounded-md border border-[#E2E8F0] dark:border-slate-700 sm:h-[100px] sm:w-[150px]">
                    <StreamImage
                      src={item.imageUrl}
                      alt={item.title}
                      width={300}
                      height={200}
                      imageLoadMode={imageLoadMode}
                      tapToLoadLabel={t.tapToLoadImage}
                      liteBadgeLabel={t.liteModeBadge}
                      wifiPausedLabel={t.wifiPausedBadge}
                    />
                  </div>
                )}
              </div>

              {item.verification && (
                <div className="mt-4 border-t border-[#E2E8F0] pt-4 text-base leading-relaxed dark:border-slate-700">
                  <p className="text-[#111827] dark:text-slate-100">
                    {item.verification.citedAnalysis || item.verification.note}
                  </p>
                  <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-xs text-[#4B5563] dark:text-slate-300 sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-[#111827] dark:text-slate-200">
                        {t.sourceField}
                      </span>{' '}
                      {item.verification.source || t.notAvailable}
                    </p>
                    <p className="tabular-nums">
                      <span className="font-medium text-[#111827] dark:text-slate-200">
                        {t.dateField}
                      </span>{' '}
                      {formatDateLocalized(item.verification.publishedAt, lang)}
                    </p>
                    <p className="tabular-nums">
                      <span className="font-medium text-[#111827] dark:text-slate-200">
                        {t.sourcesCountField}
                      </span>{' '}
                      {item.verification.sourcesCount > 0
                        ? item.verification.sourcesCount
                        : t.notAvailable}
                    </p>
                    <p className="truncate">
                      <span className="font-medium text-[#111827] dark:text-slate-200">
                        {t.originalLinkField}
                      </span>{' '}
                      {item.verification.originalLink ? (
                        <a
                          href={item.verification.originalLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 hover:text-[#111827] dark:hover:text-white"
                        >
                          {t.openSource}
                        </a>
                      ) : (
                        t.notAvailable
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onVerifyNewsItem(item)}
                  disabled={isVerifying}
                  className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-2 text-xs font-medium text-[#111827] transition-colors hover:bg-[#F9FAFB] disabled:opacity-60 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  {isVerifying ? (
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{isVerifying ? t.verifying : t.verify}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleSave(item)}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                    isSaved
                      ? 'border-[#0F172A] bg-[#0F172A] text-white dark:border-slate-100 dark:bg-slate-100 dark:text-[#0F172A]'
                      : 'border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F9FAFB] dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Bookmark className="h-3.5 w-3.5 shrink-0" />
                  <span>{isSaved ? t.saved : t.save}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onReport(item)}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                    isReported
                      ? 'border-rose-700 bg-rose-700 text-white dark:border-rose-600 dark:bg-rose-600'
                      : 'border-[#E5E7EB] bg-white text-[#111827] hover:bg-rose-50 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100 dark:hover:bg-rose-950/40'
                  }`}
                >
                  <Flag className="h-3.5 w-3.5 shrink-0" />
                  <span>{isReported ? t.reported : t.report}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
