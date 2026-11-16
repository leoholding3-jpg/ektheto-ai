import { AlertCircle, Check, Image as ImageIcon, Info, Link2, Search, Video } from 'lucide-react';
import type { AppLanguage } from '../types';
import { getTranslations } from '../i18n/translations';

interface TabAprenderProps {
  lang: AppLanguage;
  onGoToVerify: () => void;
}

const ICON_MAP = {
  deepfake: Video,
  'ai-images': ImageIcon,
  'misleading-titles': AlertCircle,
  'fake-links': Link2,
  limitations: Info,
} as const;

export function TabAprender({ lang, onGoToVerify }: TabAprenderProps) {
  const t = getTranslations(lang).aprender;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <h2 className="text-lg font-semibold tracking-tight text-[#111827] dark:text-white">
          {t.title}
        </h2>
        <p className="mt-1 text-sm text-[#4B5563] dark:text-slate-400">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {t.lessons.map((lesson) => {
          const Icon = ICON_MAP[lesson.id as keyof typeof ICON_MAP] || AlertCircle;
          return (
            <article
              key={lesson.id}
              className="flex flex-col justify-between rounded-lg border border-[#E5E7EB] bg-white p-5 dark:border-slate-800 dark:bg-[#111827]"
            >
              <div>
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#374151] dark:text-slate-300" />
                  <div>
                    <h3 className="text-base font-semibold text-[#111827] dark:text-white">
                      {lesson.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#6B7280] dark:text-slate-400">
                      {lesson.subtitle}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-[#374151] dark:text-slate-300">
                  {lesson.description}
                </p>

                <ul className="mt-4 space-y-2 border-t border-[#E5E7EB] pt-3 dark:border-slate-800">
                  {lesson.checks.map((c, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-[#374151] dark:text-slate-200"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4B5563] dark:text-slate-400" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold text-[#111827] dark:text-white">{t.ctaTitle}</p>
            <p className="mt-0.5 text-sm text-[#4B5563] dark:text-slate-400">{t.ctaDesc}</p>
          </div>
          <button
            type="button"
            onClick={onGoToVerify}
            className="flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1E293B] dark:bg-slate-100 dark:text-[#0F172A] dark:hover:bg-white whitespace-nowrap"
          >
            <Search className="h-4 w-4" />
            <span>{t.ctaBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
