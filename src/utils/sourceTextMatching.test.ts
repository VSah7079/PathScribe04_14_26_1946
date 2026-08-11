// src/utils/sourceTextMatching.test.ts
import { describe, it, expect } from 'vitest';
import { matchSourceText } from './sourceTextMatching';
import type { Case } from '@/types/case/Case';

function makeCase(overrides: Partial<Case['diagnostic']> = {}, clinicalIndication = ''): Case {
  return {
    diagnostic: {
      grossDescription: '',
      microscopicDescription: '',
      ancillaryStudies: '',
      ...overrides,
    },
    order: { clinicalIndication } as any,
  } as unknown as Case;
}

describe('matchSourceText — real fix, item: AI Confirmed with no findable source', () => {
  it('finds a genuine verbatim match in the gross description', () => {
    const c = makeCase({ grossDescription: 'Received fresh labeled "left breast mastectomy" is a 487g specimen.' });
    const result = matchSourceText('Gross: "left breast mastectomy"', c);
    expect(result.found).toBe(true);
  });

  it('is case-insensitive', () => {
    const c = makeCase({ microscopicDescription: 'Sections show INVASIVE DUCTAL CARCINOMA, grade 2.' });
    const result = matchSourceText('invasive ductal carcinoma', c);
    expect(result.found).toBe(true);
  });

  it('tolerates the AI dropping trailing words from its own citation', () => {
    const c = makeCase({ grossDescription: 'Tumor measures 2.3 x 1.8 x 1.5 cm in the upper outer quadrant.' });
    // AI cites more words than actually appear contiguously at the end
    const result = matchSourceText('2.3 x 1.8 x 1.5 cm in the upper outer quadrant of unusual phrasing', c);
    expect(result.found).toBe(true);
  });

  it('genuinely reports not-found for a fabricated/mismatched source — the real bug this whole fix addresses', () => {
    const c = makeCase({
      grossDescription: 'Received fresh labeled specimen A.',
      microscopicDescription: 'Sections show benign tissue.',
    });
    const result = matchSourceText('Gross: "extensive perineural invasion identified"', c);
    expect(result.found).toBe(false);
  });

  it('handles a null/empty source honestly rather than throwing', () => {
    const c = makeCase();
    expect(matchSourceText(undefined, c).found).toBe(false);
    expect(matchSourceText('', c).found).toBe(false);
  });

  it('handles a null caseData without throwing', () => {
    const result = matchSourceText('some source text here', null);
    expect(result.found).toBe(false);
  });
});
