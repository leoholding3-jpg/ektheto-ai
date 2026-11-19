import assert from 'node:assert/strict';
import {
  calculateEvidenceStrengthScore,
  getIndependentDirectEvidenceSources,
  getPublisherIdentity,
  isOfficialInstitutionalHost,
} from '../src/utils/evidence.ts';

function source(
  publisher,
  relevanceScore,
  trustTier = 'established_press',
  claimOverlapScore = relevanceScore,
  evidenceRelation = 'direct_support'
) {
  return {
    title: 'Test source',
    source: publisher,
    publishedAt: '',
    link: 'https://example.com/article',
    relevanceScore,
    claimOverlapScore,
    trustTier,
    evidenceRelation,
  };
}

const tests = [
  ['only strong, credible, independent publishers count as corroboration', () => {
    const candidates = [
      source('Reuters', 0.82),
      source('Reuters News', 0.9),
      source('AP News', 0.78),
      source('A weak match', 0.69),
      source('An unreviewed blog', 0.95, 'web_source'),
      source('Weak lexical overlap', 0.99, 'established_press', 0.4),
      source('Related headline', 0.99, 'established_press', 0.99, 'related_only'),
    ];
    assert.deepEqual(
      getIndependentDirectEvidenceSources(candidates).map((item) => item.source),
      ['Reuters', 'AP News']
    );
  }],
  ['direct refutations count but related-only sources do not', () => {
    const directRefutation = source('Reuters', 0.9, 'established_press', 0.9, 'direct_refutation');
    const relatedSource = source('Associated Press', 0.99, 'established_press', 0.99, 'related_only');
    assert.deepEqual(
      getIndependentDirectEvidenceSources([directRefutation, relatedSource]),
      [directRefutation]
    );
  }],
  ['publisher aliases normalize', () => {
    assert.equal(getPublisherIdentity('Associated Press'), getPublisherIdentity('AP News'));
    assert.equal(getPublisherIdentity('Reuters.com'), getPublisherIdentity('Reuters'));
  }],
  ['evidence score grows with independent evidence', () => {
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
  }],
  ['institutional classification checks real domain suffixes', () => {
    assert.equal(isOfficialInstitutionalHost('agency.gov'), true);
    assert.equal(isOfficialInstitutionalHost('agency.gov.br'), true);
    assert.equal(isOfficialInstitutionalHost('who.int'), true);
    assert.equal(isOfficialInstitutionalHost('government.gov.example'), false);
    assert.equal(isOfficialInstitutionalHost('notwho.int.example'), false);
  }],
];

let failures = 0;
for (const [name, run] of tests) {
  try {
    run();
    process.stdout.write(`✓ ${name}\n`);
  } catch (error) {
    failures += 1;
    process.stderr.write(`✗ ${name}\n${error.stack ?? error}\n`);
  }
}

process.stdout.write(`\n${tests.length - failures}/${tests.length} tests passed\n`);
if (failures) process.exitCode = 1;
