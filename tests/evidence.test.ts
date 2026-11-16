import assert from 'node:assert/strict';
import test from 'node:test';
import type { MatchedSourceItem } from '../src/types';
import {
  calculateEvidenceStrengthScore,
  getIndependentCorroboratingSources,
  getPublisherIdentity,
  isOfficialInstitutionalHost,
} from '../src/utils/evidence';

function source(
  publisher: string,
  relevanceScore: number,
  trustTier: MatchedSourceItem['trustTier'] = 'established_press',
  claimOverlapScore = relevanceScore
): MatchedSourceItem {
  return {
    title: 'Test source',
    source: publisher,
    publishedAt: '',
    link: 'https://example.com/article',
    relevanceScore,
    claimOverlapScore,
    trustTier,
  };
}

test('only strong, credible, independent publishers count as corroboration', () => {
  const candidates = [
    source('Reuters', 0.82),
    source('Reuters News', 0.9),
    source('AP News', 0.78),
    source('A weak match', 0.69),
    source('An unreviewed blog', 0.95, 'web_source'),
    source('Weak lexical overlap', 0.99, 'established_press', 0.4),
  ];

  assert.deepEqual(
    getIndependentCorroboratingSources(candidates).map((item) => item.source),
    ['Reuters', 'AP News']
  );
});

test('publisher aliases normalize so the same outlet is not counted twice', () => {
  assert.equal(getPublisherIdentity('Associated Press'), getPublisherIdentity('AP News'));
  assert.equal(getPublisherIdentity('Reuters.com'), getPublisherIdentity('Reuters'));
});

test('evidence strength increases with independent evidence and is not an AI confidence score', () => {
  const noEvidence = calculateEvidenceStrengthScore([]);
  const oneSource = calculateEvidenceStrengthScore([source('Reuters', 0.8)]);
  const twoSources = calculateEvidenceStrengthScore([
    source('Reuters', 0.8),
    source('Associated Press', 0.8),
  ]);

  assert.equal(noEvidence, 10);
  assert.ok(oneSource > noEvidence);
  assert.ok(twoSources > oneSource);
  assert.ok(twoSources <= 95);
});

test('institutional classification requires a real domain suffix or exact trusted domain', () => {
  assert.equal(isOfficialInstitutionalHost('agency.gov'), true);
  assert.equal(isOfficialInstitutionalHost('agency.gov.br'), true);
  assert.equal(isOfficialInstitutionalHost('who.int'), true);
  assert.equal(isOfficialInstitutionalHost('government.gov.example'), false);
  assert.equal(isOfficialInstitutionalHost('notwho.int.example'), false);
});
