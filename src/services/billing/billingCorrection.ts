// src/services/billing/billingCorrection.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 433: the one engine for correcting billing after sign-out (Pete: every
// correction uses the same credit/rebill engine, needs a reason, writes an
// audit entry, works without opening the case, for Orchestration and Assist
// cases, with or without a billing deficiency).
//
// Kinds of correction:
//   • change the code      → credit the charge, charge the corrected CPT
//   • change the modifier  → credit the charge, charge it with the new modifier
//   • reverse              → credit only (the charge shouldn't have been made)
//   • add a missing charge → resolve the billing code against the Billing
//                            Dictionary for the specimen's date of service
// Every correction:
//   • needs billing:applied-code:correct for the case (facility scope);
//   • needs a reason from the post-sign-out billing reason list and a comment
//     (the report page's own pre-sign-out edits pass none: that's drafting,
//     not a correction);
//   • waits for billing approval when the case's lab requires it
//     (chargeApproval.ts);
//   • writes one audit entry;
//   • resolves the billing deficiency it came from, or, when it started
//     without one ("Start correction"), records and resolves a new
//     POST_SIGNOUT_CORRECTION deficiency, so every correction has a record.
// The credit always copies the original exactly (resolveServiceCharge.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { updateCaseWithRetry } from '../cases/caseWrite';
import type { ServiceChargeRecord } from '@/types/billing/ServiceChargeRecord';
import type { BillingDeficiencyRecord } from '@/types/billing/BillingDeficiencyRecord';
import type { BillingRuleVersion } from '@/types/billing/BillingRuleVersion';
import { reverseServiceCharge, buildCorrectedServiceCharge, resolveServiceCharge, type PostSignoutChangeContext } from './resolveServiceCharge';
import { markAwaitingApproval } from './chargeApproval';

export type BillingCorrection =
  | { kind: 'changeCode'; chargeId: string; newCptCode: string }
  | { kind: 'changeModifier'; chargeId: string; newModifier: string }
  | { kind: 'reverse'; chargeId: string }
  | { kind: 'addMissing'; specimenId: string; blockId?: string; billingCode: string };

export type BillingCorrectionRefusal =
  | 'NOT_PERMITTED' | 'REASON_REQUIRED' | 'CHARGE_NOT_FOUND' | 'CHARGE_ALREADY_REVERSED'
  | 'NO_CHANGE' | 'SPECIMEN_NOT_FOUND' | 'NO_DATE_OF_SERVICE' | 'NO_ACTIVE_RULE' | 'SAVE_FAILED';

export interface BillingCorrectionResult {
  original?: ServiceChargeRecord;
  credit?: ServiceChargeRecord;
  charge?: ServiceChargeRecord;
  deficiencyId?: string;
}

/** A credit or new charge starts its own approval: nothing about the original's
 *  approval (who approved it, a hold, a rejection) carries over (pure). */
export function withoutApproval(record: ServiceChargeRecord): ServiceChargeRecord {
  const { approvalStatus: _s, approvedBy: _a, approvedAt: _t, approvedViaBreakGlass: _b, rejectionReason: _r, approvalStatusBeforeHold: _h, draftedBy: _d, draftedAt: _da, ...rest } = record;
  return rest as ServiceChargeRecord;
}

/** Charges on a case that haven't been reversed by a credit (pure). */
export function activeCharges(records: readonly ServiceChargeRecord[]): ServiceChargeRecord[] {
  const reversed = new Set(records.filter(r => r.transactionType === 'credit' && r.reversesTransactionId).map(r => r.reversesTransactionId!));
  return records.filter(r => r.transactionType === 'charge' && !reversed.has(r.id));
}

interface CaseForBilling {
  id: string;
  specimens?: { id: string; label?: string; collectedAt?: string; receivedAt?: string; blocks?: { id: string; label?: string }[] }[];
}

/** The records a correction creates, or why it can't be made (pure; tested). */
export function planBillingCorrection(
  correction: BillingCorrection,
  charges: readonly ServiceChargeRecord[],
  ctx: { caseRecord: CaseForBilling | null; ruleVersions: readonly BillingRuleVersion[]; by: string; at: string; reason?: PostSignoutChangeContext },
): { ok: true; original?: ServiceChargeRecord; credit?: ServiceChargeRecord; charge?: ServiceChargeRecord } | { ok: false; error: BillingCorrectionRefusal } {
  if (correction.kind === 'addMissing') {
    const sp = ctx.caseRecord?.specimens?.find(s => s.id === correction.specimenId);
    if (!sp) return { ok: false, error: 'SPECIMEN_NOT_FOUND' };
    const block = correction.blockId ? sp.blocks?.find(b => b.id === correction.blockId) : undefined;
    const dateOfService = sp.collectedAt ?? sp.receivedAt;
    if (!dateOfService) return { ok: false, error: 'NO_DATE_OF_SERVICE' };
    const sourceLabel = block ? `${sp.label ?? ''}${block.label ?? ''}` : (sp.label ?? sp.id);
    const resolved = resolveServiceCharge(correction.billingCode, [...ctx.ruleVersions], {
      caseId: ctx.caseRecord!.id, sourceLevel: block ? 'block' : 'specimen', sourceLabel,
      specimenId: sp.id, blockId: block?.id, dateOfService, resolvedBy: ctx.by, resolvedAt: ctx.at, postSignoutContext: ctx.reason,
    });
    if (!resolved) return { ok: false, error: 'NO_ACTIVE_RULE' };
    return { ok: true, charge: { ...resolved, id: `${resolved.id}-add-${Date.parse(ctx.at) || Date.now()}` } };
  }
  const original = charges.find(c => c.id === correction.chargeId && c.transactionType === 'charge');
  if (!original) return { ok: false, error: 'CHARGE_NOT_FOUND' };
  if (!activeCharges(charges).some(c => c.id === original.id)) return { ok: false, error: 'CHARGE_ALREADY_REVERSED' };
  const credit = withoutApproval(reverseServiceCharge(original, ctx.by, ctx.at, ctx.reason));
  if (correction.kind === 'reverse') return { ok: true, original, credit };
  if (correction.kind === 'changeCode') {
    const code = correction.newCptCode.trim();
    if (!code || code === original.cptCode) return { ok: false, error: 'NO_CHANGE' };
    return { ok: true, original, credit, charge: withoutApproval(buildCorrectedServiceCharge(original, code, ctx.by, ctx.at, ctx.reason)) };
  }
  const modifier = correction.newModifier.trim();
  if (modifier === (original.modifier ?? '')) return { ok: false, error: 'NO_CHANGE' };
  const charge = withoutApproval(buildCorrectedServiceCharge(original, original.cptCode, ctx.by, ctx.at, ctx.reason));
  return { ok: true, original, credit, charge: { ...charge, cptDescription: original.cptDescription, modifier: modifier || undefined } };
}

type CodedSpecimen = { id: string; coding?: { cpt?: string[] } & Record<string, unknown>; blocks?: { id: string; coding?: { cpt?: { code: string; stainOrderId?: string }[] } & Record<string, unknown> }[] } & Record<string, unknown>;

/** Batch 434: the case's own coding (what the case page shows) after a
 *  correction, so it agrees with the charge ledger. Before, a correction made
 *  from Quality Assurance changed only the ledger and the case kept showing the
 *  old code. Change code: the original's billing code becomes the new code at
 *  its source; reverse: one entry of it is removed; add missing: the billing
 *  code is added at the specimen or block; a modifier isn't part of the coding.
 *  Null when nothing changes (pure). */
export function applyCorrectionToSpecimens<S extends CodedSpecimen>(
  specimens: readonly S[],
  correction: BillingCorrection,
  original?: Pick<ServiceChargeRecord, 'specimenId' | 'blockId' | 'billingCode'>,
): S[] | null {
  if (correction.kind === 'changeModifier') return null;
  const specimenId = correction.kind === 'addMissing' ? correction.specimenId : original?.specimenId;
  const blockId = correction.kind === 'addMissing' ? correction.blockId : original?.blockId;
  if (!specimenId) return null;
  const oldCode = original?.billingCode;
  const edit = (codes: string[]): string[] | null => {
    if (correction.kind === 'addMissing') return [...codes, correction.billingCode];
    const i = oldCode ? codes.indexOf(oldCode) : -1;
    if (i === -1) return null;
    const next = [...codes];
    if (correction.kind === 'reverse') next.splice(i, 1);
    else next[i] = correction.newCptCode.trim();
    return next;
  };
  let changed = false;
  const next = specimens.map(sp => {
    if (sp.id !== specimenId) return sp;
    if (!blockId) {
      const codes = edit([...(sp.coding?.cpt ?? [])]);
      if (!codes) return sp;
      changed = true;
      return { ...sp, coding: { ...(sp.coding ?? {}), cpt: codes } };
    }
    return {
      ...sp,
      blocks: (sp.blocks ?? []).map(b => {
        if (b.id !== blockId) return b;
        const entries = [...(b.coding?.cpt ?? [])];
        const codes = edit(entries.map(e => e.code));
        if (!codes) return b;
        changed = true;
        const cpt = correction.kind === 'addMissing'
          ? [...entries, { code: correction.billingCode }]
          : correction.kind === 'reverse'
            ? entries.filter((_, i) => i !== entries.findIndex(e => e.code === oldCode))
            : entries.map((e, i) => (i === entries.findIndex(x => x.code === oldCode) ? { ...e, code: correction.newCptCode.trim() } : e));
        return { ...b, coding: { ...(b.coding ?? {}), cpt } };
      }),
    };
  });
  return changed ? next : null;
}

/** Plain-English summary for the audit log (other readers; English like every audit entry). */
export function describeBillingCorrection(c: BillingCorrection, original?: ServiceChargeRecord, charge?: ServiceChargeRecord): string {
  switch (c.kind) {
    case 'changeCode': return `${original?.sourceLabel}: ${original?.cptCode} → ${c.newCptCode} (charge ${original?.id} credited, new charge ${charge?.id})`;
    case 'changeModifier': return `${original?.sourceLabel}: ${original?.cptCode} modifier ${original?.modifier ?? 'none'} → ${c.newModifier || 'none'} (charge ${original?.id} credited, new charge ${charge?.id})`;
    case 'reverse': return `${original?.sourceLabel}: ${original?.cptCode} reversed (charge ${original?.id} credited)`;
    case 'addMissing': return `${charge?.sourceLabel}: ${c.billingCode} → ${charge?.cptCode} added (new charge ${charge?.id})`;
  }
}

export interface ApplyBillingCorrectionInput {
  caseId: string;
  correction: BillingCorrection;
  /** Required unless `requireReason` is false (the report page before sign-out). */
  reason?: PostSignoutChangeContext;
  requireReason?: boolean;
  /** The billing deficiency this resolves; none → one is recorded (unless `recordDeficiency` is false). */
  deficiencyId?: string;
  recordDeficiency?: boolean;
  /** Batch 434: also bring the case's own coding in line (default true). The
   *  report page passes false: it changes the code on screen and saves it itself. */
  updateCaseCoding?: boolean;
}

/** Applies a billing correction (see the header). */
export async function applyBillingCorrection(input: ApplyBillingCorrectionInput): Promise<{ ok: true; data: BillingCorrectionResult } | { ok: false; error: BillingCorrectionRefusal }> {
  const [{ authorizationService }, { serviceChargeService }, { billingDeficiencyService }, { billingRuleService }, { caseRouter }, { auditService }, { getSessionUser }, { resolveRequireBillingApprovalForCase }] = await Promise.all([
    import('../authorization/defaultAuthorizationService'),
    import('./serviceChargeServiceInstance'),
    import('./billingDeficiencyServiceInstance'),
    import('./billingRuleServiceInstance'),
    import('../cases/CaseRouter'),
    import('../auditlog/auditServiceInstance'),
    import('../auth/caseAccessControl'),
    import('./shouldRequireBillingApproval'),
  ]);
  if (!(await authorizationService.enforce('billing:applied-code:correct', { caseId: input.caseId })).allowed) return { ok: false, error: 'NOT_PERMITTED' };
  const reason = input.reason && input.reason.reasonId && input.reason.comment.trim() ? { reasonId: input.reason.reasonId, comment: input.reason.comment.trim() } : undefined;
  if ((input.requireReason ?? true) && !reason) return { ok: false, error: 'REASON_REQUIRED' };

  const me = getSessionUser();
  const by = me?.id ?? 'unknown';
  const byName = me ? ([me.firstName, me.lastName].filter(Boolean).join(' ') || me.id) : 'unknown';
  const at = new Date().toISOString();
  const [chargesRes, caseRecord, rules] = await Promise.all([
    serviceChargeService.getChargesForCase(input.caseId),
    input.correction.kind === 'addMissing' ? caseRouter.getCase(input.caseId) : Promise.resolve(undefined),
    input.correction.kind === 'addMissing' ? billingRuleService.getAll() : Promise.resolve(undefined),
  ]);
  const plan = planBillingCorrection(input.correction, chargesRes.ok ? chargesRes.data : [], {
    caseRecord: (caseRecord as unknown as CaseForBilling) ?? null, ruleVersions: rules && rules.ok ? rules.data : [], by, at, reason,
  });
  if (plan.ok === false) return { ok: false, error: plan.error };

  const needsApproval = await resolveRequireBillingApprovalForCase((caseRecord as { originHospitalId?: string } | undefined)?.originHospitalId
    ?? (await caseRouter.getCase(input.caseId))?.originHospitalId);
  const credit = plan.credit && needsApproval ? markAwaitingApproval(plan.credit, by, at) : plan.credit;
  const charge = plan.charge && needsApproval ? markAwaitingApproval(plan.charge, by, at) : plan.charge;
  for (const record of [credit, charge]) {
    if (!record) continue;
    const saved = await serviceChargeService.saveCharge(record);
    if (!saved.ok) return { ok: false, error: 'SAVE_FAILED' };
  }

  // Batch 434: the case's own coding follows the correction.
  // PS-71 (Batch 458): applied to the newest copy of the case and saved with
  // its version (updateCaseWithRetry); on a conflict the correction is
  // re-applied to the newer specimens, so another person's change to the case
  // is kept. A case-coding save that doesn't land is said so in the audit
  // (the charges themselves are already corrected above).
  let caseCodingNotSaved = false;
  if (input.updateCaseCoding ?? true) {
    const write = await updateCaseWithRetry(input.caseId, current => {
      const sp = (current as unknown as { specimens?: CodedSpecimen[] }).specimens;
      const specimens = sp ? applyCorrectionToSpecimens(sp, input.correction, plan.original) : null;
      return specimens ? ({ specimens } as never) : null;
    }, caseRouter).catch(() => ({ ok: false as const, reason: 'conflict' as const, attempts: 0 }));
    caseCodingNotSaved = write.ok === false && write.reason === 'conflict';
  }

  let deficiencyId = input.deficiencyId;
  if (deficiencyId) {
    await billingDeficiencyService.resolve(deficiencyId, { resolutionReasonCode: input.correction.kind === 'reverse' ? 'CHARGE_REVERSED' : 'CODE_CORRECTED', resolvedBy: by });
  } else if (input.recordDeficiency ?? true) {
    const raised = await billingDeficiencyService.raise({
      caseId: input.caseId,
      chargeRecordId: plan.original?.id ?? charge?.id,
      deficiencyType: 'POST_SIGNOUT_CORRECTION',
      severity: 'COMPLIANCE_WARNING',
      raisedByTrigger: 'MANUAL_BILLING_CORRECTION',
      auditorNotes: reason?.comment ?? '',
      createdBy: by,
    } as Omit<BillingDeficiencyRecord, 'id' | 'status' | 'createdAt' | 'resolvedAt' | 'resolvedBy' | 'resolutionReasonCode'>);
    if (raised.ok) {
      deficiencyId = raised.data.id;
      await billingDeficiencyService.resolve(raised.data.id, { resolutionReasonCode: input.correction.kind === 'reverse' ? 'CHARGE_REVERSED' : 'CODE_CORRECTED', resolvedBy: by });
    }
  }

  await auditService.logEvent({
    type: 'user',
    event: 'Billing correction',
    detail: describeBillingCorrection(input.correction, plan.original, charge)
      + (reason ? ` — reason ${reason.reasonId}: "${reason.comment}"` : '')
      + (needsApproval ? ' — awaiting billing approval' : '')
      + (deficiencyId ? ` — deficiency ${deficiencyId}` : '')
      + (caseCodingNotSaved ? ' — case coding not updated (the case could not be saved)' : ''),
    user: byName,
    caseId: input.caseId,
    confidence: null,
  }).catch(() => {});

  return { ok: true, data: { original: plan.original, credit, charge, deficiencyId } };
}
