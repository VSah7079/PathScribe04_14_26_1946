// @vitest-environment happy-dom
// Batch 433: the one billing correction engine (Pete: credit/rebill, reason
// required, audited, no need to open the case, with or without a deficiency).
import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({
  allowed: { current: true },
  asked: [] as Array<[string, unknown]>,
  needsApproval: { current: false },
  audit: [] as Array<{ event: string; detail: string; caseId?: string }>,
  updates: [] as Array<[string, unknown]>,
  /** PS-71: when set, a versioned case store (getCase/updateCase use it). */
  store: { current: null as any },
  beforeSave: [] as Array<() => void>,
}));
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: vi.fn(async (capability: string, context: unknown) => {
      h.asked.push([capability, context]);
      return { capability, allowed: h.allowed.current, grantedBy: [], missingRequirements: [], context: {} };
    }),
  },
}));
vi.mock('../cases/CaseRouter', () => ({
  caseRouter: {
    getCase: vi.fn(async (id: string) => h.store.current ? structuredClone(h.store.current) : (id === 'CASE-B433' ? {
      id, status: 'finalized', originHospitalId: 'FAC-1',
      specimens: [{ id: 'sp-1', label: 'A', collectedAt: '2026-08-01T00:00:00.000Z', blocks: [{ id: 'blk-1', label: '1' }] }, { id: 'sp-2', label: 'B' }],
    } : undefined)),
    updateCase: vi.fn(async (id: string, updates: unknown, expectedVersion?: number) => {
      h.updates.push([id, updates]);
      if (!h.store.current) return;
      h.beforeSave.splice(0).forEach(f => f());
      const v = h.store.current.version ?? 0;
      if (expectedVersion !== v) {
        const { ConcurrencyConflictError } = await import('../cases/ConcurrencyConflictError');
        throw new ConcurrencyConflictError(id, expectedVersion ?? -1, v);
      }
      h.store.current = { ...h.store.current, ...(updates as object), version: v + 1 };
    }),
  },
}));
vi.mock('./shouldRequireBillingApproval', () => ({ resolveRequireBillingApprovalForCase: vi.fn(async () => h.needsApproval.current) }));
vi.mock('../auth/caseAccessControl', () => ({ getSessionUser: () => ({ id: 'billing-1', firstName: 'Bea', lastName: 'Biller' }) }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent: vi.fn(async (e: { event: string; detail: string; caseId?: string }) => { h.audit.push(e); }) } }));

import { activeCharges, applyBillingCorrection, applyCorrectionToSpecimens, planBillingCorrection } from './billingCorrection';
import { mockServiceChargeService } from './mockServiceChargeService';
import { mockBillingDeficiencyService } from './mockBillingDeficiencyService';
import type { ServiceChargeRecord } from '@/types/billing/ServiceChargeRecord';
import type { BillingRuleVersion } from '@/types/billing/BillingRuleVersion';

const charge = (id: string, extra: Partial<ServiceChargeRecord> = {}): ServiceChargeRecord => ({
  id, caseId: 'CASE-B433', transactionType: 'charge', sourceLevel: 'specimen', sourceLabel: 'A', specimenId: 'sp-1',
  billingCode: '88307', cptCode: '88307', level: 'specimen', billingType: 'Global',
  ruleVersion: 1, resolvedAt: '2026-08-01T00:00:00.000Z', resolvedBy: 'system', ...extra,
} as ServiceChargeRecord);

const rule = { billingCode: 'IHC-ADDL', version: 1, effectiveFrom: '2026-01-01T00:00:00.000Z', effectiveTo: null, status: 'ACTIVE', level: 'block', billingType: 'Global', cpt: '88342', description: 'IHC, each additional' } as unknown as BillingRuleVersion;
const ctx = { caseRecord: { id: 'CASE-B433', specimens: [{ id: 'sp-1', label: 'A', collectedAt: '2026-08-01T00:00:00.000Z', blocks: [{ id: 'blk-1', label: '1' }] }, { id: 'sp-2', label: 'B' }] }, ruleVersions: [rule], by: 'billing-1', at: '2026-09-01T10:00:00.000Z' };
const reason = { reasonId: 'psbc-clerical-error', comment: 'Wrong code applied.' };

describe('planBillingCorrection (pure)', () => {
  it('changing the code credits the charge and makes a new one with the corrected code', () => {
    const p = planBillingCorrection({ kind: 'changeCode', chargeId: 'c1', newCptCode: '88305' }, [charge('c1')], ctx);
    expect(p.ok).toBe(true);
    if (p.ok === false) return;
    expect(p.credit).toMatchObject({ transactionType: 'credit', reversesTransactionId: 'c1' });
    expect(p.charge).toMatchObject({ transactionType: 'charge', cptCode: '88305' });
  });

  it('refuses a "change" to the same code, and a charge that is already reversed or missing', () => {
    expect(planBillingCorrection({ kind: 'changeCode', chargeId: 'c1', newCptCode: '88307' }, [charge('c1')], ctx)).toEqual({ ok: false, error: 'NO_CHANGE' });
    const reversed = [charge('c1'), charge('cr', { transactionType: 'credit', reversesTransactionId: 'c1' })];
    expect(activeCharges(reversed).map(c => c.id)).toEqual([]);
    expect(planBillingCorrection({ kind: 'reverse', chargeId: 'c1' }, reversed, ctx)).toEqual({ ok: false, error: 'CHARGE_ALREADY_REVERSED' });
    expect(planBillingCorrection({ kind: 'reverse', chargeId: 'nope' }, [charge('c1')], ctx)).toEqual({ ok: false, error: 'CHARGE_NOT_FOUND' });
  });

  it('the credit and the new charge don’t inherit the original’s approval (who approved it, a hold)', () => {
    const approved = charge('c1', { approvalStatus: 'APPROVED', approvedBy: 'someone', approvedAt: '2026-08-02T00:00:00.000Z', draftedBy: 'drafter' });
    const p = planBillingCorrection({ kind: 'changeCode', chargeId: 'c1', newCptCode: '88305' }, [approved], ctx);
    for (const r of [p.ok && p.credit, p.ok && p.charge]) {
      expect(r).toBeTruthy();
      expect(r && [r.approvalStatus, r.approvedBy, r.approvedAt, r.draftedBy]).toEqual([undefined, undefined, undefined, undefined]);
    }
  });

  it('reversing makes only a credit; changing the modifier keeps the code', () => {
    const r = planBillingCorrection({ kind: 'reverse', chargeId: 'c1' }, [charge('c1')], ctx);
    expect(r.ok && r.credit && !r.charge).toBe(true);
    const m = planBillingCorrection({ kind: 'changeModifier', chargeId: 'c1', newModifier: '26' }, [charge('c1')], ctx);
    expect(m.ok && m.charge).toMatchObject({ cptCode: '88307', modifier: '26' });
    expect(planBillingCorrection({ kind: 'changeModifier', chargeId: 'c1', newModifier: '' }, [charge('c1')], ctx)).toEqual({ ok: false, error: 'NO_CHANGE' });
  });

  it('adding a missing charge resolves the code against the Billing Dictionary for the date of service', () => {
    const p = planBillingCorrection({ kind: 'addMissing', specimenId: 'sp-1', blockId: 'blk-1', billingCode: 'IHC-ADDL' }, [], ctx);
    expect(p.ok && p.charge).toMatchObject({ cptCode: '88342', sourceLevel: 'block', blockId: 'blk-1', transactionType: 'charge' });
    expect(planBillingCorrection({ kind: 'addMissing', specimenId: 'sp-9', billingCode: 'IHC-ADDL' }, [], ctx)).toEqual({ ok: false, error: 'SPECIMEN_NOT_FOUND' });
    expect(planBillingCorrection({ kind: 'addMissing', specimenId: 'sp-2', billingCode: 'IHC-ADDL' }, [], ctx)).toEqual({ ok: false, error: 'NO_DATE_OF_SERVICE' });
    expect(planBillingCorrection({ kind: 'addMissing', specimenId: 'sp-1', billingCode: 'UNKNOWN' }, [], ctx)).toEqual({ ok: false, error: 'NO_ACTIVE_RULE' });
  });
});

describe('applyBillingCorrection', () => {
  // The charge ledger persists between tests (append-only), so each test
  // corrects a charge of its own.
  let n = 0;
  let id = '';
  beforeEach(async () => {
    id = `chg-b433-${++n}`;
    h.allowed.current = true;
    h.asked.length = 0;
    h.needsApproval.current = false;
    h.audit.length = 0;
    h.updates.length = 0;
    h.store.current = null; h.beforeSave.length = 0;
    localStorage.clear();
    await mockServiceChargeService.saveCharge(charge(id));
  });

  it('needs billing:applied-code:correct for the case; refused, nothing changes', async () => {
    h.allowed.current = false;
    const res = await applyBillingCorrection({ caseId: 'CASE-B433', correction: { kind: 'reverse', chargeId: id }, reason });
    expect(res).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(h.asked).toEqual([['billing:applied-code:correct', { caseId: 'CASE-B433' }]]);
    const after = await mockServiceChargeService.getChargesForCase('CASE-B433');
    expect(after.ok && after.data.filter(c => c.reversesTransactionId === id)).toEqual([]);
  });

  it('PS-71 (Batch 458): the case coding is corrected on the newest case, so a change saved in between is kept', async () => {
    h.store.current = { id: 'CASE-B433', version: 7, status: 'finalized', originHospitalId: 'FAC-1', specimens: [{ id: 'sp-1', label: 'A', coding: { cpt: ['88307'] } }, { id: 'sp-2', label: 'B' }] };
    h.beforeSave.push(() => {
      h.store.current = { ...h.store.current, version: 8, specimens: [h.store.current.specimens[0], { id: 'sp-2', label: 'B', description: 'theirs' }] };
    });
    const res = await applyBillingCorrection({ caseId: 'CASE-B433', correction: { kind: 'changeCode', chargeId: id, newCptCode: '88305' }, reason });
    expect(res.ok).toBe(true);
    expect(h.store.current.version).toBe(9);
    expect(h.store.current.specimens[0].coding.cpt).toEqual(['88305']);
    expect(h.store.current.specimens[1].description).toBe('theirs');
    expect(h.audit[0].detail).not.toContain('case coding not updated');
  });

  it('PS-71 (Batch 458): a case-coding save that never lands is said so in the audit, never forced through', async () => {
    h.store.current = { id: 'CASE-B433', version: 1, status: 'finalized', specimens: [{ id: 'sp-1', label: 'A', coding: { cpt: ['88307'] } }] };
    const { caseRouter } = await import('../cases/CaseRouter');
    const impl = vi.mocked(caseRouter.updateCase).getMockImplementation()!;
    vi.mocked(caseRouter.updateCase).mockImplementation(async (cid: string, u: unknown, v?: number) => {
      h.updates.push([cid, u]);
      const { ConcurrencyConflictError } = await import('../cases/ConcurrencyConflictError');
      throw new ConcurrencyConflictError(cid, v ?? -1, (v ?? 0) + 1);
    });
    const res = await applyBillingCorrection({ caseId: 'CASE-B433', correction: { kind: 'changeCode', chargeId: id, newCptCode: '88305' }, reason });
    vi.mocked(caseRouter.updateCase).mockImplementation(impl);
    expect(res.ok).toBe(true);
    expect(h.store.current.specimens[0].coding.cpt).toEqual(['88307']);
    expect(h.audit[0].detail).toContain('case coding not updated');
  });

  it('needs a reason and a comment', async () => {
    expect(await applyBillingCorrection({ caseId: 'CASE-B433', correction: { kind: 'reverse', chargeId: id } })).toEqual({ ok: false, error: 'REASON_REQUIRED' });
    expect(await applyBillingCorrection({ caseId: 'CASE-B433', correction: { kind: 'reverse', chargeId: id }, reason: { reasonId: 'x', comment: '  ' } })).toEqual({ ok: false, error: 'REASON_REQUIRED' });
  });

  it('"Start correction" (no deficiency) records a resolved post-sign-out correction and an audit entry', async () => {
    const res = await applyBillingCorrection({ caseId: 'CASE-B433', correction: { kind: 'changeCode', chargeId: id, newCptCode: '88305' }, reason });
    expect(res.ok).toBe(true);
    if (res.ok === false) return;
    const defs = await mockBillingDeficiencyService.getAll();
    const rec = defs.ok ? defs.data.find(d => d.id === res.data.deficiencyId) : undefined;
    expect(rec).toMatchObject({ deficiencyType: 'POST_SIGNOUT_CORRECTION', raisedByTrigger: 'MANUAL_BILLING_CORRECTION', status: 'RESOLVED', resolutionReasonCode: 'CODE_CORRECTED', chargeRecordId: id });
    expect(h.audit).toHaveLength(1);
    expect(h.audit[0]).toMatchObject({ event: 'Billing correction', caseId: 'CASE-B433' });
    expect(h.audit[0].detail).toContain(`88307 → 88305 (charge ${id} credited`);
    expect(h.audit[0].detail).toContain('Wrong code applied.');
    // Batch 434: the seeded case shows no 88307 on sp-1, so its coding is left alone.
    expect(h.updates).toEqual([]);
  });

  it('resolves the deficiency it came from (a reversal resolves as charge reversed)', async () => {
    const raised = await mockBillingDeficiencyService.raise({ caseId: 'CASE-B433', chargeRecordId: id, deficiencyType: 'UNSUPPORTED_CPT_LEVEL', severity: 'COMPLIANCE_WARNING', raisedByTrigger: 'MANUAL_BILLING_AUDIT', auditorNotes: 'n', createdBy: 'qa' } as never);
    if (!raised.ok) throw new Error('raise failed');
    const res = await applyBillingCorrection({ caseId: 'CASE-B433', correction: { kind: 'reverse', chargeId: id }, reason, deficiencyId: raised.data.id });
    expect(res).toMatchObject({ ok: true });
    expect(res.ok && res.data.deficiencyId).toBe(raised.data.id);
    const defs = await mockBillingDeficiencyService.getAll();
    expect(defs.ok && defs.data.find(d => d.id === raised.data.id)).toMatchObject({ status: 'RESOLVED', resolutionReasonCode: 'CHARGE_REVERSED' });
    expect(defs.ok && defs.data.filter(d => d.chargeRecordId === id)).toHaveLength(1);
  });

  it('when the lab requires billing approval, the credit and the new charge wait for approval', async () => {
    h.needsApproval.current = true;
    const res = await applyBillingCorrection({ caseId: 'CASE-B433', correction: { kind: 'changeCode', chargeId: id, newCptCode: '88305' }, reason });
    expect(res.ok && res.data.credit).toMatchObject({ approvalStatus: 'PENDING_APPROVAL', draftedBy: 'billing-1' });
    expect(res.ok && res.data.charge).toMatchObject({ approvalStatus: 'PENDING_APPROVAL', draftedBy: 'billing-1' });
    expect(h.audit[0].detail).toContain('awaiting billing approval');
  });

  it('adds a missing charge without opening the case', async () => {
    const res = await applyBillingCorrection({ caseId: 'CASE-B433', correction: { kind: 'addMissing', specimenId: 'sp-2', billingCode: 'X' }, reason });
    expect(res).toEqual({ ok: false, error: 'NO_DATE_OF_SERVICE' });
  });
});

describe('Batch 434: the case’s own coding follows the correction', () => {
  const specimens = [
    { id: 'sp-1', coding: { cpt: ['88307', 'IHC-ADDL'] }, blocks: [{ id: 'blk-1', coding: { cpt: [{ code: 'IHC-FIRST', stainOrderId: 'st-1' }] } }] },
    { id: 'sp-2', coding: { cpt: ['88305'] } },
  ];
  it('changes, removes or adds the code at the charge’s source', () => {
    const changed = applyCorrectionToSpecimens(specimens, { kind: 'changeCode', chargeId: 'c', newCptCode: '88305' }, { specimenId: 'sp-1', billingCode: '88307' });
    expect(changed?.[0].coding?.cpt).toEqual(['88305', 'IHC-ADDL']);
    const reversed = applyCorrectionToSpecimens(specimens, { kind: 'reverse', chargeId: 'c' }, { specimenId: 'sp-1', blockId: 'blk-1', billingCode: 'IHC-FIRST' });
    expect(reversed?.[0].blocks?.[0].coding?.cpt).toEqual([]);
    const added = applyCorrectionToSpecimens(specimens, { kind: 'addMissing', specimenId: 'sp-1', blockId: 'blk-1', billingCode: 'IHC-ADDL' });
    expect(added?.[0].blocks?.[0].coding?.cpt).toEqual([{ code: 'IHC-FIRST', stainOrderId: 'st-1' }, { code: 'IHC-ADDL' }]);
    const blockChange = applyCorrectionToSpecimens(specimens, { kind: 'changeCode', chargeId: 'c', newCptCode: 'IHC-ADDL' }, { specimenId: 'sp-1', blockId: 'blk-1', billingCode: 'IHC-FIRST' });
    expect(blockChange?.[0].blocks?.[0].coding?.cpt).toEqual([{ code: 'IHC-ADDL', stainOrderId: 'st-1' }]);
  });
  it('nothing for a modifier change or a code the case doesn’t show', () => {
    expect(applyCorrectionToSpecimens(specimens, { kind: 'changeModifier', chargeId: 'c', newModifier: '26' }, { specimenId: 'sp-1', billingCode: '88307' })).toBeNull();
    expect(applyCorrectionToSpecimens(specimens, { kind: 'reverse', chargeId: 'c' }, { specimenId: 'sp-2', billingCode: '99999' })).toBeNull();
  });
});
