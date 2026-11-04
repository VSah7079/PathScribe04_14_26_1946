// Batch 669f (cyt-6): when the secondary code is optional, and when it needs a confirmation.
import { describe, it, expect } from 'vitest';
import type { CytologyCategoryEntry } from '../cytology/ICytologyCategoryService';
import { findCategoryForCode, isUnrecognisedSecondaryCode, nextDiscrepancySubmitStep, resolveQcCodeDivergence } from './resolveQcCodeDivergence';

const cat = (id: string, abbreviation: string, label: string, diagnosticRank: number, over: Partial<CytologyCategoryEntry> = {}): CytologyCategoryEntry => ({
  id, section: 'interpretation_result', nomenclatureSystem: 'bethesda', label, abbreviation, requiresPathologistReview: diagnosticRank > 0,
  diagnosticRank, active: true, isSystem: true, sortOrder: diagnosticRank, ...over,
});
const CATS = [
  cat('nilm', 'NILM', 'Negative for intraepithelial lesion or malignancy', 0),
  cat('ascus', 'ASC-US', 'Atypical squamous cells of undetermined significance', 1),
  cat('lsil', 'LSIL', 'Low-grade squamous intraepithelial lesion', 2),
  cat('asch', 'ASC-H', 'Atypical squamous cells, cannot exclude HSIL', 3),
  cat('hsil', 'HSIL', 'High-grade squamous intraepithelial lesion', 4),
];

describe('resolveQcCodeDivergence', () => {
  it('matches a code by abbreviation or label, ignoring case, spaces and hyphens', () => {
    expect(findCategoryForCode('asc us', CATS)?.id).toBe('ascus');
    expect(findCategoryForCode('low-grade squamous intraepithelial lesion', CATS)?.id).toBe('lsil');
    expect(findCategoryForCode('zzz', CATS)).toBeUndefined();
  });
  it('an empty secondary code never diverges (it is optional)', () => {
    expect(resolveQcCodeDivergence('HSIL', '  ', CATS).diverges).toBe(false);
  });
  it('one step apart on the same side is not significant', () => {
    expect(resolveQcCodeDivergence('ASC-US', 'LSIL', CATS).diverges).toBe(false);
    expect(resolveQcCodeDivergence('ASC-H', 'HSIL', CATS).diverges).toBe(false);
  });
  it('two or more steps apart is significant', () => {
    expect(resolveQcCodeDivergence('NILM', 'LSIL', CATS).diverges).toBe(true);
    expect(resolveQcCodeDivergence('ASC-US', 'HSIL', CATS).diverges).toBe(true);
  });
  it('one step apart across the low-grade / high-grade line is significant', () => {
    expect(resolveQcCodeDivergence('LSIL', 'ASC-H', CATS).diverges).toBe(true);
  });
  it('a code the scale cannot place is not judged', () => {
    expect(resolveQcCodeDivergence('NILM', 'typo', CATS).diverges).toBe(false);
  });
});

describe('nextDiscrepancySubmitStep', () => {
  it('needs a primary code, and nothing else', () => {
    expect(nextDiscrepancySubmitStep({ primary: '', secondary: 'HSIL', confirmed: false }, CATS)).toBe('blocked');
    expect(nextDiscrepancySubmitStep({ primary: 'HSIL', secondary: '', confirmed: false }, CATS)).toBe('submit');
  });
  it('asks for a confirmation on a significant divergence, then submits once confirmed', () => {
    expect(nextDiscrepancySubmitStep({ primary: 'NILM', secondary: 'HSIL', confirmed: false }, CATS)).toBe('confirm');
    expect(nextDiscrepancySubmitStep({ primary: 'NILM', secondary: 'HSIL', confirmed: true }, CATS)).toBe('submit');
  });
});

describe('unrecognised secondary code (reviewer refinement)', () => {
  it('a typed secondary code that matches no category is unrecognised; empty or known is not', () => {
    expect(isUnrecognisedSecondaryCode('typo', CATS)).toBe(true);
    expect(isUnrecognisedSecondaryCode('  ', CATS)).toBe(false);
    expect(isUnrecognisedSecondaryCode('hsil', CATS)).toBe(false);
  });
  it('nothing is judged when the category list could not be read', () => {
    expect(isUnrecognisedSecondaryCode('typo', [])).toBe(false);
  });
  it('Submit stops at "unrecognised" until the code is fixed or cleared; an unmatched primary does not stop it', () => {
    expect(nextDiscrepancySubmitStep({ primary: 'NILM', secondary: 'typo', confirmed: true }, CATS)).toBe('unrecognised');
    expect(nextDiscrepancySubmitStep({ primary: 'NILM', secondary: '', confirmed: false }, CATS)).toBe('submit');
    expect(nextDiscrepancySubmitStep({ primary: 'weird', secondary: 'HSIL', confirmed: false }, CATS)).toBe('submit');
  });
});
