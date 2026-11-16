import type { ClaimEvidenceRelation, MatchedSourceItem, SourceTrustTier } from '../types';

export const MIN_CORROBORATION_RELEVANCE = 0.7;
export const MIN_CLAIM_OVERLAP = 0.65;

const TRUST_WEIGHT: Record<SourceTrustTier, number> = {
  fact_checker: 1,
  official_institutional: 0.9,
  established_press: 0.75,
  web_source: 0.35,
};

const OFFICIAL_DOMAINS = [
  'who.int',
  'un.org',
  'unesco.org',
  'worldbank.org',
  'imf.org',
  'europa.eu',
  'nature.com',
  'science.org',
  'thelancet.com',
  'nejm.org',
];

export function isOfficialInstitutionalHost(host: string): boolean {
  const normalizedHost = host.toLowerCase().replace(/^www\./i, '').replace(/\.$/, '');
  if (
    ['gov', 'gov.br', 'gov.ao', 'gov.pt', 'edu'].some(
      (suffix) => normalizedHost === suffix || normalizedHost.endsWith(`.${suffix}`)
    )
  ) {
    return true;
  }

  if (/(^|\.)gob\.[a-z.]+$/.test(normalizedHost)) {
    return true;
  }

  return OFFICIAL_DOMAINS.some(
    (domain) => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`)
  );
}

export function getPublisherIdentity(source: string): string {
  const normalized = source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\.(com|org|net|edu|gov|pt|br|ao|uk)\b/g, ' ')
    .replace(/\b(the|news|online)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (/^(ap|associated press)$/.test(normalized)) return 'associated press';
  if (/^bbc(\s|$)/.test(normalized)) return 'bbc';
  if (/^reuters(\s|$)/.test(normalized)) return 'reuters';
  if (/^afp(\s|$)/.test(normalized)) return 'afp';
  return normalized;
}

export function isDirectClaimEvidenceRelation(
  relation: ClaimEvidenceRelation | undefined
): boolean {
  return relation === 'direct_support' || relation === 'direct_refutation';
}

export function getIndependentDirectEvidenceSources(
  sources: MatchedSourceItem[],
  minimumRelevance = MIN_CORROBORATION_RELEVANCE
): MatchedSourceItem[] {
  const byPublisher = new Map<string, MatchedSourceItem>();

  for (const source of sources) {
    if (
      source.trustTier === 'web_source' ||
      !isDirectClaimEvidenceRelation(source.evidenceRelation) ||
      typeof source.relevanceScore !== 'number' ||
      source.relevanceScore < minimumRelevance ||
      typeof source.claimOverlapScore !== 'number' ||
      source.claimOverlapScore < MIN_CLAIM_OVERLAP
    ) {
      continue;
    }

    const identity = getPublisherIdentity(source.source);
    if (identity && !byPublisher.has(identity)) {
      byPublisher.set(identity, source);
    }
  }

  return [...byPublisher.values()];
}

export function calculateEvidenceStrengthScore(sources: MatchedSourceItem[]): number {
  const directEvidenceSources = getIndependentDirectEvidenceSources(sources);
  if (directEvidenceSources.length === 0) return 10;

  const averageRelevance =
    directEvidenceSources.reduce((sum, source) => sum + (source.relevanceScore || 0), 0) /
    directEvidenceSources.length;
  const averageTrust =
    directEvidenceSources.reduce(
      (sum, source) => sum + TRUST_WEIGHT[source.trustTier || 'web_source'],
      0
    ) / directEvidenceSources.length;

  return Math.min(
    95,
    Math.round(
      10 +
        Math.min(directEvidenceSources.length, 4) * 14 +
        averageRelevance * 22 +
        averageTrust * 15
    )
  );
}
