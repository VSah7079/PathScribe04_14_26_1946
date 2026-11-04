// Batch 387 (PS-359 follow-up): the Cytology screening page's text goes through
// t(). This reads the page's source and fails if an English UI string, a
// hard-coded locale date, or a literal confirm/toast comes back. Stored data
// (report content, audit and message text) is deliberately still English and is
// listed here so a new entry has to be added on purpose.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const code = fs.readFileSync(path.join(__dirname, 'CytologyScreeningPage.tsx'), 'utf8')
  .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n');

// Batch 409: the sign-out moved to services/cytology/signOutCytologyCase.ts,
// taking its stored English (the resident name in a release record, the
// countersign email, the dispatch failure text) with it. Batch 410: the print
// preview's patient name and the QA record values moved to
// services/cytology/cytologyCaseActions.ts.
const STORED_DATA_LITERALS = [
  "'Unknown'",                // the fallback sender name on a review request
];

describe('CytologyScreeningPage text (Batch 387)', () => {
  it.each([
    'Review History', 'No reviews recorded yet', 'FINAL DIAGNOSIS', 'INITIAL REVIEW', 'CT-ELIGIBLE', 'PATH REQUIRED',
    'Mandatory QC', 'Flag High-Risk QC', 'Remove Flag', 'HPV Co-Testing', 'No co-test on record', 'Review Mode',
    'Your Role for This Review', 'Set as Final', 'AI Screening Concordance', 'Disagree', 'prorated CLIA',
    'unsaved changes', 'Approaching your', 'randomly selected', 'Reference range', 'Not specified',
  ])('no English "%s" left in the page', phrase => {
    expect(code).not.toContain(phrase);
  });

  it('formats dates with the user\'s locale, never toLocaleDateString()', () => {
    expect(code).not.toMatch(/toLocaleDateString\(/);
  });

  it('every toast and confirm goes through t() (or a service/PHI message)', () => {
    const literal = [...code.matchAll(/(?:toast\.(?:success|error|info|warning)|window\.confirm)\(\s*(['`])/g)].map(m => m[0]);
    expect(literal).toEqual([]);
  });

  it('the remaining English literals are exactly the stored-data ones', () => {
    for (const lit of STORED_DATA_LITERALS) expect(code).toContain(lit);
  });
});
