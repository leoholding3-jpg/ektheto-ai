import { useState } from 'react';
import { Bookmark, ExternalLink, Flag, ShieldCheck, Trash2 } from 'lucide-react';
import type { AppLanguage, HistoryItem } from '../types';
import { getTranslations } from '../i18n/translations';
import { formatDateLocalized } from '../utils/formatDate';

interface TabHistoricoProps {
  lang: AppLanguage;
  savedItems: HistoryItem[];
  reportedItems: HistoryItem[];
  onRemoveSaved: (id: string) => void;
  onRemoveReported: (id: string) => void;
  onVerifyFromHistory: (item: HistoryItem) => void;
}

type HistoryFilter = 'tudo' | 'guardadas' | 'denunciadas';

export function TabHistorico({
  lang,
  savedItems,
  reportedItems,
  onRemoveSaved,
  onRemoveReported,
  onVerifyFromHistory,
}: TabHistoricoProps) {
  const bundle = getTranslations(lang);
  const t = bundle.historico;
  const resultT = bundle.result;
  const [filter, setFilter] = useState<HistoryFilter>('tudo');

  const combined: HistoryItem[] =
    filter === 'guardadas'
      ? savedItems
      : filter === 'denunciadas'
        ? reportedItems
        : [...savedItems, ...reportedItems].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
        <h2 className="text-lg font-semibold tracking-tight text-[#111827] dark:text-white">
          {t.title}
        </h2>
        <p className="mt-1 text-sm text-[#4B5563] dark:text-slate-400">{t.subtitle}</p>

        <div className="mt-4 inline-flex flex-wrap rounded-lg bg-[#F3F4F6] p-1 dark:bg-slate-800/80">
          {(
            [
              { id: 'tudo', label: `${t.all} (${savedItems.length + reportedItems.length})` },
              { id: 'guardadas', label: `${t.saved} (${savedItems.length})` },
              { id: 'denunciadas', label: `${t.reported} (${reportedItems.length})` },
            ] as Array<{ id: HistoryFilter; label: string }>
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs transition-colors tabular-nums whitespace-nowrap ${
                  active
                    ? 'border border-[#E5E7EB] bg-white font-semibold text-[#111827] dark:border-slate-700 dark:bg-[#111827] dark:text-white'
                    : 'border border-transparent font-medium text-[#4B5563] hover:text-[#111827] dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {combined.length === 0 ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-8 text-center dark:border-slate-800 dark:bg-[#111827]">
          <p className="text-sm font-semibold text-[#111827] dark:text-white">
            {t.emptyTitle}
          </p>
          <p className="mt-1 text-sm text-[#4B5563] dark:text-slate-400">{t.emptyDesc}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {combined.map((item) => {
            const isSavedKind = item.kind === 'saved';
            const badgeDisplay =
              item.seal === 'verified_public_sources'
                ? resultT.badgeTrue
                : item.seal === 'false_claim'
                  ? resultT.badgeFalse
                  : item.seal === 'exaggerated' || item.seal === 'out_of_context'
                    ? resultT.badgeMisleading
                    : resultT.badgeUnverified;

            const badgeBg =
              item.seal === 'verified_public_sources'
                ? 'bg-emerald-700 text-white'
                : item.seal === 'false_claim'
                  ? 'bg-rose-700 text-white'
                  : item.seal === 'exaggerated' || item.seal === 'out_of_context'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-white';

            return (
              <article
                key={`${item.kind}-${item.id}`}
                className="rounded-lg border border-[#E2E8F0] bg-white p-6 dark:border-slate-700 dark:bg-[#1E293B]"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${badgeBg}`}>
                    {badgeDisplay}
                  </span>
                  <span aria-hidden="true" className="text-[#9CA3AF]">·</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[#111827] dark:text-slate-200">
                    {isSavedKind ? (
                      <Bookmark className="h-3.5 w-3.5" />
                    ) : (
                      <Flag className="h-3.5 w-3.5 text-rose-700 dark:text-rose-400" />
                    )}
                    <span>{isSavedKind ? t.savedBadge : t.reportedBadge}</span>
                  </span>
                  <span aria-hidden="true" className="text-[#9CA3AF]">·</span>
                  <span className="text-[#4B5563] dark:text-slate-300">
                    {item.source || resultT.notAvailable}
                  </span>
                  <span aria-hidden="true" className="text-[#9CA3AF]">·</span>
                  <span className="text-[#4B5563] dark:text-slate-300">
                    {formatDateLocalized(item.publishedAt, lang)}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-semibold text-[#111827] dark:text-white">
                  {item.title}
                </h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onVerifyFromHistory(item)}
                    className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB] dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{t.verify}</span>
                  </button>

                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB] dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>{t.openLink}</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      isSavedKind ? onRemoveSaved(item.id) : onRemoveReported(item.id)
                    }
                    className="ml-auto flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-slate-700 dark:bg-[#111827] dark:text-rose-400 dark:hover:bg-rose-950/40 whitespace-nowrap"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t.remove}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
