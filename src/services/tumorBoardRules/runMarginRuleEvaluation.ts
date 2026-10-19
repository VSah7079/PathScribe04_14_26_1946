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
import { marginExtractionService } from '../marginExtraction/marginExtractionServiceInstance';
import type { MarginExtractionFieldLike } from '../marginExtraction/IMarginExtractionService';
import { tumorBoardService } from '../tumorBoard/tumorBoardServiceInstance';
import type { TumorBoardName } from '../tumorBoard/ITumorBoardService';
import { facilityTumorBoardRuleOverrideService } from './facilityTumorBoardRuleOverrideServiceInstance';
import { tumorBoardCriteriaRuleService } from './tumorBoardCriteriaRuleServiceInstance';
import { tumorBoardRuleService } from './tumorBoardRuleServiceInstance';
import { DEFAULT_TUMOR_BOARD_RULES } from './ITumorBoardRuleService';
import { resolveEffectiveTumorBoardRules, evaluateMarginRules } from './tumorBoardRuleEvaluation';
import {
  flattenAnswersForCriteria,
  resolveEffectiveCriteriaRules,
  evaluateCriteriaRules,
  type CriteriaAnswerValue,
} from './criteriaRuleEvaluation';

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
  /** Batch 610 (#71): which kind of rule flagged the case. */
  ruleKind?: 'margin' | 'criteria';
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
 *  tumorBoardService.create() already enforces. When more than one
 *  board's rule fires, the first match (enterprise rule order) is used —
 *  only one board can hold the case's active listing at a time. */
export async function runMarginRuleEvaluation(input: RunMarginRuleEvaluationInput): Promise<RunMarginRuleEvaluationResult> {
  const { caseId, caseAccession, facilityId, instances, getTemplateFields, byUserId, byUserName } = input;

  // Batch 610 (#71): the same pass over the workups also collects each answer with its field label,
  // for the diagnosis and biomarker rules.
  const answerValues: CriteriaAnswerValue[] = [];
  for (const instance of instances) {
    const fields = await getTemplateFields(instance.templateId);
    if (fields.length === 0) continue;
    await marginExtractionService.extractAndStore({ caseId, instanceId: instance.instanceId, fields, answers: instance.answers });
    answerValues.push(...flattenAnswersForCriteria(fields, instance.answers));
  }

  const attrsRes = await marginExtractionService.getShadowAttributesForCase(caseId);
  const margins = attrsRes.ok ? attrsRes.data : [];

  const [rulesRes, overridesRes, criteriaRes] = await Promise.all([
    tumorBoardRuleService.getAll(),
    facilityId ? facilityTumorBoardRuleOverrideService.getForFacility(facilityId) : Promise.resolve({ ok: true as const, data: [] }),
    tumorBoardCriteriaRuleService.getAll(),
  ]);
  const enterpriseRules = rulesRes.ok ? rulesRes.data : DEFAULT_TUMOR_BOARD_RULES;
  const overrides = overridesRes.ok ? overridesRes.data : [];
  const effectiveRules = resolveEffectiveTumorBoardRules(enterpriseRules, overrides);
  const effectiveCriteriaRules = resolveEffectiveCriteriaRules(criteriaRes.ok ? criteriaRes.data : [], overrides);

  // The margin rules come first (unchanged behaviour); the admin-added rules follow in the order they were made.
  const marginMatches = margins.length > 0 ? evaluateMarginRules(margins, effectiveRules) : [];
  const criteriaMatches = evaluateCriteriaRules(answerValues, margins, effectiveCriteriaRules);
  const first: { board: TumorBoardName; triggerReason: string; ruleKind: 'margin' | 'criteria' } | undefined =
    marginMatches.length > 0
      ? { board: marginMatches[0].rule.board, triggerReason: marginMatches[0].triggerReason, ruleKind: 'margin' }
      : criteriaMatches.length > 0
        ? { board: criteriaMatches[0].board, triggerReason: criteriaMatches[0].triggerReason, ruleKind: 'criteria' }
        : undefined;
  if (!first) return { flagged: false };

  const active = await tumorBoardService.getActiveForCase(caseId);
  if (active.ok && active.data) return { flagged: false }; // already on an agenda — never silently re-flag or override it

  const created = await tumorBoardService.create({
    caseId, caseAccession, board: first.board,
    createdByUserId: byUserId, createdByUserName: byUserName,
    source: 'Rule', triggerReason: first.triggerReason,
  });
  return created.ok ? { flagged: true, board: first.board, triggerReason: first.triggerReason, ruleKind: first.ruleKind } : { flagged: false };
}
