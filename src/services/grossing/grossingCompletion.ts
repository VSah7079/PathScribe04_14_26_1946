// src/services/grossing/grossingCompletion.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 378 (PS-359). The Grossing screen saves each block, stain, piece
// count and fixation entry as it's made, so nothing marked grossing as
// finished and no case ever reached Gross Complete. Pete chose to add a
// Complete grossing action: it checks the organisation's Grossing field
// requirements (services/fieldRequirements), lists what's missing, and moves
// the case to Gross Complete. It needs case:grossing:complete and is audited.
//
// Batch 379 (Pete): a protocol on every specimen is required by default, but
// an organisation can switch that off in Field Requirements ("Grossing
// protocol attached"). When it's off, completing a case with a specimen that
// has no protocol asks for confirmation first, then raises an open
// "Grossed without protocol" deficiency for each such specimen, which puts it
// in the QA deficiency queue for secondary review. The "at least one block"
// rule is now required by default rather than locked, and applies only to
// specimens whose blocks come from a protocol (blocks are added from the
// protocol's pathways) and that aren't cytology preparations (decants).
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { Specimen } from '@/types/case/Specimen';
import type { CaseStatus } from '@/types/case/CaseStatus';
import type { IAuthorizationService } from '../authorization/authorizationService';
import type { NewAuditLog } from '../auditlog/IAuditService';
import { missingRequiredFields, type ResolvedFieldRequirement } from '../fieldRequirements/fieldRequirementRules';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';

/** Grossing can be completed while the case is waiting for it. */
export const GROSSING_OPEN_STATUSES: readonly CaseStatus[] = ['draft', 'accessioned'];

export function canCompleteGrossingFrom(status: CaseStatus | undefined): boolean {
  return !!status && GROSSING_OPEN_STATUSES.includes(status);
}

const specimensOf = (c: Pick<Case, 'specimens'>): Specimen[] => (c.specimens ?? []) as Specimen[];

/** The deficiency type raised for each specimen completed without a protocol (Batch 379). */
export const GROSSED_WITHOUT_PROTOCOL_DEFICIENCY = 'def-grossed-without-protocol';

/** Stands in for a value the rule doesn't ask of this specimen, so it counts as supplied. */
const NOT_APPLICABLE = 'notApplicable';

/** Blocks are expected of a specimen with a protocol that isn't a cytology preparation. */
export function blocksExpected(sp: Pick<Specimen, 'protocolSnapshot' | 'decants'>): boolean {
  return !!sp.protocolSnapshot && (sp.decants ?? []).length === 0;
}

/**
 * What satisfies the "Grossing protocol attached" rule for a specimen.
 * The Grossing screen: an attached protocol. The case report page (Batch 398,
 * Pete): an attached protocol or a Grossing template report, since that page
 * records grossing on Grossing templates (reportPageProtocolSatisfied).
 */
export type ProtocolSatisfied = (sp: Specimen) => boolean;
const hasProtocol: ProtocolSatisfied = sp => !!sp.protocolSnapshot;

/** The labels (A, B) of the specimens with no protocol attached. */
export function specimensWithoutProtocol(c: Pick<Case, 'specimens'>, satisfied: ProtocolSatisfied = hasProtocol): string[] {
  return specimensOf(c).filter(sp => !satisfied(sp)).map(sp => sp.label);
}

/** Whether the organisation requires a protocol on every specimen (the default). */
export function protocolRequired(requirements: readonly ResolvedFieldRequirement[]): boolean {
  return requirements.find(f => f.id === 'protocol')?.required ?? true;
}

/** The specimens that completing grossing now would route for secondary review: none while a protocol is required. */
export function specimensForSecondaryReview(c: Pick<Case, 'specimens'>, requirements: readonly ResolvedFieldRequirement[], satisfied: ProtocolSatisfied = hasProtocol): string[] {
  return protocolRequired(requirements) ? [] : specimensWithoutProtocol(c, satisfied);
}

/**
 * Every block a per-block rule applies to, with its label: each specimen's own
 * blocks (A1, A2), then the matrix blocks (one cassette shared by several
 * specimens, by their own label). Batch 397: matrix blocks used to be left out.
 */
export function grossingBlocks(c: Pick<Case, 'specimens' | 'matrixBlocks'>): { label: string; pieceCount?: number; pieceDescription?: string }[] {
  const own = specimensOf(c).flatMap(sp => (sp.blocks ?? []).map(b => ({ label: `${sp.label}${b.label}`, pieceCount: b.pieceCount, pieceDescription: b.pieceDescription })));
  const matrix = (c.matrixBlocks ?? []).map(m => ({ label: m.label, pieceCount: m.pieceCount, pieceDescription: m.pieceDescription }));
  return [...own, ...matrix];
}

/** The values the Grossing field requirements are checked against (one per specimen, or per block). */
export function grossingFieldValues(c: Pick<Case, 'specimens' | 'matrixBlocks'>, satisfied: ProtocolSatisfied = hasProtocol): Record<string, unknown[]> {
  const specimens = specimensOf(c);
  const blocks = grossingBlocks(c);
  return {
    protocol: specimens.map(sp => (satisfied(sp) ? 'yes' : '')),
    blocks: specimens.map(sp => (!blocksExpected(sp) ? NOT_APPLICABLE : (sp.blocks ?? []).length > 0 ? 'yes' : '')),
    pieceCount: blocks.map(b => (typeof b.pieceCount === 'number' && b.pieceCount > 0 ? b.pieceCount : '')),
    pieceDescription: blocks.map(b => b.pieceDescription?.trim() ?? ''),
    fixationEndedAt: specimens.map(sp => sp.processing?.fixationEndedAt ?? ''),
    fixativeRatioConfirmed: specimens.map(sp => (sp.processing?.fixativeToTissueRatioConfirmation ? 'yes' : '')),
  };
}

/**
 * Batch 397: which of one block's grossing fields (piece count, piece
 * description) the organisation requires and it still lacks. The block
 * editors save as you type, so this only marks the fields; Complete grossing
 * is what stops on them. Works for an ordinary block and a matrix block.
 */
export function blockGrossingFieldsMissing(block: { pieceCount?: number; pieceDescription?: string }, requirements: readonly ResolvedFieldRequirement[]): string[] {
  const perBlock = requirements.filter(f => f.id === 'pieceCount' || f.id === 'pieceDescription');
  return missingRequiredFields(perBlock, {
    pieceCount: [typeof block.pieceCount === 'number' && block.pieceCount > 0 ? block.pieceCount : ''],
    pieceDescription: [block.pieceDescription?.trim() ?? ''],
  }).map(f => f.id);
}

export interface MissingGrossingItem {
  fieldId: string;
  /** The specimens (A, B) or blocks (A1, A2) lacking it. */
  where: string[];
}

/** What's still required before grossing can be completed, and where. */
export function missingGrossingItems(c: Pick<Case, 'specimens' | 'matrixBlocks'>, requirements: readonly ResolvedFieldRequirement[], satisfied: ProtocolSatisfied = hasProtocol): MissingGrossingItem[] {
  const specimens = specimensOf(c);
  const values = grossingFieldValues(c, satisfied);
  const blockLabels = grossingBlocks(c).map(b => b.label);
  return missingRequiredFields(requirements, values).map(f => {
    const v = values[f.id] ?? [];
    const labels = f.perBlock ? blockLabels : specimens.map(sp => sp.label);
    return { fieldId: f.id, where: labels.filter((_, i) => v[i] === '' || v[i] === undefined) };
  });
}

export type CompleteGrossingRefusal = 'notOpen' | 'missing' | 'needsConfirmation' | 'notPermitted' | 'failed';

export type CompleteGrossingResult =
  | {
      ok: true; case: Case;
      /** Specimens completed without a protocol, each with an open deficiency for secondary review. */
      routedForReview: string[];
      /** Specimens completed without a protocol whose deficiency couldn't be raised. */
      reviewNotRaised: string[];
    }
  | {
      ok: false; reason: CompleteGrossingRefusal;
      missing?: MissingGrossingItem[];
      /** needsConfirmation: the specimens without a protocol. */
      withoutProtocol?: string[];
    };

export interface RaiseDeficiencyInput {
  caseId: string; specimenId: string; specimenLabel: string;
  deficiencyTypeId: string; comment: string; raisedBy: string;
}

export interface CompleteGrossingDeps {
  authorization: Pick<IAuthorizationService, 'enforce'>;
  updateCase: (caseId: string, patch: Partial<Case>, knownVersion: number) => Promise<Case | void>;
  audit: (entry: NewAuditLog) => Promise<unknown>;
  raiseDeficiency: (input: RaiseDeficiencyInput) => Promise<{ ok: boolean }>;
  actorName: string;
  actorId: string;
}

export interface CompleteGrossingOptions {
  /** The user has confirmed completing specimens that have no protocol. */
  confirmedWithoutProtocol?: boolean;
}

/**
 * Raises a "Grossed without protocol" deficiency (secondary review) for each
 * named specimen and records any that couldn't be raised. Used by Complete
 * grossing on the Grossing screen and Gross Complete on the case report page.
 */
export async function raiseGrossedWithoutProtocol(
  c: Pick<Case, 'id' | 'specimens'>, labels: readonly string[],
  deps: Pick<CompleteGrossingDeps, 'raiseDeficiency' | 'audit' | 'actorName' | 'actorId'>,
): Promise<{ routedForReview: string[]; reviewNotRaised: string[] }> {
  const routedForReview: string[] = [];
  const reviewNotRaised: string[] = [];
  for (const sp of specimensOf(c).filter(s => labels.includes(s.label))) {
    const raised = await deps.raiseDeficiency({
      caseId: c.id, specimenId: sp.id, specimenLabel: sp.label,
      deficiencyTypeId: GROSSED_WITHOUT_PROTOCOL_DEFICIENCY,
      comment: `Grossing completed without an attached protocol by ${deps.actorName}; routed for secondary review.`,
      raisedBy: deps.actorId,
    }).catch(() => ({ ok: false }));
    (raised.ok ? routedForReview : reviewNotRaised).push(sp.label);
  }
  if (reviewNotRaised.length) {
    await deps.audit({
      type: 'user', event: 'Secondary review not raised', user: deps.actorName, caseId: c.id, confidence: null,
      detail: `Grossing completed without a protocol, but the secondary-review deficiency couldn't be raised for specimen(s) ${reviewNotRaised.join(', ')}.`,
    });
  }
  return { routedForReview, reviewNotRaised };
}

/**
 * Checks, then moves the case to Gross Complete and records it. With the
 * protocol rule switched off, specimens without a protocol need the user's
 * confirmation (needsConfirmation) and are then routed for secondary review.
 */
export async function completeGrossing(
  c: Case, requirements: readonly ResolvedFieldRequirement[], knownVersion: number, deps: CompleteGrossingDeps,
  options: CompleteGrossingOptions = {},
): Promise<CompleteGrossingResult> {
  if (!canCompleteGrossingFrom(c.status)) return { ok: false, reason: 'notOpen' };
  const missing = missingGrossingItems(c, requirements);
  if (missing.length) return { ok: false, reason: 'missing', missing };
  const forReview = specimensForSecondaryReview(c, requirements);
  if (forReview.length && !options.confirmedWithoutProtocol) {
    return { ok: false, reason: 'needsConfirmation', withoutProtocol: forReview };
  }
  const decision = await deps.authorization.enforce('case:grossing:complete', { caseId: c.id, facilityId: c.order?.facilityId ?? null });
  if (!decision.allowed) return { ok: false, reason: 'notPermitted' };
  const specimens = specimensOf(c);
  let updated: Case | void;
  try {
    updated = await deps.updateCase(c.id, { status: 'gross-complete' }, knownVersion);
  } catch (e) {
    // A concurrency conflict is the caller's to show; anything else is a failure.
    if (e instanceof ConcurrencyConflictError) throw e;
    return { ok: false, reason: 'failed' };
  }
  const blockCount = specimens.reduce((n, sp) => n + (sp.blocks ?? []).length, 0);
  const reviewNote = forReview.length
    ? ` Completed without a protocol: specimen(s) ${forReview.join(', ')}; routed for secondary review.`
    : '';
  await deps.audit({
    type: 'user', event: 'Grossing completed', user: deps.actorName, caseId: c.id, confidence: null,
    detail: `Grossing completed: ${specimens.length} specimen(s), ${blockCount} block(s). Status ${c.status} → gross-complete.${reviewNote}`,
  });
  // The case is complete by now; a deficiency that can't be raised is
  // reported back and recorded, never a reason to undo the completion.
  const { routedForReview, reviewNotRaised } = await raiseGrossedWithoutProtocol(c, forReview, deps);
  return { ok: true, case: (updated as Case | undefined) ?? { ...c, status: 'gross-complete' }, routedForReview, reviewNotRaised };
}
