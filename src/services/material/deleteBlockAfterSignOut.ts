// src/services/material/deleteBlockAfterSignOut.ts
// ───────────────────────────────────────────────────────────────────────────
// Batch 610 (#11, tiers 2 and 3 of docs/product/BLOCK_DELETION.md).
//
//   invalidateBlockAfterSignOut(input, deps)   tier 2
//     needs material:block:delete-signed-out (the case's facility); the case must be signed out;
//     the block is soft deleted with status Invalidated, who/when/why recorded, the codes released;
//     one 'BLOCK_DELETED' billing deficiency is raised (billing staff decide any credit; nothing
//     automatic); one Audit Log entry. No amendment is created for you (Pete, Oct 16).
//
//   flagBlockOnAmendedReport(input, deps)      tier 3
//     needs material:block:flag-amended; the report must be amended / corrected / added to; the
//     block gets an Invalidated or Superseded flag. It is NOT deleted and its status is unchanged.
//     One Audit Log entry.
//
// The audit detail is literal English and never names the patient. The case is saved first with
// its version (re-applied on a conflict); if raising the deficiency fails the change stands and
// the result says `billingFlagRaised: false`.
// ───────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { BillingDeficiencyRecord } from '@/types/billing/BillingDeficiencyRecord';
import { updateCaseWithRetry } from '../cases/caseWrite';
import type { CaseChange } from './blockCaseChanges';
import type { DeleteBlockDeps, DeleteBlockInput } from './deleteBlockInProcess';
import {
  appliedCodesOf, signedOutDeletionRefusal, invalidateBlockChange, isBlockDeletionReasonCode,
  amendmentFlagRefusal, flagBlockAmendmentChange, isBlockFlagReasonCode,
  type SignedOutDeletionRefusal, type AmendmentFlagRefusal,
} from './blockDeletion';

type Failure = 'notPermitted' | 'caseNotFound' | 'conflict' | 'saveFailed';
export type InvalidateBlockResult =
  | { ok: true; releasedCodes: string[]; billingFlagRaised: boolean }
  | { ok: false; error: SignedOutDeletionRefusal | Failure };
export type FlagBlockResult = { ok: true } | { ok: false; error: AmendmentFlagRefusal | Failure };

export interface FlagBlockInput {
  caseId: string; specimenId: string; blockId: string;
  kind: 'invalidated' | 'superseded';
  reasonCode: string; note?: string; supersededByBlockId?: string;
  actor: { userId: string; userName: string };
}

const accessionOf = (c: Case, fallback: string): string => c.accession?.fullAccession || c.accession?.accessionNumber || fallback;

/** Saves the change: through the page's own save when given, else read, change, save with the version. Null = saved. */
async function saveChange(caseId: string, change: CaseChange, deps: DeleteBlockDeps): Promise<Failure | null> {
  if (deps.save) {
    const outcome = await deps.save(change);
    return outcome === 'notSaved' ? 'conflict' : outcome === 'error' ? 'saveFailed' : null;
  }
  try {
    const saved = await updateCaseWithRetry(caseId, change as (c: Case) => Partial<Case> | null, deps);
    if (saved.ok) return null;
    return saved.reason === 'conflict' ? 'conflict' : saved.reason === 'notFound' ? 'caseNotFound' : 'saveFailed';
  } catch (e) {
    console.error('[deleteBlockAfterSignOut] Failed to save:', e);
    return 'saveFailed';
  }
}

export async function invalidateBlockAfterSignOut(input: DeleteBlockInput, deps: DeleteBlockDeps): Promise<InvalidateBlockResult> {
  const current = await deps.getCase(input.caseId);
  if (!current) return { ok: false, error: 'caseNotFound' };
  const decision = await deps.enforce('material:block:delete-signed-out', { caseId: input.caseId, facilityId: current.order?.facilityId ?? null });
  if (!decision.allowed) return { ok: false, error: 'notPermitted' };
  const refusal = signedOutDeletionRefusal(current, input.specimenId, input.blockId, input.reasonCode, input.note);
  if (refusal) return { ok: false, error: refusal };

  const specimen = (current.specimens ?? []).find(s => s.id === input.specimenId)!;
  const block = specimen.blocks!.find(b => b.id === input.blockId)!;
  const releasedCodes = appliedCodesOf(block);
  const when = deps.now().toISOString();
  const reasonCode = isBlockDeletionReasonCode(input.reasonCode) ? input.reasonCode : 'other';

  const failure = await saveChange(input.caseId, invalidateBlockChange({
    specimenId: input.specimenId, blockId: input.blockId, reasonCode, note: input.note,
    deletedBy: input.actor.userId, deletedByName: input.actor.userName, deletedAt: when,
  }), deps);
  if (failure) return { ok: false, error: failure };

  const label = `${specimen.label}${block.label}`;
  const codesText = releasedCodes.length ? releasedCodes.join(', ') : 'none';
  let billingFlagRaised = true;
  try {
    const raised = await deps.deficiencies.raise({
      caseId: input.caseId,
      deficiencyType: 'BLOCK_DELETED',
      severity: 'COMPLIANCE_WARNING',
      raisedByTrigger: 'BLOCK_DELETION',
      auditorNotes: `Block ${label} invalidated AFTER sign-out by ${input.actor.userName} (${reasonCode}${input.note?.trim() ? `: ${input.note.trim()}` : ''}). Billing codes released: ${codesText}. The report was already signed out: decide whether a credit is due.`,
      blockDeleted: {
        blockId: input.blockId, specimenId: input.specimenId, specimenLabel: specimen.label, blockLabel: block.label,
        reasonCode, releasedCodes,
        deletedBy: input.actor.userId, deletedByName: input.actor.userName, deletedAt: when,
      },
      createdBy: input.actor.userId,
    } as Omit<BillingDeficiencyRecord, 'id' | 'status' | 'createdAt' | 'resolvedAt' | 'resolvedBy' | 'resolutionReasonCode'>);
    billingFlagRaised = raised.ok;
  } catch (e) {
    console.error('[deleteBlockAfterSignOut] Failed to raise the billing deficiency:', e);
    billingFlagRaised = false;
  }

  deps.auditService.logEvent({
    type: 'user', event: 'Block invalidated after sign-out',
    detail: `Block ${label} invalidated after sign-out (${reasonCode}); ${releasedCodes.length} billing code(s) released; ${billingFlagRaised ? 'billing deficiency raised for credit review' : 'billing deficiency could NOT be raised, billing must check this block'}.`,
    user: input.actor.userName, caseId: accessionOf(current, input.caseId), confidence: null, facilityId: current.order?.facilityId ?? null,
  }).catch(e => console.error('[deleteBlockAfterSignOut] Failed to write audit entry:', e));
  return { ok: true, releasedCodes, billingFlagRaised };
}

export async function flagBlockOnAmendedReport(input: FlagBlockInput, deps: DeleteBlockDeps): Promise<FlagBlockResult> {
  const current = await deps.getCase(input.caseId);
  if (!current) return { ok: false, error: 'caseNotFound' };
  const decision = await deps.enforce('material:block:flag-amended', { caseId: input.caseId, facilityId: current.order?.facilityId ?? null });
  if (!decision.allowed) return { ok: false, error: 'notPermitted' };
  const refusal = amendmentFlagRefusal(current, input.specimenId, input.blockId, input.reasonCode, input.note);
  if (refusal) return { ok: false, error: refusal };

  const specimen = (current.specimens ?? []).find(s => s.id === input.specimenId)!;
  const block = specimen.blocks!.find(b => b.id === input.blockId)!;
  const reasonCode = isBlockFlagReasonCode(input.reasonCode) ? input.reasonCode : 'other';
  const when = deps.now().toISOString();
  const failure = await saveChange(input.caseId, flagBlockAmendmentChange({
    specimenId: input.specimenId, blockId: input.blockId, kind: input.kind, reasonCode, note: input.note,
    flaggedBy: input.actor.userId, flaggedByName: input.actor.userName, flaggedAt: when, supersededByBlockId: input.supersededByBlockId,
  }), deps);
  if (failure) return { ok: false, error: failure };

  deps.auditService.logEvent({
    type: 'user', event: input.kind === 'invalidated' ? 'Block flagged Invalidated' : 'Block flagged Superseded',
    detail: `Block ${specimen.label}${block.label} flagged ${input.kind} on an amended report (${reasonCode}). The block was not deleted.`,
    user: input.actor.userName, caseId: accessionOf(current, input.caseId), confidence: null, facilityId: current.order?.facilityId ?? null,
  }).catch(e => console.error('[deleteBlockAfterSignOut] Failed to write audit entry:', e));
  return { ok: true };
}

/** The tier-2 and tier-3 actions against the app's own services. */
async function liveDeps(save?: DeleteBlockDeps['save']): Promise<DeleteBlockDeps> {
  const [{ caseRouter }, { authorizationService }, { billingDeficiencyService }, { auditService }] = await Promise.all([
    import('../cases/CaseRouter'),
    import('../authorization/defaultAuthorizationService'),
    import('../billing/billingDeficiencyServiceInstance'),
    import('../auditlog/auditServiceInstance'),
  ]);
  return {
    save,
    getCase: async id => (await caseRouter.getCase(id)) as Case | null | undefined,
    updateCase: async (id, updates, v) => { await caseRouter.updateCase(id, updates as never, v); },
    enforce: (cap, ctx) => authorizationService.enforce(cap, ctx as never),
    deficiencies: billingDeficiencyService,
    auditService,
    now: () => new Date(),
  };
}
export const invalidateBlockAfterSignOutLive = async (input: DeleteBlockInput, save?: DeleteBlockDeps['save']) => invalidateBlockAfterSignOut(input, await liveDeps(save));
export const flagBlockOnAmendedReportLive = async (input: FlagBlockInput, save?: DeleteBlockDeps['save']) => flagBlockOnAmendedReport(input, await liveDeps(save));
