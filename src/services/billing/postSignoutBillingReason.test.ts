// Oct 15, 2026 (review finding): one decision for when a billing change after sign-out asks for the reason.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { postSignoutReasonNeeded, specimenBillingChangeSummary } from './postSignoutBillingReason';
import en from '@/i18n/locales/en.json';

describe('postSignoutReasonNeeded', () => {
  it('asks only for a billed, signed-out case with a real change', () => {
    for (const status of ['finalized', 'pending-release', 'closed']) {
      expect(postSignoutReasonNeeded({ billed: true, status })).toBe(true);
    }
    expect(postSignoutReasonNeeded({ billed: true, status: 'in-progress' })).toBe(false);
    expect(postSignoutReasonNeeded({ billed: true, status: undefined })).toBe(false);
    expect(postSignoutReasonNeeded({ billed: false, status: 'finalized' }), 'the LIS bills an Assist case').toBe(false);
    expect(postSignoutReasonNeeded({ billed: true, status: 'finalized', hasChange: false })).toBe(false);
  });
});

describe('specimenBillingChangeSummary', () => {
  it('names the code that was added or removed, through a locale key', () => {
    const added = specimenBillingChangeSummary('added', '88305');
    const removed = specimenBillingChangeSummary('removed', '88305');
    expect(added.values).toEqual({ code: '88305' });
    expect(en.postSignoutBillingChangeModal[added.key.split('.')[1] as 'summaryCodeAdded']).toBe('{{code}} added.');
    expect(en.postSignoutBillingChangeModal[removed.key.split('.')[1] as 'summaryCodeRemoved']).toBe('{{code}} removed.');
  });
});

// Source check: the report page's specimen-level handlers go through the same reason step as the case-level ones.
describe('report page: specimen-level billing changes ask for the reason', () => {
  const src = readFileSync('src/pages/SynopticReportPage/SynopticReportPage.tsx', 'utf8');
  const body = (name: string) => {
    const start = src.indexOf(`const ${name} = async`);
    expect(start, name).toBeGreaterThan(-1);
    return src.slice(start, src.indexOf('\n  };', start));
  };
  it.each(['handleAddSpecimenBaseCode', 'handleDeleteSpecimenBaseCode', 'handleApplyMatrixBillingCode'])('%s', (name) => {
    const b = body(name);
    expect(b).toMatch(/specimenPostSignoutReason\(/);
    expect(b).toMatch(/if \(postSignoutContext === null\) return;/);
    // asked before the save, and the reason is passed to the charge or credit
    expect(b.indexOf('specimenPostSignoutReason(')).toBeLessThan(b.indexOf('saveSpecimensNow('));
    expect(b).toMatch(/Transaction\(specimenId, undefined, code, postSignoutContext\)/);
  });
  it('the case-level paths use the same decision (no second copy of it)', () => {
    expect(src).not.toMatch(/isCaseSignedOutForBilling\(/);
    expect(src.match(/postSignoutReasonNeeded\(/g)?.length).toBe(2);
  });
});
