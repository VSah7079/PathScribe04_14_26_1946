// src/services/tumorBoardRules/runMarginRuleEvaluation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 491 (PS-359 follow-up). The impure glue between Batch 490's
// marginExtraction layer and this module's pure rule evaluator
// (tumorBoardRuleEvaluation.ts) — run once per case, at sign-out
// (useSignOutWorkflow.ts's finalizeSignOut). This is the real wiring
// Batch 490 deliberately left undone (see marginExtraction/README.md's own
// disclosed gap: "no call site wired in").
//
// Best-effort by design, same as every other post-sign-out side effect in
// that file (markFollowUpExpectedLive, dispatchCancerRegistryReportIfApplicable):
// a failure here is caught by the caller and never blocks or undoes a
// sign-out that has already happened.
// ─────────────────────────────────────────────────────────────────────────────
import { mockMarginExtractionService } from '../marginExtraction/mockMarginExtractionService';
import type { MarginExtractionFieldLike } from '../marginExtraction/IMarginExtractionService';
import { mockTumorBoardService } from '../tumorBoard/mockTumorBoardService';
import type { TumorBoardName } from '../tumorBoard/ITumorBoardService';
import { mockTumorBoardRuleService, mockFacilityTumorBoardRuleOverrideService } from './mockTumorBoardRuleService';
import { DEFAULT_TUMOR_BOARD_RULES } from './ITumorBoardRuleService';
import { resolveEffectiveTumorBoardRules, evaluateMarginRules } from './tumorBoardRuleEvaluation';

export interface SynopticInstanceLike {
  instanceId: string;
  templateId: string;
  answers: Record<string, string | string[]>;
}

export interface RunMarginRuleEvaluationInput {
  caseId: string;
  caseAccession: string;
  /** The case's own performing-lab facility, for the facility-override
   *  tier — the same id useSignOutWorkflow.ts already resolves as
   *  authorityLabId for the finalize-authority check. Omitted falls back
   *  to the enterprise baseline only. */
  facilityId?: string;
  instances: readonly SynopticInstanceLike[];
  /** Returns one template's flattened fields — injected rather than
   *  calling templates/templateService.ts directly, so this stays
   *  testable without a real template fetch (same dependency-injection
   *  pattern as saveParticipationTypeWithAudit; CLAUDE.md rule 2). */
  getTemplateFields: (templateId: string) => Promise<MarginExtractionFieldLike[]>;
  byUserId: string;
  byUserName: string;
}

export interface RunMarginRuleEvaluationResult {
  flagged: boolean;
  board?: TumorBoardName;
  triggerReason?: string;
}

/** Runs margin-distance extraction over every synoptic instance of this
 *  case, then evaluates the Tumor Board auto-flag rules against the
 *  resulting shadow attributes (across every instance already recorded
 *  for the case, not just this sign-out's own instances — a later
 *  specimen's close margin should still trip a rule even if an earlier
 *  specimen's workup was signed out first). Creates a Rule-sourced Tumor
 *  Board listing when a rule fires and the case has no active listing yet
 *  — a case already nominated (manually, or by an earlier run of this same
 *  function) is left alone, the same real one-active-listing-per-case rule
 *  mockTumorBoardService.create() already enforces. When more than one
 *  board's rule fires, the first match (enterprise rule order) is used —
 *  only one board can hold the case's active listing at a time. */
export async function runMarginRuleEvaluation(input: RunMarginRuleEvaluationInput): Promise<RunMarginRuleEvaluationResult> {
  const { caseId, caseAccession, facilityId, instances, getTemplateFields, byUserId, byUserName } = input;

  for (const instance of instances) {
    const fields = await getTemplateFields(instance.templateId);
    if (fields.length === 0) continue;
    await mockMarginExtractionService.extractAndStore({ caseId, instanceId: instance.instanceId, fields, answers: instance.answers });
  }

  const attrsRes = await mockMarginExtractionService.getShadowAttributesForCase(caseId);
  if (!attrsRes.ok || attrsRes.data.length === 0) return { flagged: false };

  const [rulesRes, overridesRes] = await Promise.all([
    mockTumorBoardRuleService.getAll(),
    facilityId ? mockFacilityTumorBoardRuleOverrideService.getForFacility(facilityId) : Promise.resolve({ ok: true as const, data: [] }),
  ]);
  const enterpriseRules = rulesRes.ok ? rulesRes.data : DEFAULT_TUMOR_BOARD_RULES;
  const overrides = overridesRes.ok ? overridesRes.data : [];
  const effectiveRules = resolveEffectiveTumorBoardRules(enterpriseRules, overrides);

  const matches = evaluateMarginRules(attrsRes.data, effectiveRules);
  if (matches.length === 0) return { flagged: false };

  const active = await mockTumorBoardService.getActiveForCase(caseId);
  if (active.ok && active.data) return { flagged: false }; // already on an agenda — never silently re-flag or override it

  const { rule, triggerReason } = matches[0];
  const created = await mockTumorBoardService.create({
    caseId, caseAccession, board: rule.board,
    createdByUserId: byUserId, createdByUserName: byUserName,
    source: 'Rule', triggerReason,
  });
  return created.ok ? { flagged: true, board: rule.board, triggerReason } : { flagged: false };
}
