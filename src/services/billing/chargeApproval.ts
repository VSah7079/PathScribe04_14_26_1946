// src/services/billing/chargeApproval.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 433: billing-office approval of charges (the "Opt-in Core" four-eyes
// step of the Billing Rules Engine specification). Pete: it's a permission
// for whoever does billing audits and corrections, and each facility approves
// access to its own billing.
//
//   • Whether a facility's charges need approval: set for the enterprise,
//     and each facility can override it (Facility.requireBillingApproval:
//     true, false, or unset = same as its enterprise). Off unless set.
//   • When it applies, a charge from sign-out (or a billing correction) waits
//     as PENDING_APPROVAL; the person who drafted it was the submitter.
//   • Approving, rejecting (with a reason), holding and releasing need
//     billing:charge:approve, checked against the charge's performing lab, so
//     a person's facility assignment limits whose billing they approve.
//     Nobody holds it by default; an administrator assigns it.
//   • Four-eyes: nobody approves or rejects a charge they drafted (the charge
//     service enforces it too).
//   • Approved charges go to the billing system with the next outbound sweep.
//
// Worked in Quality Assurance → Financials → Charges awaiting approval.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceChargeRecord } from '@/types/billing/ServiceChargeRecord';
import type { Facility } from '../facilities/IFacilityService';
import type { ServiceResult } from '../types';

export const CHARGE_APPROVE = 'billing:charge:approve';

type ApprovalFlag = Pick<Facility, 'requireBillingApproval'> | null | undefined;

/** Whether a facility's charges need approval: its own setting, else its enterprise's, else off (pure). */
export function resolveBillingApprovalRequired(lab: ApprovalFlag, enterprise: ApprovalFlag): boolean {
  if (typeof lab?.requireBillingApproval === 'boolean') return lab.requireBillingApproval;
  return enterprise?.requireBillingApproval === true;
}

/** Marks a new charge or credit as waiting for approval (pure). */
export function markAwaitingApproval(record: ServiceChargeRecord, draftedBy: string, now = new Date().toISOString()): ServiceChargeRecord {
  return { ...record, approvalStatus: 'PENDING_APPROVAL', draftedBy, draftedAt: now };
}

/** The statuses shown in the approval queue. */
export const AWAITING_APPROVAL_STATUSES: readonly NonNullable<ServiceChargeRecord['approvalStatus']>[] = ['PENDING_APPROVAL', 'HOLD'];

export interface ChargeAwaitingApproval {
  charge: ServiceChargeRecord;
  /** The performing lab whose billing this is (the permission is checked against it). */
  facilityId: string | null;
  facilityName: string | null;
}

async function deps() {
  const [{ mockServiceChargeService }, { caseRouter }, { mockFacilityService }, { authorizationService }, { getSessionUser }, { resolveCasePerformingLab }] = await Promise.all([
    import('./mockServiceChargeService'),
    import('../cases/CaseRouter'),
    import('../facilities/mockFacilityService'),
    import('../authorization/defaultAuthorizationService'),
    import('../auth/caseAccessControl'),
    import('../facilities/resolveCasePerformingLab'),
  ]);
  return { charges: mockServiceChargeService, caseRouter, facilityService: mockFacilityService, authorizationService, getSessionUser, resolveCasePerformingLab };
}

/** The performing lab of a charge's case (null when it can't be resolved).
 *  Batch 434: legacy tenant ids resolve too (facilities/resolveCasePerformingLab.ts). */
async function chargeFacility(caseId: string, d: Awaited<ReturnType<typeof deps>>): Promise<{ id: string | null; name: string | null }> {
  const c = await d.caseRouter.getCase(caseId).catch(() => undefined);
  const all = await d.facilityService.getAll();
  const lab = d.resolveCasePerformingLab(c as { originHospitalId?: string } | undefined, all.ok ? all.data : []);
  return { id: lab?.id ?? null, name: lab?.name ?? null };
}

/** Charges waiting for approval (or on hold), oldest first, with their lab. */
export async function listChargesAwaitingApproval(): Promise<ChargeAwaitingApproval[]> {
  const d = await deps();
  const res = await d.charges.listByApprovalStatus(AWAITING_APPROVAL_STATUSES);
  if (!res.ok) return [];
  const rows: ChargeAwaitingApproval[] = [];
  for (const charge of res.data) {
    const f = await chargeFacility(charge.caseId, d);
    rows.push({ charge, facilityId: f.id, facilityName: f.name });
  }
  return rows.sort((a, b) => (a.charge.draftedAt ?? '').localeCompare(b.charge.draftedAt ?? ''));
}

export type Decision = 'approve' | 'reject' | 'hold' | 'release';

/** Approves, rejects, holds or releases a charge. Needs billing:charge:approve for the charge's lab. */
export async function decideCharge(chargeId: string, decision: Decision, reason?: string): Promise<ServiceResult<ServiceChargeRecord>> {
  const d = await deps();
  const all = await d.charges.listByApprovalStatus(AWAITING_APPROVAL_STATUSES);
  const charge = all.ok ? all.data.find(c => c.id === chargeId) : undefined;
  if (!charge) return { ok: false, error: 'NOT_FOUND' };
  const facility = await chargeFacility(charge.caseId, d);
  // Batch 434: a charge whose lab can't be worked out is refused, rather than
  // checked with no facility (which let anyone holding the permission act on it).
  if (!facility.id) return { ok: false, error: 'LAB_UNKNOWN' };
  const allowed = await d.authorizationService.enforce('billing:charge:approve', { caseId: charge.caseId, facilityId: facility.id });
  if (!allowed.allowed) return { ok: false, error: 'NOT_PERMITTED' };
  const me = d.getSessionUser()?.id ?? 'unknown';
  if ((decision === 'approve' || decision === 'reject') && isOwnDraft(charge, me)) return { ok: false, error: 'OWN_DRAFT' };
  if (decision === 'reject' && !reason?.trim()) return { ok: false, error: 'REASON_REQUIRED' };
  switch (decision) {
    case 'approve': return d.charges.approveCharge(chargeId, me);
    case 'reject':  return d.charges.rejectCharge(chargeId, me, reason!.trim());
    case 'hold':    return d.charges.holdCharge(chargeId, me);
    case 'release': return d.charges.releaseHold(chargeId, me);
  }
}

/** Four-eyes: whether this person drafted the charge, so can't approve or reject it (pure). */
export function isOwnDraft(charge: Pick<ServiceChargeRecord, 'draftedBy'>, userId: string | null | undefined): boolean {
  return !!userId && charge.draftedBy === userId;
}

/** The decisions offered for a charge in the queue (pure). */
export function decisionsFor(charge: Pick<ServiceChargeRecord, 'approvalStatus'>): Decision[] {
  return charge.approvalStatus === 'HOLD' ? ['release'] : ['approve', 'reject', 'hold'];
}

/** The facility editor's "Charges need billing approval" choice. An enterprise is on or off;
 *  a lab can also follow its enterprise ('inherit', stored as unset). */
export type BillingApprovalChoice = 'inherit' | 'on' | 'off';

/** The choices a facility offers (pure). */
export function billingApprovalChoices(isEnterprise: boolean | undefined): BillingApprovalChoice[] {
  return isEnterprise ? ['on', 'off'] : ['inherit', 'on', 'off'];
}

/** The facility's current choice (pure). */
export function billingApprovalChoice(f: Pick<Facility, 'requireBillingApproval' | 'isEnterprise'>): BillingApprovalChoice {
  if (f.requireBillingApproval === true) return 'on';
  if (f.requireBillingApproval === false || f.isEnterprise) return 'off';
  return 'inherit';
}

/** What a choice stores (pure). */
export function requireBillingApprovalFor(choice: BillingApprovalChoice): boolean | undefined {
  return choice === 'inherit' ? undefined : choice === 'on';
}
