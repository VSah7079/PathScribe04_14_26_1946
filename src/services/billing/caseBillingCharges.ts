// src/services/billing/caseBillingCharges.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 460: the charge and credit behind each billing review change, moved
// here from SynopticReportPage.tsx (recordChargeTransaction /
// recordCreditTransaction) so the Cytology Workspace and Microtomy record
// them exactly as the report page does.
//
// • enforceBillingReview: billing:applied-code:review for the case (Pete,
//   Batch 460). Asked before any change; a refusal changes nothing.
// • recordCaseCharge: resolves the code against the Billing Dictionary for
//   the specimen's date of service (Date Collected, else Date Received; never
//   "now": with neither, the charge is withheld and audited), waits for
//   billing approval when the lab requires it, saves, audits.
// • recordCaseCredit: reverses the active charge for that source exactly (no
//   re-resolution); with no charge on file, the removal is still audited.
//
// Audit detail text stays literal English (compliance records).
// ─────────────────────────────────────────────────────────────────────────────

import type { BillingRuleVersion } from '@/types/billing/BillingRuleVersion';
import type { ServiceChargeRecord } from '@/types/billing/ServiceChargeRecord';
import type { ServiceResult } from '../types';
import { resolveServiceCharge, reverseServiceCharge, type PostSignoutChangeContext } from './resolveServiceCharge';
import { markAwaitingApproval } from './chargeApproval';
import { resolveRequireBillingApprovalForCase } from './shouldRequireBillingApproval';
import { billingRuleService } from './billingRuleServiceInstance';
import { serviceChargeService } from './serviceChargeServiceInstance';
import { mockAuditService } from '../auditlog/mockAuditService';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { correctServiceCharge } from './correctServiceCharge';


export interface CaseBillingChargeDeps {
  enforce: (capability: string, context: { caseId?: string | null; facilityId?: string | null }) => Promise<{ allowed: boolean }>;
  getBillingRules: () => Promise<ServiceResult<BillingRuleVersion[]>>;
  saveCharge: (record: ServiceChargeRecord) => Promise<unknown>;
  findActiveCharge: (caseId: string, specimenId: string | undefined, blockId: string | undefined, code: string) => Promise<ServiceResult<ServiceChargeRecord | null>>;
  requiresApproval: (originHospitalId: string | undefined) => Promise<boolean>;
  logAudit: (entry: { type: 'user'; event: string; detail: string; user: string; caseId: string | null; confidence: null }) => unknown;
  correctCharge: (caseId: string, chargeId: string, newCode: string, by: string, ctx?: PostSignoutChangeContext) => Promise<{ ok: true; data: { original: ServiceChargeRecord; corrected: ServiceChargeRecord } } | { ok: false; error?: string; notPermitted?: boolean }>;
}

export const caseBillingChargeDeps: CaseBillingChargeDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability, context),
  getBillingRules: () => billingRuleService.getAll(),
  saveCharge: record => serviceChargeService.saveCharge(record),
  findActiveCharge: (caseId, specimenId, blockId, code) => serviceChargeService.findActiveChargeForSource(caseId, specimenId, blockId, code),
  requiresApproval: originHospitalId => resolveRequireBillingApprovalForCase(originHospitalId),
  logAudit: entry => mockAuditService.logEvent(entry as any),
  correctCharge: (caseId, chargeId, newCode, by, ctx) => correctServiceCharge(caseId, chargeId, newCode, by, ctx) as any,
};

export interface BillingActor { id?: string; name?: string }
type CaseForCharges = { id?: string; originHospitalId?: string; accession?: { fullAccession?: string }; order?: { facilityId?: string }; specimens?: any[] };

const who = (user: BillingActor | null | undefined) => user?.name ?? user?.id ?? 'unknown';
const caseRef = (c: CaseForCharges) => c.accession?.fullAccession ?? c.id ?? null;
const postSignoutNote = (ctx?: PostSignoutChangeContext) =>
  (ctx ? ` — post-sign-out change, reason ${ctx.reasonId}: "${ctx.comment}"` : '');

/** billing:applied-code:review for this case (facility scope). */
export async function enforceBillingReview(caseData: CaseForCharges, deps: CaseBillingChargeDeps = caseBillingChargeDeps): Promise<boolean> {
  const decision = await deps.enforce('billing:applied-code:review', { caseId: caseData.id ?? null, facilityId: caseData.order?.facilityId ?? null });
  return decision.allowed;
}

/** The label the ledger and audit use for a source: specimen, or specimen + block. */
export function billingSourceLabel(caseData: CaseForCharges, specimenId: string, blockId?: string): string {
  const sp = caseData.specimens?.find(s => s.id === specimenId);
  const block = blockId ? sp?.blocks?.find((b: any) => b.id === blockId) : undefined;
  return block ? `${sp?.label ?? ''}${block.label}` : (sp?.label ?? specimenId);
}

export type CaseChargeOutcome = 'charged' | 'withheldNoDate' | 'noRule' | 'notCharged';

export async function recordCaseCharge(
  input: { caseData: CaseForCharges; specimenId: string; blockId?: string; code: string; user: BillingActor | null | undefined; postSignoutContext?: PostSignoutChangeContext },
  deps: CaseBillingChargeDeps = caseBillingChargeDeps,
): Promise<CaseChargeOutcome> {
  const { caseData, specimenId, blockId, code, user, postSignoutContext } = input;
  const sp = caseData.specimens?.find(s => s.id === specimenId);
  if (!caseData.id || !sp) return 'notCharged';
  const block = blockId ? sp.blocks?.find((b: any) => b.id === blockId) : undefined;
  const sourceLabel = block ? `${sp.label}${block.label}` : sp.label;

  const dateOfService = sp.collectedAt ?? sp.receivedAt;
  if (!dateOfService) {
    await deps.logAudit({
      type: 'user',
      event: 'Billing code NOT charged — pre-analytic date unresolved',
      detail: `${sourceLabel}: ${code} withheld — neither Date Collected nor Date Received is available (administrative override in effect). See open Pre-Analytic Date deficiency for this specimen.`,
      user: who(user), caseId: caseRef(caseData), confidence: null,
    });
    return 'withheldNoDate';
  }

  const rules = await deps.getBillingRules();
  if (rules.ok === false) return 'notCharged';
  const charge = resolveServiceCharge(code, rules.data, {
    caseId: caseData.id,
    sourceLevel: blockId ? 'block' : 'specimen',
    sourceLabel,
    specimenId,
    blockId,
    dateOfService,
    resolvedBy: user?.id ?? 'unknown',
    postSignoutContext,
  });
  if (!charge) return 'noRule'; // no active dictionary rule for this code and date: never invented
  const toSave = (await deps.requiresApproval(caseData.originHospitalId)) ? markAwaitingApproval(charge, user?.id ?? 'unknown') : charge;
  await deps.saveCharge(toSave);
  await deps.logAudit({
    type: 'user',
    event: 'Billing code charged',
    detail: `${charge.sourceLabel}: ${charge.billingCode} (${charge.cptCode}) charged${postSignoutNote(postSignoutContext)}`,
    user: who(user), caseId: caseRef(caseData), confidence: null,
  });
  return 'charged';
}

export async function recordCaseCredit(
  input: { caseData: CaseForCharges; specimenId: string; blockId?: string; code: string; user: BillingActor | null | undefined; postSignoutContext?: PostSignoutChangeContext },
  deps: CaseBillingChargeDeps = caseBillingChargeDeps,
): Promise<'credited' | 'noChargeOnFile' | 'notCredited'> {
  const { caseData, specimenId, blockId, code, user, postSignoutContext } = input;
  if (!caseData.id) return 'notCredited';
  const active = await deps.findActiveCharge(caseData.id, specimenId, blockId, code);
  const sourceLabel = billingSourceLabel(caseData, specimenId, blockId);
  if (active.ok && active.data) {
    const credit = reverseServiceCharge(active.data, user?.id ?? 'unknown', undefined, postSignoutContext);
    const toSave = (await deps.requiresApproval(caseData.originHospitalId)) ? markAwaitingApproval(credit, user?.id ?? 'unknown') : credit;
    await deps.saveCharge(toSave);
    await deps.logAudit({
      type: 'user',
      event: 'Billing code credited',
      detail: `${sourceLabel}: ${code} (${credit.cptCode}) removed - real credit issued reversing charge ${active.data.id}${postSignoutNote(postSignoutContext)}`,
      user: who(user), caseId: caseRef(caseData), confidence: null,
    });
    return 'credited';
  }
  await deps.logAudit({
    type: 'user',
    event: 'Billing code removed (no charge record found)',
    detail: `${sourceLabel}: ${code} removed - no matching real charge record found to credit${postSignoutNote(postSignoutContext)}`,
    user: who(user), caseId: caseRef(caseData), confidence: null,
  });
  return 'noChargeOnFile';
}

/** A declined suggestion: nothing was charged, so only the decision is audited. */
export async function auditBillingSuggestionDeclined(
  input: { caseData: CaseForCharges; specimenId: string; blockId: string; code: string; stainOrderId?: string; replacedWith?: string; user: BillingActor | null | undefined; postSignoutContext?: PostSignoutChangeContext },
  deps: CaseBillingChargeDeps = caseBillingChargeDeps,
): Promise<void> {
  const { caseData, specimenId, blockId, code, stainOrderId, replacedWith, user, postSignoutContext } = input;
  await deps.logAudit({
    type: 'user',
    event: 'AI billing suggestion overridden',
    detail: `${specimenId}${blockId}${stainOrderId ? ` (stain ${stainOrderId})` : ''}: ${code} overridden, not applied${replacedWith ? ` — replaced with ${replacedWith}` : ''}${replacedWith ? postSignoutNote(postSignoutContext) : ''}`,
    user: who(user), caseId: caseRef(caseData), confidence: null,
  });
}

/** Correcting an applied code: the active charge is credited and the new code
 *  billed (correctServiceCharge, which checks billing:applied-code:correct
 *  again). With no charge on file, the correction is still audited. */
export async function recordCaseCodeCorrection(
  input: { caseData: CaseForCharges; specimenId: string; blockId?: string; oldCode: string; newCode: string; user: BillingActor | null | undefined; postSignoutContext?: PostSignoutChangeContext },
  deps: CaseBillingChargeDeps = caseBillingChargeDeps,
): Promise<'corrected' | 'noChargeOnFile' | 'notCorrected'> {
  const { caseData, specimenId, blockId, oldCode, newCode, user, postSignoutContext } = input;
  if (!caseData.id) return 'notCorrected';
  const active = await deps.findActiveCharge(caseData.id, specimenId, blockId, oldCode);
  const sourceLabel = billingSourceLabel(caseData, specimenId, blockId);
  if (active.ok && active.data) {
    const res = await deps.correctCharge(caseData.id, active.data.id, newCode, user?.id ?? 'unknown', postSignoutContext);
    if (res.ok === false) return 'notCorrected';
    await deps.logAudit({
      type: 'user',
      event: 'Billing code corrected',
      detail: `${sourceLabel}: ${oldCode} \u2192 ${newCode} \u2014 real credit issued reversing charge ${res.data.original.id}, new charge ${res.data.corrected.id} created${postSignoutNote(postSignoutContext)}`,
      user: who(user), caseId: caseRef(caseData), confidence: null,
    });
    return 'corrected';
  }
  await deps.logAudit({
    type: 'user',
    event: 'Billing code corrected (no charge record found)',
    detail: `${sourceLabel}: ${oldCode} \u2192 ${newCode} \u2014 no matching real charge record found to credit`,
    user: who(user), caseId: caseRef(caseData), confidence: null,
  });
  return 'noChargeOnFile';
}
