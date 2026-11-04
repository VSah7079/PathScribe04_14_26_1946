// Batch 460: charges and credits behind billing review changes, and billing:applied-code:review.
// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { recordCaseCharge, recordCaseCredit, recordCaseCodeCorrection, enforceBillingReview, auditBillingSuggestionDeclined, type CaseBillingChargeDeps } from './caseBillingCharges';

function deps(over: Partial<CaseBillingChargeDeps> = {}) {
  const saved: any[] = []; const audit: any[] = []; const asked: any[] = [];
  const d: CaseBillingChargeDeps = {
    enforce: vi.fn(async (c, ctx) => { asked.push([c, ctx]); return { allowed: true }; }),
    getBillingRules: async () => ({ ok: true, data: [] as any }),
    saveCharge: async r => { saved.push(r); },
    findActiveCharge: async () => ({ ok: true, data: null }),
    requiresApproval: async () => false,
    logAudit: e => { audit.push(e); },
    correctCharge: async () => ({ ok: true, data: { original: { id: 'chg-1' } as any, corrected: { id: 'chg-2' } as any } }),
    ...over,
  };
  return { d, saved, audit, asked };
}
const caseData = {
  id: 'C1', accession: { fullAccession: 'S26-1' }, order: { facilityId: 'F1' },
  specimens: [{ id: 'A', label: 'A', collectedAt: '2026-09-01', blocks: [{ id: 'b1', label: '1' }] }, { id: 'B', label: 'B' }],
};

describe('enforceBillingReview', () => {
  it('asks billing:applied-code:review with the case and facility', async () => {
    const h = deps();
    expect(await enforceBillingReview(caseData, h.d)).toBe(true);
    expect(h.asked).toEqual([['billing:applied-code:review', { caseId: 'C1', facilityId: 'F1' }]]);
    const refused = deps({ enforce: async () => ({ allowed: false }) });
    expect(await enforceBillingReview(caseData, refused.d)).toBe(false);
  });
});

describe('recordCaseCharge', () => {
  it('withholds and audits a charge with no collection or receipt date; nothing saved', async () => {
    const h = deps();
    expect(await recordCaseCharge({ caseData, specimenId: 'B', code: 'X', user: { id: 'u', name: 'U' } }, h.d)).toBe('withheldNoDate');
    expect(h.saved).toEqual([]);
    expect(h.audit[0].event).toMatch(/NOT charged/);
  });
  it('a code no dictionary rule covers is not invented', async () => {
    const h = deps();
    expect(await recordCaseCharge({ caseData, specimenId: 'A', blockId: 'b1', code: 'NOPE', user: null }, h.d)).toBe('noRule');
    expect(h.saved).toEqual([]);
  });
  it('charges against the dictionary, waits for approval when the lab requires it, and audits', async () => {
    const { mockBillingRuleService } = await import('./mockBillingRuleService');
    const rules = await mockBillingRuleService.getAll();
    const code = (rules as any).data.find((r: any) => r.billingCode === 'PAP-THINPREP')?.billingCode ?? (rules as any).data[0].billingCode;
    const h = deps({ getBillingRules: async () => rules as any, requiresApproval: async () => true });
    expect(await recordCaseCharge({ caseData, specimenId: 'A', blockId: 'b1', code, user: { id: 'u1', name: 'Dr U' } }, h.d)).toBe('charged');
    expect(h.saved).toHaveLength(1);
    expect(h.saved[0]).toMatchObject({ caseId: 'C1', sourceLabel: 'A1', billingCode: code });
    expect(h.saved[0]).toMatchObject({ approvalStatus: 'PENDING_APPROVAL', draftedBy: 'u1' });
    expect(h.audit[0]).toMatchObject({ event: 'Billing code charged', user: 'Dr U', caseId: 'S26-1' });
  });
});

describe('recordCaseCredit', () => {
  it('reverses the active charge exactly', async () => {
    const active = { id: 'chg-1', caseId: 'C1', billingCode: 'X', cptCode: '88305' } as any;
    const h = deps({ findActiveCharge: async () => ({ ok: true, data: active }) });
    expect(await recordCaseCredit({ caseData, specimenId: 'A', blockId: 'b1', code: 'X', user: { id: 'u' } }, h.d)).toBe('credited');
    expect(h.saved[0].id).toBe('crd-chg-1');
    expect(h.audit[0].detail).toMatch(/^A1: X \(88305\) removed - real credit issued reversing charge chg-1/);
  });
  it('with no charge on file, the removal is still audited', async () => {
    const h = deps();
    expect(await recordCaseCredit({ caseData, specimenId: 'A', code: 'X', user: null }, h.d)).toBe('noChargeOnFile');
    expect(h.saved).toEqual([]);
    expect(h.audit[0].event).toBe('Billing code removed (no charge record found)');
  });
  // Oct 15, 2026 (review finding): a removal after sign-out keeps its reason in the audit even with no charge to credit.
  it('the post-sign-out reason is recorded on the credit audit, charge on file or not', async () => {
    const ctx = { reasonId: 'psbc-coding-error', comment: 'Wrong base code' };
    const none = deps();
    await recordCaseCredit({ caseData, specimenId: 'A', code: 'X', user: null, postSignoutContext: ctx }, none.d);
    expect(none.audit[0].detail).toMatch(/post-sign-out change, reason psbc-coding-error: "Wrong base code"$/);
    const active = { id: 'chg-1', caseId: 'C1', billingCode: 'X', cptCode: '88305' } as any;
    const h = deps({ findActiveCharge: async () => ({ ok: true, data: active }) });
    await recordCaseCredit({ caseData, specimenId: 'A', code: 'X', user: null, postSignoutContext: ctx }, h.d);
    expect(h.audit[0].detail).toMatch(/post-sign-out change, reason psbc-coding-error: "Wrong base code"$/);
    expect(h.saved[0].postSignoutChangeReasonId ?? h.saved[0].postSignoutContext?.reasonId).toBe('psbc-coding-error');
  });
});

describe('auditBillingSuggestionDeclined', () => {
  it('names the stain, and the replacement for an override', async () => {
    const h = deps();
    await auditBillingSuggestionDeclined({ caseData, specimenId: 'A', blockId: 'b1', code: '88342', stainOrderId: 's1', replacedWith: '88341', user: { name: 'U' } }, h.d);
    expect(h.audit[0].detail).toBe('Ab1 (stain s1): 88342 overridden, not applied — replaced with 88341');
  });
});

describe('recordCaseCodeCorrection', () => {
  it('credits and rebills through the correction engine, and audits both ids', async () => {
    const h = deps({ findActiveCharge: async () => ({ ok: true, data: { id: 'chg-1' } as any }) });
    expect(await recordCaseCodeCorrection({ caseData, specimenId: 'A', oldCode: '88305', newCode: '88307', user: { id: 'u' } }, h.d)).toBe('corrected');
    expect(h.audit[0].detail).toBe('A: 88305 \u2192 88307 \u2014 real credit issued reversing charge chg-1, new charge chg-2 created');
  });
  it('a refusal from the engine records nothing; no charge on file is still audited', async () => {
    const refused = deps({ findActiveCharge: async () => ({ ok: true, data: { id: 'chg-1' } as any }), correctCharge: async () => ({ ok: false, notPermitted: true }) });
    expect(await recordCaseCodeCorrection({ caseData, specimenId: 'A', oldCode: 'X', newCode: 'Y', user: null }, refused.d)).toBe('notCorrected');
    expect(refused.audit).toEqual([]);
    const none = deps();
    expect(await recordCaseCodeCorrection({ caseData, specimenId: 'A', oldCode: 'X', newCode: 'Y', user: null }, none.d)).toBe('noChargeOnFile');
    expect(none.audit[0].event).toBe('Billing code corrected (no charge record found)');
  });
});
