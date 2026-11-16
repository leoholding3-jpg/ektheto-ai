import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  Flag,
  Info,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';
import type { AppLanguage, SourceTrustTier, VerificationResult } from '../types';
import { getTranslations } from '../i18n/translations';
import { formatDateLocalized } from '../utils/formatDate';
import { RichContentRenderer } from './RichContentRenderer';

interface VerificationResultCardProps {
  result: VerificationResult;
  lang: AppLanguage;
  isSaved: boolean;
  isReported: boolean;
  onSave: () => void;
  onReport: () => void;
}

export function VerificationResultCard({
  result,
  lang,
  isSaved,
  isReported,
  onSave,
  onReport,
}: VerificationResultCardProps) {
  const t = getTranslations(lang).result;

  const sealStyle = (() => {
    switch (result.seal) {
      case 'verified_public_sources':
        return {
          icon: CheckCircle2,
          badgeBg: 'bg-emerald-700 text-white dark:bg-emerald-600',
          leftBorder: 'border-l-emerald-700 dark:border-l-emerald-500',
          titleColor: 'text-emerald-800 dark:text-emerald-400',
          barColor: 'bg-emerald-700 dark:bg-emerald-500',
          badgeText: t.badgeTrue,
          sealText: t.verifiedPublic,
          certaintyText: t.certaintyConfirmed,
        };
      case 'false_claim':
        return {
          icon: ShieldX,
          badgeBg: 'bg-rose-700 text-white dark:bg-rose-600',
          leftBorder: 'border-l-rose-700 dark:border-l-rose-500',
          titleColor: 'text-rose-800 dark:text-rose-400',
          barColor: 'bg-rose-700 dark:bg-rose-500',
          badgeText: t.badgeFalse,
          sealText: t.falseClaim,
          certaintyText: t.certaintyFalse,
        };
      case 'exaggerated':
        return {
          icon: AlertTriangle,
          badgeBg: 'bg-amber-600 text-white dark:bg-amber-600',
          leftBorder: 'border-l-amber-600 dark:border-l-amber-500',
          titleColor: 'text-amber-800 dark:text-amber-400',
          barColor: 'bg-amber-600 dark:bg-amber-500',
          badgeText: t.badgeMisleading,
          sealText: t.exaggerated,
          certaintyText: t.certaintyExaggerated,
        };
      case 'out_of_context':
        return {
          icon: AlertTriangle,
          badgeBg: 'bg-amber-600 text-white dark:bg-amber-600',
          leftBorder: 'border-l-amber-600 dark:border-l-amber-500',
          titleColor: 'text-amber-800 dark:text-amber-400',
          barColor: 'bg-amber-600 dark:bg-amber-500',
          badgeText: t.badgeMisleading,
          sealText: t.outOfContext,
          certaintyText: t.certaintyOutOfContext,
        };
      default:
        return {
          icon: ShieldAlert,
          badgeBg: 'bg-slate-600 text-white dark:bg-slate-600',
          leftBorder: 'border-l-slate-500 dark:border-l-slate-400',
          titleColor: 'text-[#374151] dark:text-slate-300',
          barColor: 'bg-slate-600 dark:bg-slate-400',
          badgeText: t.badgeUnverified,
          sealText: t.unverified,
          certaintyText: t.certaintyNoEvidence,
        };
    }
  })();

  const SealIcon = sealStyle.icon;

  const normalizedSource =
    !result.source ||
    result.source === 'não disponível' ||
    result.source === 'not available' ||
    result.source === 'no disponible'
      ? t.notAvailable
      : result.source;

  const trustLabel = (tier?: SourceTrustTier) => {
    if (tier === 'fact_checker') return t.trustFactChecker;
    if (tier === 'official_institutional') return t.trustOfficialInstitutional;
    if (tier === 'established_press') return t.trustEstablishedPress;
    return t.trustWebSource;
  };

  const claimStatusLabel = (status: 'supported' | 'refuted' | 'misleading' | 'unverified') => {
    switch (status) {
      case 'supported':
        return { text: t.claimStatusSupported, color: 'text-emerald-800 dark:text-emerald-400' };
      case 'refuted':
        return { text: t.claimStatusRefuted, color: 'text-rose-800 dark:text-rose-400' };
      case 'misleading':
        return { text: t.claimStatusMisleading, color: 'text-amber-800 dark:text-amber-400' };
      default:
        return { text: t.claimStatusUnverified, color: 'text-[#6B7280] dark:text-slate-400' };
    }
  };

  const audit = result.pipelineAudit;
  const guardrailLabel = audit
    ? audit.guardrailStatus === 'adjusted_ungrounded'
      ? t.auditGuardrailAdjusted
      : audit.guardrailStatus === 'insufficient_evidence'
        ? t.auditGuardrailInsufficient
        : t.auditGuardrailPassed
    : null;

  const score = typeof result.reliabilityScore === 'number' ? result.reliabilityScore : 0;
  const originalClaimSummary = audit?.normalizedQuery || result.queryUsed;

  return (
    <article className="rounded-lg border border-[#E2E8F0] bg-white p-6 dark:border-slate-700 dark:bg-[#1E293B]">
      {/* Color-Coded Verdict Badge + Reliability Header */}
      <div className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-6 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold tracking-wide ${sealStyle.badgeBg}`}
            >
              <SealIcon className="h-4 w-4 shrink-0" />
              <span>{sealStyle.badgeText}</span>
            </span>
            <span className="text-sm font-medium text-[#4B5563] dark:text-slate-300">
              {t.sealHeading}
            </span>
          </div>
          <p className={`text-lg font-semibold ${sealStyle.titleColor}`}>{sealStyle.sealText}</p>
        </div>

        <div className="sm:min-w-[200px] sm:text-right">
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <span className="text-sm font-medium text-[#4B5563] dark:text-slate-300">
              {t.reliabilityHeading}
            </span>
            <span className="text-base font-semibold text-[#111827] dark:text-white tabular-nums">
              {score}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-sm bg-[#E2E8F0] dark:bg-slate-700">
            <div
              className={`h-full ${sealStyle.barColor}`}
              style={{ width: `${Math.min(100, Math.max(2, score))}%` }}
            />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#6B7280] dark:text-slate-400">
            {t.scoreDisclaimer}
          </p>
        </div>
      </div>

      {/* Verdict Summary Callout Box (Very light gray surface + colored left accent border) */}
      <div
        className={`mt-6 rounded-r-lg border border-[#E2E8F0] border-l-4 ${sealStyle.leftBorder} bg-[#F8FAFC] p-4 dark:border-slate-700 dark:bg-[#111827]`}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-[#4B5563] dark:text-slate-400">
          {t.verdictSummaryHeading}
        </p>
        <div className="mt-2 space-y-2 text-base leading-relaxed text-[#111827] dark:text-[#F8FAFC]">
          <p>
            <span className="font-semibold">{t.originalClaimLabel}: </span>
            <span>{originalClaimSummary}</span>
          </p>
          <p>
            <span className="font-semibold">{t.conclusionLabel}: </span>
            <span>{result.note}</span>
          </p>
        </div>
      </div>

      {/* Outdated News Recirculation Warning */}
      {result.dateWarning && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-base leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{t.dateWarningHeading}</p>
            <p className="mt-1">{result.dateWarning}</p>
          </div>
        </div>
      )}

      {/* Cited Analysis (16px readable editorial formatting) */}
      <div className="border-b border-[#E2E8F0] py-6 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#4B5563] dark:text-slate-300">
            {t.analysisHeading}
          </h3>
          {(result.modelUsed || result.cached || (result.ragChunksUsed ?? 0) > 0) && (
            <p className="text-xs text-[#6B7280] dark:text-slate-400 tabular-nums">
              {result.modelUsed ? `${t.modelLabel}: ${result.modelUsed}` : ''}
              {result.cached ? ` · ${t.cachedLabel}` : ''}
              {(result.ragChunksUsed ?? 0) > 0
                ? ` · ${t.ragUsedLabel}: ${result.ragChunksUsed}`
                : ''}
            </p>
          )}
        </div>
        <div className="mt-4">
          <RichContentRenderer
            content={result.citedAnalysis || result.note}
            copyLabel={t.copyCode}
            copiedLabel={t.copiedCode}
          />
        </div>
      </div>

      {/* Extracted Factual Sub-Claims Breakdown */}
      {result.extractedClaims && result.extractedClaims.length > 0 && (
        <div className="border-b border-[#E2E8F0] py-6 dark:border-slate-700">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#4B5563] dark:text-slate-300">
            {t.claimsBreakdownHeading}
          </h3>
          <ul className="mt-4 space-y-2">
            {result.extractedClaims.map((item, idx) => {
              const st = claimStatusLabel(item.status);
              return (
                <li
                  key={idx}
                  className="flex flex-col justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-base dark:border-slate-700 dark:bg-[#111827] sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="text-[#111827] dark:text-[#F8FAFC]">{item.claim}</span>
                  <span className={`shrink-0 text-sm font-semibold whitespace-nowrap ${st.color}`}>
                    {st.text}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Linguistic Warning Signs */}
      <div className="border-b border-[#E2E8F0] py-6 dark:border-slate-700">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#4B5563] dark:text-slate-300">
          {t.redFlagsHeading}
        </h3>
        {result.redFlags && result.redFlags.length > 0 ? (
          <ul className="mt-2 space-y-2 text-base leading-relaxed text-[#111827] dark:text-[#F8FAFC]">
            {result.redFlags.map((flag, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span aria-hidden="true" className="text-[#6B7280]">·</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-base text-[#4B5563] dark:text-slate-300">{t.noRedFlags}</p>
        )}
      </div>

      {/* Dedicated Evidence & Source Transparency Section */}
      <div className="border-b border-[#E2E8F0] py-6 dark:border-slate-700">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#4B5563] dark:text-slate-300">
          {t.evidenceTransparencyHeading}
        </h3>

        {/* Mandatory Real Source Fields */}
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-[#6B7280] dark:text-slate-400">{t.source}</dt>
            <dd className="mt-1 text-base font-semibold text-[#111827] dark:text-white break-words">
              {normalizedSource}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-[#6B7280] dark:text-slate-400">{t.date}</dt>
            <dd className="mt-1 text-base font-semibold text-[#111827] dark:text-white tabular-nums">
              {formatDateLocalized(result.publishedAt, lang)}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-[#6B7280] dark:text-slate-400">
              {t.originalLink}
            </dt>
            <dd className="mt-1 text-base font-semibold break-all">
              {result.originalLink ? (
                <a
                  href={result.originalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#0A2A3F] underline underline-offset-2 hover:text-[#1E3A8A] dark:text-slate-200 dark:hover:text-white"
                >
                  <span>{t.openOriginalLink}</span>
                  <ExternalLink className="h-4 w-4 shrink-0" />
                </a>
              ) : (
                <span className="text-[#6B7280] dark:text-slate-400">{t.notAvailable}</span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-[#6B7280] dark:text-slate-400">
              {t.sourcesCountLabel}
            </dt>
            <dd className="mt-1 text-base font-semibold text-[#111827] dark:text-white tabular-nums">
              {result.sourcesCount > 0 ? `${result.sourcesCount}` : t.notAvailable}
            </dd>
          </div>
        </dl>

        {/* Fact-Check Agency Records */}
        {result.factChecks && result.factChecks.length > 0 && (
          <div className="mt-6 border-t border-[#E2E8F0] pt-4 dark:border-slate-700">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-slate-400">
              {t.factChecksHeading}
            </h4>
            <ul className="mt-2 space-y-2">
              {result.factChecks.map((fc, idx) => (
                <li key={`${fc.url}-${idx}`} className="text-base text-[#111827] dark:text-slate-200">
                  <a
                    href={fc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-rose-800 underline underline-offset-2 dark:text-rose-400"
                  >
                    {fc.publisher}: {fc.rating}
                  </a>
                  <p className="mt-1 text-sm text-[#4B5563] dark:text-slate-400">{fc.claimText}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Numbered Original Sources & Citations */}
        {result.matchedSources.length > 0 && (
          <div className="mt-6 border-t border-[#E2E8F0] pt-4 dark:border-slate-700">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-slate-400">
              {t.publicSourcesFound}
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-[#6B7280] dark:text-slate-400">
              {t.sourceMatchDisclaimer}
            </p>
            <ul className="mt-4 divide-y divide-[#E2E8F0] dark:divide-slate-700">
              {result.matchedSources.map((src, idx) => (
                <li key={`${src.link}-${idx}`} className="py-3 first:pt-0 last:pb-0">
                  <a
                    href={src.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                  >
                    <p className="text-base font-medium text-[#111827] group-hover:underline dark:text-slate-100">
                      <span className="mr-2 font-mono text-sm text-[#6B7280] dark:text-slate-400 tabular-nums">
                        [{idx + 1}]
                      </span>
                      {src.title}
                    </p>
                    <p className="mt-1 text-sm text-[#4B5563] dark:text-slate-400 tabular-nums">
                      {src.source} · {trustLabel(src.trustTier)}
                      {src.publishedAt ? ` · ${formatDateLocalized(src.publishedAt, lang)}` : ''}
                    </p>
                    {src.corroboratesClaim && (
                      <p className="mt-1 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                        {t.sourceCorroboratesClaim}
                      </p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 5-Stage Pipeline Audit & Grounding */}
      {audit && (
        <div className="border-b border-[#E2E8F0] py-6 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-slate-400">
            {t.auditHeading}
          </p>
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[#6B7280] dark:text-slate-400">{t.auditIntent}</dt>
              <dd className="font-medium text-[#111827] dark:text-slate-200">{audit.intent}</dd>
            </div>
            <div>
              <dt className="text-[#6B7280] dark:text-slate-400">{t.auditHybridRerank}</dt>
              <dd className="font-medium text-[#111827] dark:text-slate-200 tabular-nums">
                {audit.keptAfterRerankCount} / {audit.retrievedCandidatesCount}
                {audit.discardedLowRelevanceCount > 0
                  ? ` (-${audit.discardedLowRelevanceCount})`
                  : ''}
              </dd>
            </div>
            {audit.normalizedQuery && (
              <div className="sm:col-span-2">
                <dt className="text-[#6B7280] dark:text-slate-400">{t.auditNormalized}</dt>
                <dd className="font-medium text-[#111827] dark:text-slate-200">
                  {audit.normalizedQuery}
                </dd>
              </div>
            )}
            {audit.rewrittenQuery && audit.rewrittenQuery !== audit.normalizedQuery && (
              <div className="sm:col-span-2">
                <dt className="text-[#6B7280] dark:text-slate-400">{t.auditRewritten}</dt>
                <dd className="font-medium text-[#111827] dark:text-slate-200">
                  {audit.rewrittenQuery}
                </dd>
              </div>
            )}
            {guardrailLabel && (
              <div className="sm:col-span-2">
                <dt className="text-[#6B7280] dark:text-slate-400">{t.auditGuardrails}</dt>
                <dd className="font-medium text-[#111827] dark:text-slate-200">
                  {guardrailLabel}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Important Limitations Notice */}
      <div className="flex items-start gap-2 pt-6 text-sm leading-relaxed text-[#4B5563] dark:text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <span className="font-semibold text-[#111827] dark:text-slate-200">
            {t.limitationsHeading}:{' '}
          </span>
          <span>{t.limitationsBody}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onSave}
          className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
            isSaved
              ? 'border-[#0A2A3F] bg-[#0A2A3F] text-white dark:border-slate-100 dark:bg-slate-100 dark:text-[#111827]'
              : 'border-[#E2E8F0] bg-white text-[#111827] hover:bg-[#F8FAFC] dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bookmark className="h-4 w-4 shrink-0" />
          <span>{isSaved ? t.saved : t.save}</span>
        </button>

        <button
          type="button"
          onClick={onReport}
          className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
            isReported
              ? 'border-rose-700 bg-rose-700 text-white dark:border-rose-600 dark:bg-rose-600'
              : 'border-[#E2E8F0] bg-white text-[#111827] hover:bg-rose-50 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100 dark:hover:bg-rose-950/40'
          }`}
        >
          <Flag className="h-4 w-4 shrink-0" />
          <span>{isReported ? t.reported : t.report}</span>
        </button>
      </div>
    </article>
  );
}
