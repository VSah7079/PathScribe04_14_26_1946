// @vitest-environment happy-dom
// Batch 433: billing approval of charges (Pete: a permission for whoever does
// billing audits; each facility approves its own billing; enterprise setting
// with facility overrides).
import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ allowed: { current: true }, asked: [] as Array<[string, unknown]>, me: { current: 'approver-1' } }));
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: vi.fn(async (capability: string, context: unknown) => {
      h.asked.push([capability, context]);
      return { capability, allowed: h.allowed.current, grantedBy: [], missingRequirements: [], context: {} };
    }),
  },
}));
vi.mock('../cases/CaseRouter', () => ({ caseRouter: { getCase: vi.fn(async (id: string) => (id === 'CASE-APP' ? { id, originHospitalId: 'HOSP-002' } : undefined)) } }));
vi.mock('../auth/caseAccessControl', () => ({ getSessionUser: () => ({ id: h.me.current }) }));

import {
  billingApprovalChoice, billingApprovalChoices, decideCharge, decisionsFor, isOwnDraft,
  listChargesAwaitingApproval, markAwaitingApproval, requireBillingApprovalFor, resolveBillingApprovalRequired,
} from './chargeApproval';
import { mockServiceChargeService } from './mockServiceChargeService';
import type { ServiceChargeRecord } from '@/types/billing/ServiceChargeRecord';

const charge = (id: string, extra: Partial<ServiceChargeRecord> = {}): ServiceChargeRecord => ({
  id, caseId: 'CASE-APP', transactionType: 'charge', sourceLevel: 'specimen', sourceLabel: 'A', specimenId: 'sp-1',
  billingCode: '88307', cptCode: '88307', level: 'specimen', billingType: 'Global',
  ruleVersion: 1, resolvedAt: '2026-08-01T00:00:00.000Z', resolvedBy: 'system', ...extra,
} as ServiceChargeRecord);

describe('whether charges need approval (enterprise setting, facility override)', () => {
  it('a lab’s own setting wins; unset follows the enterprise; off unless set', () => {
    expect(resolveBillingApprovalRequired({ requireBillingApproval: false }, { requireBillingApproval: true })).toBe(false);
    expect(resolveBillingApprovalRequired({ requireBillingApproval: true }, { requireBillingApproval: false })).toBe(true);
    expect(resolveBillingApprovalRequired({}, { requireBillingApproval: true })).toBe(true);
    expect(resolveBillingApprovalRequired({}, null)).toBe(false);
  });

  it('the facility editor: an enterprise is on or off, a lab can also follow its enterprise', () => {
    expect(billingApprovalChoices(true)).toEqual(['on', 'off']);
    expect(billingApprovalChoices(false)).toEqual(['inherit', 'on', 'off']);
    expect(billingApprovalChoice({ isEnterprise: true })).toBe('off');
    expect(billingApprovalChoice({})).toBe('inherit');
    expect(billingApprovalChoice({ requireBillingApproval: true })).toBe('on');
    expect(billingApprovalChoice({ requireBillingApproval: false })).toBe('off');
    expect(requireBillingApprovalFor('inherit')).toBeUndefined();
    expect(requireBillingApprovalFor('on')).toBe(true);
    expect(requireBillingApprovalFor('off')).toBe(false);
  });

  it('four-eyes and the decisions offered', () => {
    expect(isOwnDraft({ draftedBy: 'u1' }, 'u1')).toBe(true);
    expect(isOwnDraft({ draftedBy: 'u1' }, 'u2')).toBe(false);
    expect(isOwnDraft({ draftedBy: undefined }, undefined)).toBe(false);
    expect(decisionsFor({ approvalStatus: 'PENDING_APPROVAL' })).toEqual(['approve', 'reject', 'hold']);
    expect(decisionsFor({ approvalStatus: 'HOLD' })).toEqual(['release']);
  });
});

describe('deciding charges', () => {
  beforeEach(async () => {
    h.allowed.current = true;
    h.asked.length = 0;
    h.me.current = 'approver-1';
    localStorage.clear();
    await mockServiceChargeService.saveCharge(markAwaitingApproval(charge('chg-app-1'), 'drafter-1', '2026-09-01T00:00:00.000Z'));
  });

  it('lists the charges waiting for approval, with their lab (a legacy tenant id resolves too, Batch 434)', async () => {
    const rows = await listChargesAwaitingApproval();
    expect(rows.find(r => r.charge.id === 'chg-app-1')).toMatchObject({ facilityId: 'c-ent-dvmc', facilityName: 'Desert Valley Medical Center' });
  });

  it('Batch 434: a charge whose lab can’t be worked out is refused, not checked without a facility', async () => {
    await mockServiceChargeService.saveCharge(markAwaitingApproval(charge('chg-app-orphan', { caseId: 'CASE-NOWHERE' }), 'drafter-1'));
    expect(await decideCharge('chg-app-orphan', 'approve')).toEqual({ ok: false, error: 'LAB_UNKNOWN' });
    expect(h.asked).toEqual([]);
  });

  it('needs billing:charge:approve for the charge’s lab; refused, the charge still waits', async () => {
    h.allowed.current = false;
    expect(await decideCharge('chg-app-1', 'approve')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(h.asked).toEqual([['billing:charge:approve', { caseId: 'CASE-APP', facilityId: 'c-ent-dvmc' }]]);
    expect((await listChargesAwaitingApproval()).some(r => r.charge.id === 'chg-app-1')).toBe(true);
  });

  it('nobody approves or rejects a charge they drafted', async () => {
    h.me.current = 'drafter-1';
    expect(await decideCharge('chg-app-1', 'approve')).toEqual({ ok: false, error: 'OWN_DRAFT' });
    expect(await decideCharge('chg-app-1', 'reject', 'x')).toEqual({ ok: false, error: 'OWN_DRAFT' });
  });

  it('rejecting needs a reason; approving clears the charge for billing', async () => {
    expect(await decideCharge('chg-app-1', 'reject', '  ')).toEqual({ ok: false, error: 'REASON_REQUIRED' });
    const res = await decideCharge('chg-app-1', 'approve');
    expect(res.ok && res.data).toMatchObject({ approvalStatus: 'APPROVED', approvedBy: 'approver-1' });
  });

  it('hold and release', async () => {
    const held = await decideCharge('chg-app-1', 'hold');
    expect(held.ok && held.data.approvalStatus).toBe('HOLD');
    const released = await decideCharge('chg-app-1', 'release');
    expect(released.ok && released.data.approvalStatus).toBe('PENDING_APPROVAL');
  });
});
