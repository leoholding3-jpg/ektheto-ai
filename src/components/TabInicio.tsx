import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  HeartPulse,
  Landmark,
  Link2,
  Radio,
  Scale,
  Search,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';
import type {
  AppLanguage,
  ImageLoadMode,
  MediaType,
  NewsItem,
  SealStatus,
  VerificationThread,
} from '../types';
import { getTranslations } from '../i18n/translations';
import { formatRelativeLocalized } from '../utils/formatDate';
import { VeritasLogo } from './VeritasLogo';
import { StreamImage } from './StreamImage';

interface TabInicioProps {
  lang: AppLanguage;
  threads: VerificationThread[];
  newsItems: NewsItem[];
  imageLoadMode: ImageLoadMode;
  onStartVerify: (
    type: MediaType,
    content: string,
    autoRun: boolean
  ) => void;
  onOpenThread: (thread: VerificationThread) => void;
  onOpenArchive: () => void;
}

type TopicKey = 'finance' | 'health' | 'media' | 'policy';

interface ArchiveGridCard {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  seal: SealStatus;
  category: string;
  topicKey: TopicKey;
  imageUrl?: string;
  thread?: VerificationThread;
  link?: string | null;
}

function classifyEditorialTopic(
  text: string,
  t: ReturnType<typeof getTranslations>['inicio']
): { category: string; topicKey: TopicKey } {
  const lower = text.toLowerCase();
  if (
    /\b(bank|banco|economy|economia|tax|imposto|infla|market|mercado|currency|interest|rate|finance|dinheiro)\b/i.test(
      lower
    )
  ) {
    return { category: t.catFinance, topicKey: 'finance' };
  }
  if (
    /\b(health|saúde|salud|medic|virus|vaccine|vacina|hospital|who|oms|climate|clima|science|ciência)\b/i.test(
      lower
    )
  ) {
    return { category: t.catHealth, topicKey: 'health' };
  }
  if (
    /\b(5g|internet|tech|tecnolog|ai|ia|video|vídeo|social|whatsapp|media|telecom|cyber|deepfake)\b/i.test(
      lower
    )
  ) {
    return { category: t.catMedia, topicKey: 'media' };
  }
  return { category: t.catPolicy, topicKey: 'policy' };
}

function EditorialFallbackSurface({ topicKey }: { topicKey: TopicKey }) {
  const Icon =
    topicKey === 'finance'
      ? Landmark
      : topicKey === 'health'
        ? HeartPulse
        : topicKey === 'media'
          ? Radio
          : Scale;

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#F1F5F9] text-[#475569] dark:bg-slate-800 dark:text-slate-300">
      <Icon className="h-9 w-9 opacity-70" aria-hidden="true" />
    </div>
  );
}

export function TabInicio({
  lang,
  threads,
  newsItems,
  imageLoadMode,
  onStartVerify,
  onOpenThread,
  onOpenArchive,
}: TabInicioProps) {
  const [inputValue, setInputValue] = useState('');
  const bundle = getTranslations(lang);
  const t = bundle.inicio;
  const newsT = bundle.noticias;
  const resultT = bundle.result;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    const looksLikeUrl = /https?:\/\/\S+/i.test(trimmed);
    onStartVerify(looksLikeUrl ? 'link' : 'text', trimmed, Boolean(trimmed));
  };

  const quickButtons: Array<{ type: MediaType; label: string; icon: typeof Link2 }> = [
    { type: 'text', label: t.quickText, icon: FileText },
    { type: 'link', label: t.quickLink, icon: Link2 },
  ];

  const badgeSpec = (seal: SealStatus) => {
    switch (seal) {
      case 'verified_public_sources':
        return {
          label: resultT.badgeTrue,
          bgClass: 'bg-emerald-700 text-white',
          icon: CheckCircle2,
        };
      case 'false_claim':
        return {
          label: resultT.badgeFalse,
          bgClass: 'bg-rose-700 text-white',
          icon: ShieldX,
        };
      case 'exaggerated':
      case 'out_of_context':
        return {
          label: resultT.badgeMisleading,
          bgClass: 'bg-amber-600 text-white',
          icon: AlertTriangle,
        };
      default:
        return {
          label: resultT.badgeUnverified,
          bgClass: 'bg-slate-700 text-white',
          icon: ShieldAlert,
        };
    }
  };

  const gridCards = useMemo<ArchiveGridCard[]>(() => {
    const cards: ArchiveGridCard[] = [];
    const seenTitles = new Set<string>();

    for (const th of threads) {
      const titleKey = th.title.toLowerCase().trim();
      if (seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);
      const topic = classifyEditorialTopic(`${th.title} ${th.content}`, t);
      cards.push({
        id: th.id,
        title: th.title,
        source: th.result.source || 'VERITAS AI',
        publishedAt: th.createdAt,
        seal: th.result.seal,
        category: topic.category,
        topicKey: topic.topicKey,
        thread: th,
        link: th.result.originalLink,
      });
      if (cards.length >= 6) break;
    }

    if (cards.length < 6) {
      for (const item of newsItems) {
        const titleKey = item.title.toLowerCase().trim();
        if (seenTitles.has(titleKey)) continue;
        seenTitles.add(titleKey);
        const topic = classifyEditorialTopic(`${item.title} ${item.source}`, t);
        cards.push({
          id: item.id,
          title: item.title,
          source: item.source,
          publishedAt: item.publishedAt,
          seal: item.verification?.seal || 'unverified',
          category: topic.category,
          topicKey: topic.topicKey,
          imageUrl: item.imageUrl,
          link: item.link,
        });
        if (cards.length >= 6) break;
      }
    }

    return cards;
  }, [threads, newsItems, t]);

  return (
    <div className="space-y-8">
      {/* Hero Section: Featured Fact-Check & Analysis Search Bar */}
      <section
        aria-label={t.slogan}
        className="rounded-lg border border-[#E2E8F0] bg-white p-6 dark:border-slate-700 dark:bg-[#1E293B] sm:p-8"
      >
        <div className="flex items-center gap-4">
          <VeritasLogo size={40} className="shrink-0 text-[#0A2A3F] dark:text-white" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#4B5563] dark:text-slate-300">
              {bundle.header.subtitle}
            </p>
            <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-[#111827] text-balance dark:text-white sm:text-3xl">
              {t.slogan}
            </h2>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#374151] dark:text-slate-200">
          {t.subcopy}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label htmlFor="inicio-verify-input" className="sr-only">
            {t.inputLabel}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex flex-1 items-center">
              <Search className="pointer-events-none absolute left-4 h-5 w-5 text-[#4B5563] dark:text-slate-400" />
              <input
                id="inicio-verify-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t.placeholder}
                className="min-h-[56px] w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] pl-12 pr-36 text-base text-[#111827] placeholder:text-[#6B7280] focus:border-[#0A2A3F] focus:bg-white focus:outline-none dark:border-slate-600 dark:bg-[#111827] dark:text-white dark:placeholder:text-slate-400 dark:focus:border-slate-300"
              />
            </div>

            <button
              type="submit"
              className="flex min-h-[56px] shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0A2A3F] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#123D5A] dark:bg-slate-100 dark:text-[#111827] dark:hover:bg-white whitespace-nowrap"
            >
              <span>{t.verifyNow}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </form>

        {/* Format Shortcuts */}
        <div className="mt-6 border-t border-[#E2E8F0] pt-6 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#4B5563] dark:text-slate-300">
            {t.chooseTitle}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            {quickButtons.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => onStartVerify(type, inputValue.trim(), false)}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-base font-medium text-[#111827] transition-colors hover:bg-[#F1F5F9] dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <Icon className="h-4 w-4 shrink-0 text-[#4B5563] dark:text-slate-300" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* BBC / Euronews-Style 16:9 Recent Verifications Archive Grid */}
      {gridCards.length > 0 && (
        <section aria-label={t.recentVerificationsTitle} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E8F0] pb-4 dark:border-slate-700">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#111827] dark:text-white">
                {t.recentVerificationsTitle}
              </h2>
              <p className="mt-1 text-base text-[#4B5563] dark:text-slate-300">
                {t.recentVerificationsSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenArchive}
              className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-[#0A2A3F] underline-offset-4 hover:underline dark:text-slate-200 whitespace-nowrap"
            >
              <span>{t.viewArchive}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gridCards.map((card) => {
              const badge = badgeSpec(card.seal);
              const BadgeIcon = badge.icon;

              return (
                <article
                  key={card.id}
                  className="group flex flex-col overflow-hidden rounded-lg border border-[#E2E8F0] bg-white transition-colors hover:border-[#94A3B8] dark:border-slate-700 dark:bg-[#1E293B] dark:hover:border-slate-500"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-[#F1F5F9] dark:bg-slate-800">
                    {card.imageUrl ? (
                      <StreamImage
                        src={card.imageUrl}
                        alt={card.title}
                        width={400}
                        height={225}
                        imageLoadMode={imageLoadMode}
                        tapToLoadLabel={newsT.tapToLoadImage}
                        liteBadgeLabel={newsT.liteModeBadge}
                        wifiPausedLabel={newsT.wifiPausedBadge}
                      />
                    ) : (
                      <EditorialFallbackSurface topicKey={card.topicKey} />
                    )}
                    <span
                      className={`pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold tracking-wide ${badge.bgClass}`}
                    >
                      <BadgeIcon className="h-3.5 w-3.5 shrink-0" />
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (card.thread) {
                        onOpenThread(card.thread);
                      } else {
                        onStartVerify(card.link ? 'link' : 'text', card.link || card.title, true);
                      }
                    }}
                    className="flex flex-1 flex-col justify-between p-4 text-left"
                  >
                    <div>
                      <p className="text-xs font-medium text-[#4B5563] dark:text-slate-300 tabular-nums">
                        {card.category} · {card.source} ·{' '}
                        {formatRelativeLocalized(card.publishedAt, lang)}
                      </p>
                      <h3 className="mt-2 line-clamp-3 text-base font-semibold leading-snug text-[#111827] group-hover:underline dark:text-white">
                        {card.title}
                      </h3>
                    </div>

                    <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-[#0A2A3F] dark:text-slate-200">
                      <span>{card.thread ? t.openReport : t.verifyHeadline}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0" />
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Prompts */}
      <section aria-label={t.quickPromptsTitle} className="space-y-4">
        <h3 className="text-base font-semibold text-[#111827] dark:text-white">
          {t.quickPromptsTitle}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {t.quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onStartVerify(qp.type, qp.prompt, true)}
              className="flex min-h-[64px] items-start justify-between gap-4 rounded-lg border border-[#E2E8F0] bg-white p-4 text-left transition-colors hover:bg-[#F8FAFC] dark:border-slate-700 dark:bg-[#1E293B] dark:hover:bg-slate-800"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-base font-semibold text-[#111827] dark:text-white">
                  <FileText className="h-4 w-4 shrink-0 text-[#4B5563] dark:text-slate-300" />
                  <span className="truncate">{qp.label}</span>
                </p>
                <p className="mt-1 line-clamp-1 text-sm text-[#4B5563] dark:text-slate-300">
                  {qp.prompt}
                </p>
              </div>
              <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#6B7280] dark:text-slate-400" />
            </button>
          ))}
        </div>
      </section>

      {/* How VERITAS AI Works */}
      <section className="rounded-lg border border-[#E2E8F0] bg-white p-6 dark:border-slate-700 dark:bg-[#1E293B]">
        <h3 className="text-base font-semibold text-[#111827] dark:text-white">{t.howItWorks}</h3>
        <ol className="mt-4 divide-y divide-[#E2E8F0] dark:divide-slate-700">
          <li className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
            <span className="w-8 shrink-0 text-sm font-semibold text-[#6B7280] dark:text-slate-400 tabular-nums">
              01.
            </span>
            <div>
              <p className="text-base font-semibold text-[#111827] dark:text-white">{t.step1Title}</p>
              <p className="mt-1 text-base leading-relaxed text-[#4B5563] dark:text-slate-300">
                {t.step1Desc}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
            <span className="w-8 shrink-0 text-sm font-semibold text-[#6B7280] dark:text-slate-400 tabular-nums">
              02.
            </span>
            <div>
              <p className="text-base font-semibold text-[#111827] dark:text-white">{t.step2Title}</p>
              <p className="mt-1 text-base leading-relaxed text-[#4B5563] dark:text-slate-300">
                {t.step2Desc}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
            <span className="w-8 shrink-0 text-sm font-semibold text-[#6B7280] dark:text-slate-400 tabular-nums">
              03.
            </span>
            <div>
              <p className="text-base font-semibold text-[#111827] dark:text-white">{t.step3Title}</p>
              <p className="mt-1 text-base leading-relaxed text-[#4B5563] dark:text-slate-300">
                {t.step3Desc}
              </p>
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}
