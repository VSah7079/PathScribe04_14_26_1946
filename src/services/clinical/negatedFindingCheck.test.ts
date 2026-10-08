// Batch 452 (PS-131, PS-105): the code-side negation check behind the AI's
// critical-finding detection.
import { describe, expect, it } from 'vitest';
import { isTermNegatedThroughout, negationVerdict, partitionNegatedFindings, termOccurrences } from './negatedFindingCheck';

describe('isTermNegatedThroughout: negated phrases (the flag is dropped)', () => {
  it.each([
    ['No evidence of carcinoma.', 'carcinoma'],
    ['No evidence of high-grade dysplasia.', 'high-grade dysplasia'],
    ['Negative for acid-fast bacilli.', 'acid-fast bacilli'],
    ['AFB stain: negative for acid-fast bacilli', 'acid-fast bacilli'],
    ['Negative for intraepithelial lesion or malignancy.', 'malignancy'],
    ['Margins are free of carcinoma.', 'carcinoma'],
    ['Biopsy without evidence of acute cellular rejection.', 'acute cellular rejection'],
    ['There is no melanoma.', 'melanoma'],
    ['No carcinoma or melanoma is seen.', 'melanoma'],
    ['Absence of invasive carcinoma.', 'invasive carcinoma'],
    ['Invasive carcinoma is not identified.', 'invasive carcinoma'],
    ['Acid-fast bacilli not seen.', 'acid-fast bacilli'],
    ['Lymphovascular invasion: absent.', 'lymphovascular invasion'],
    ['Malignancy has been ruled out.', 'malignancy'],
    ['<p>Benign tissue.</p><p>No&nbsp;evidence of carcinoma.</p>', 'carcinoma'],
    ['NO EVIDENCE OF MALIGNANCY', 'malignancy'],
    ['No definite invasive carcinoma identified.', 'invasive carcinoma'],
  ])('%s → "%s" negated', (text, term) => {
    expect(isTermNegatedThroughout(text, term)).toBe(true);
  });
});

describe('isTermNegatedThroughout: findings that are present (the flag is kept)', () => {
  it.each([
    ['Invasive ductal carcinoma identified.', 'invasive ductal carcinoma', 'plain positive'],
    ['No lymphovascular invasion. Invasive carcinoma present.', 'invasive carcinoma', 'negation in another sentence'],
    ['No evidence of carcinoma; however, melanoma in situ is present.', 'melanoma in situ', 'semicolon and "however"'],
    ['No dysplasia but invasive carcinoma is present.', 'invasive carcinoma', '"but" ends the scope'],
    ['No dysplasia and invasive carcinoma present.', 'invasive carcinoma', '"and" ends the scope'],
    ['No LVI, carcinoma extends to the margin.', 'carcinoma', 'a comma ends the scope'],
    ['Carcinoma cannot be ruled out.', 'carcinoma', 'pseudo-negation "cannot be ruled out"'],
    ['Malignancy cannot be excluded.', 'malignancy', 'pseudo-negation "cannot be excluded"'],
    ['Malignancy is not excluded.', 'malignancy', 'pseudo-negation "not excluded"'],
    ['No change in the invasive carcinoma since the prior biopsy.', 'invasive carcinoma', 'pseudo-negation "no change in"'],
    ['Invasive carcinoma, ER negative, PR negative, HER2 negative.', 'invasive carcinoma', 'receptor "negative" after the term'],
    ['Carcinoma with absent E-cadherin staining.', 'carcinoma', '"absent" not straight after the term'],
    ['Gram-negative rods consistent with sepsis.', 'sepsis', 'gram-negative is not a negation'],
    ['Acid-fast bacilli present. No granulomas.', 'acid-fast bacilli', 'negation after the term in the next sentence'],
  ])('%s → "%s" present (%s)', (text, term) => {
    expect(isTermNegatedThroughout(text, term)).toBe(false);
  });

  it('a term negated once but asserted elsewhere is kept: every mention must be negated', () => {
    const text = 'Frozen section: no evidence of carcinoma. Permanent sections: invasive carcinoma is present.';
    expect(termOccurrences(text, 'carcinoma').map(o => o.negated)).toEqual([true, false]);
    expect(isTermNegatedThroughout(text, 'carcinoma')).toBe(false);
  });

  it('a term that does not appear at all is not "negated"', () => {
    expect(isTermNegatedThroughout('Benign skin.', 'melanoma')).toBe(false);
    expect(termOccurrences('Benign skin.', 'melanoma')).toEqual([]);
  });

  it('matches whole words only ("carcinomatosis" is not "carcinoma")', () => {
    expect(termOccurrences('No carcinomatosis.', 'carcinoma')).toEqual([]);
  });

  it('copes with empty text, empty terms and regex characters in the term', () => {
    expect(isTermNegatedThroughout('', 'carcinoma')).toBe(false);
    expect(isTermNegatedThroughout('No carcinoma.', '')).toBe(false);
    expect(() => termOccurrences('No (pT2) tumour.', 'pT2) tumour')).not.toThrow();
  });
});

describe('negationVerdict / partitionNegatedFindings', () => {
  const caseText = {
    gross: 'Received a 2 cm nodule.',
    microscopic: 'Sections show invasive ductal carcinoma. No lymphovascular invasion.',
    ancillary: 'Negative for acid-fast bacilli.',
  };

  it('reads the flag\'s own source field, not the others', () => {
    // "lymphovascular invasion" is negated in microscopic; flagged as gross it isn't found there.
    expect(negationVerdict({ term: 'lymphovascular invasion', sourceField: 'microscopic', sourceQuote: '' }, caseText)).toBe('negated');
    expect(negationVerdict({ term: 'lymphovascular invasion', sourceField: 'gross', sourceQuote: '' }, caseText)).toBe('notFound');
  });

  it('falls back to the quote when the model paraphrased the term, if the quote really is in the narrative', () => {
    expect(negationVerdict({ term: 'AFB', sourceField: 'ancillary', sourceQuote: 'nothing like this' }, caseText)).toBe('notFound');
    expect(negationVerdict({ term: 'mycobacterial bacilli', sourceField: 'ancillary', sourceQuote: 'Negative for acid-fast bacilli' }, caseText)).toBe('negated');
    expect(negationVerdict({ term: 'ductal carcinoma (invasive)', sourceField: 'microscopic', sourceQuote: 'invasive ductal carcinoma' }, caseText)).toBe('present');
  });

  it('never second-guesses a discrete synoptic-rule flag', () => {
    expect(negationVerdict({ term: 'carcinoma', sourceField: 'synoptic', sourceQuote: 'No evidence of carcinoma' }, { gross: '', microscopic: 'No evidence of carcinoma', ancillary: '' })).toBe('notFound');
  });

  it('splits a mixed list, keeping order and the original objects', () => {
    const a = { term: 'invasive ductal carcinoma', sourceField: 'microscopic' as const, sourceQuote: '', id: 1 };
    const b = { term: 'acid-fast bacilli', sourceField: 'ancillary' as const, sourceQuote: '', id: 2 };
    const c = { term: 'necrosis', sourceField: 'gross' as const, sourceQuote: '', id: 3 };
    const { kept, negated } = partitionNegatedFindings([a, b, c], caseText);
    expect(kept).toEqual([a, c]);
    expect(negated).toEqual([b]);
  });
});
