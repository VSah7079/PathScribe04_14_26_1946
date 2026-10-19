// src/services/material/deleteBlockInProcess.ts
// ───────────────────────────────────────────────────────────────────────────
// Batch 588 (Pete, Oct 16 2026): delete a block that is still in process.
//
//   deleteBlockInProcess(input, deps)
//     1. needs material:block:delete-in-process, checked here (facility = the case's);
//     2. refuses a block that cannot be deleted (blockDeletion.ts: already deleted, no
//        reason, a signed-out case);
//     3. saves the soft delete with the case's version (re-applied on a conflict);
//     4. raises one 'BLOCK_DELETED' billing deficiency, which billing staff resolve on
//        Quality Assurance → Financials → Billing deficiencies (Charge reversed = the
//        credit; Approved by billing admin = none due). Nothing is credited
//        automatically and nobody is messaged (Pete);
//     5. audits the delete (literal English; no patient name).
// The case is saved first: if raising the deficiency then fails, the delete stands and
// the result says `billingFlagRaised: false` (and the audit entry says so).
// ───────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { BillingDeficiencyRecord } from '@/types/billing/BillingDeficiencyRecord';
import { updateCaseWithRetry, type CaseWriteDeps } from '../cases/caseWrite';
import type { IBillingDeficiencyService } from '../billing/IBillingDeficiencyService';
import type { IAuditService } from '../auditlog/IAuditService';
import type { CaseChange } from './blockCaseChanges';
import { appliedCodesOf, blockDeletionRefusal, deleteBlockChange, isBlockDeletionReasonCode, type BlockDeletionRefusal } from './blockDeletion';

export interface DeleteBlockInput {
  caseId: string; specimenId: string; blockId: string;
  reasonCode: string; note?: string;
  actor: { userId: string; userName: string };
}

export type DeleteBlockResult =
  | { ok: true; releasedCodes: string[]; billingFlagRaised: boolean }
  | { ok: false; error: BlockDeletionRefusal | 'notPermitted' | 'caseNotFound' | 'conflict' | 'saveFailed' };

/** How a save of the case went: the report page's own save reports these four. */
export type BlockSaveOutcome = 'saved' | 'merged' | 'notSaved' | 'error';

export interface DeleteBlockDeps extends CaseWriteDeps {
  /** The report page saves block changes with its own version tracking; pass its save here. Without it the case is read, changed and saved with its version (re-applied on a conflict). */
  save?: (change: CaseChange) => Promise<BlockSaveOutcome>;
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  deficiencies: Pick<IBillingDeficiencyService, 'raise'>;
  auditService: Pick<IAuditService, 'logEvent'>;
  now: () => Date;
}

const accessionOf = (c: Case, fallback: string): string => c.accession?.fullAccession || c.accession?.accessionNumber || fallback;

export async function deleteBlockInProcess(input: DeleteBlockInput, deps: DeleteBlockDeps): Promise<DeleteBlockResult> {
  const current = await deps.getCase(input.caseId);
  if (!current) return { ok: false, error: 'caseNotFound' };
  const decision = await deps.enforce('material:block:delete-in-process', { caseId: input.caseId, facilityId: current.order?.facilityId ?? null });
  if (!decision.allowed) return { ok: false, error: 'notPermitted' };

  const refusal = blockDeletionRefusal(current, input.specimenId, input.blockId, input.reasonCode, input.note);
  if (refusal) return { ok: false, error: refusal };

  const specimen = (current.specimens ?? []).find(s => s.id === input.specimenId)!;
  const block = specimen.blocks!.find(b => b.id === input.blockId)!;
  const releasedCodes = appliedCodesOf(block);
  const when = deps.now().toISOString();

  const change = deleteBlockChange({
    specimenId: input.specimenId, blockId: input.blockId,
    reasonCode: isBlockDeletionReasonCode(input.reasonCode) ? input.reasonCode : 'other', note: input.note,
    deletedBy: input.actor.userId, deletedByName: input.actor.userName, deletedAt: when,
  });
  if (deps.save) {
    const outcome = await deps.save(change);
    if (outcome === 'notSaved') return { ok: false, error: 'conflict' };
    if (outcome === 'error') return { ok: false, error: 'saveFailed' };
  } else {
    let saved: Awaited<ReturnType<typeof updateCaseWithRetry>>;
    try {
      saved = await updateCaseWithRetry(input.caseId, change as (c: Case) => Partial<Case> | null, deps);
    } catch (e) {
      console.error('[deleteBlockInProcess] Failed to save the deleted block:', e);
      return { ok: false, error: 'saveFailed' };
    }
    if (!saved.ok) return { ok: false, error: saved.reason === 'conflict' ? 'conflict' : saved.reason === 'notFound' ? 'caseNotFound' : 'saveFailed' };
  }

  const label = `${specimen.label}${block.label}`;
  const codesText = releasedCodes.length ? releasedCodes.join(', ') : 'none';
  let billingFlagRaised = true;
  try {
    const raised = await deps.deficiencies.raise({
      caseId: input.caseId,
      deficiencyType: 'BLOCK_DELETED',
      severity: 'COMPLIANCE_WARNING',
      raisedByTrigger: 'BLOCK_DELETION',
      auditorNotes: `Block ${label} deleted in process by ${input.actor.userName} (${input.reasonCode}${input.note?.trim() ? `: ${input.note.trim()}` : ''}). Billing codes released: ${codesText}. Decide whether a credit is due.`,
      blockDeleted: {
        blockId: input.blockId, specimenId: input.specimenId, specimenLabel: specimen.label, blockLabel: block.label,
        reasonCode: input.reasonCode, releasedCodes,
        deletedBy: input.actor.userId, deletedByName: input.actor.userName, deletedAt: when,
      },
      createdBy: input.actor.userId,
    } as Omit<BillingDeficiencyRecord, 'id' | 'status' | 'createdAt' | 'resolvedAt' | 'resolvedBy' | 'resolutionReasonCode'>);
    billingFlagRaised = raised.ok;
  } catch (e) {
    console.error('[deleteBlockInProcess] Failed to raise the billing deficiency:', e);
    billingFlagRaised = false;
  }

  deps.auditService.logEvent({
    type: 'user', event: 'Block deleted',
    detail: `Block ${label} deleted in process (${input.reasonCode}); ${releasedCodes.length} billing code(s) released; ${billingFlagRaised ? 'billing deficiency raised for credit review' : 'billing deficiency could NOT be raised, billing must check this block'}.`,
    user: input.actor.userName, caseId: accessionOf(current, input.caseId), confidence: null, facilityId: current.order?.facilityId ?? null,
  }).catch(e => console.error('[deleteBlockInProcess] Failed to write audit entry:', e));
  return { ok: true, releasedCodes, billingFlagRaised };
}

/** The delete against the app's own services. */
export async function deleteBlockInProcessLive(input: DeleteBlockInput, save?: DeleteBlockDeps['save']): Promise<DeleteBlockResult> {
  const [{ caseRouter }, { authorizationService }, { mockBillingDeficiencyService }, { mockAuditService }] = await Promise.all([
    import('../cases/CaseRouter'),
    import('../authorization/defaultAuthorizationService'),
    import('../billing/mockBillingDeficiencyService'),
    import('../auditlog/mockAuditService'),
  ]);
  return deleteBlockInProcess(input, {
    save,
    getCase: async id => (await caseRouter.getCase(id)) as Case | null | undefined,
    updateCase: async (id, updates, v) => { await caseRouter.updateCase(id, updates as never, v); },
    enforce: (cap, ctx) => authorizationService.enforce(cap, ctx as never),
    deficiencies: mockBillingDeficiencyService,
    auditService: mockAuditService,
    now: () => new Date(),
  });
}
