// Batch 399: the critical intraoperative results dictionary match, with Pete's edge cases.
import { describe, it, expect } from 'vitest';
import { matchIntraopCriticalResults, mentionsUnnegated, parseMatchTerms } from './matchIntraopCriticalResults';
import { SEED_INTRAOP_CRITICAL_RESULTS } from './intraopCriticalResultSeeds';

describe('mentionsUnnegated', () => {
  it.each([
    ['Invasive ductal carcinoma', 'carcinoma', true],
    ['Negative for carcinoma', 'carcinoma', false],
    ['No evidence of malignancy', 'malignancy', false],
    // Pete: "No definitive evidence of malignancy is seen, except for..."
    ['No definitive evidence of malignancy is seen, except for atypical cells', 'malignancy', false],
    // Pete: "Carcinoma cannot be entirely ruled out, though negative for..."
    ['Carcinoma cannot be entirely ruled out, though negative for lymphovascular invasion', 'carcinoma', true],
    ['Cannot exclude malignancy', 'malignancy', true],
    ['Carcinoma is not identified.', 'carcinoma', false],
    ['Lymphoma: absent', 'lymphoma', false],
    ['Negative for lymphovascular invasion, carcinoma present at the deep margin', 'carcinoma', true],
    ['Margins negative. Metastatic carcinoma in one node.', 'carcinoma', true],
    ['Possible lymphoma, defer to permanents', 'lymphoma', true],
    ['Not suspicious for malignancy', 'malignancy', false],
    ['Carcinomatous change', 'carcinoma', false], // whole words only
    ['Positive margin at 12 o\'clock', 'positive margin', true],
    ['', 'carcinoma', false],
  ])('%s → %s: %s', (text, term, expected) => {
    expect(mentionsUnnegated(text, term)).toBe(expected);
  });
});

describe('matchIntraopCriticalResults', () => {
  it('matches by category or term, per specimen, and skips inactive entries', () => {
    const specimens = [
      { id: 'a', frozenSectionDiagnosis: 'Benign breast tissue, negative for carcinoma', frozenCategory: 'benign' as const },
      { id: 'b', frozenSectionDiagnosis: 'Tumor at the margin', frozenCategory: undefined },
      { id: 'c', frozenSectionDiagnosis: 'Atypical cells', frozenCategory: 'atypical_suspicious' as const },
    ];
    const entries = SEED_INTRAOP_CRITICAL_RESULTS.map(e => (e.id === 'icr-positive-node' ? { ...e, status: 'Inactive' as const } : e));
    expect(matchIntraopCriticalResults(specimens, entries)).toEqual([
      { entryId: 'icr-positive-margin', name: 'Positive or close margin', specimenIds: ['b'] },
      { entryId: 'icr-atypical', name: 'Atypical or suspicious for malignancy', specimenIds: ['c'] },
    ]);
  });

  it('no frozen results, no suggestion', () => {
    expect(matchIntraopCriticalResults([{ id: 'a' }], SEED_INTRAOP_CRITICAL_RESULTS)).toEqual([]);
  });

  it('parses the editor\'s terms box', () => {
    expect(parseMatchTerms(' carcinoma,\nPositive margin\n\ncarcinoma , ')).toEqual(['carcinoma', 'Positive margin']);
  });
});
