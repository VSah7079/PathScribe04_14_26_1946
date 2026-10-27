// src/services/clinical/clinicalMismatchService.ts
// Batch 439 (PS-145): the browser's wiring for the clinical-pathologic
// mismatch check (detection + the pathologist's decision).
//
// Batch 530 (PS-554): the check is assessed against the risk rules
// (clinicalMismatchRules.ts):
//   assess()   — the report page runs it in the background once the diagnosis
//                is filled in and again when it changes (Gate A), and sign-out
//                asks again (Gate B). The answer is kept for the same inputs,
//                in memory only, so sign-out doesn't call the AI a second time
//                for an unchanged report;
//   signOutStep() — what sign-out does with it (pure: clinicalMismatchSignOutStep);
//   logLowRisk()  — a low-risk mismatch nobody decided is logged at sign-out;
//   secondaryReviewQueue() — the deferred mismatches awaiting review.

import { auditService } from '../auditlog/auditServiceInstance';
import { readSessionProfile } from '../auth/sessionProfile';
import { detectClinicalPathologicMismatch, type ClinicalMismatchInput, type ClinicalMismatchSuggestion } from './detectClinicalPathologicMismatch';
import {
  mismatchesAwaitingSecondaryReview, mismatchCheckDeferred, mismatchInputFingerprint, latestMismatchRecord, mismatchRecheck, mismatchWorseThanBefore,
} from './clinicalMismatchInputs';
import { recordClinicalMismatchDecision, logLowRiskMismatch, type ClinicalMismatchDecisionInput, type ClinicalMismatchDeps } from './clinicalMismatchDecision';
import { evaluateClinicalMismatch, type ClinicalMismatchOutcome } from './clinicalMismatchRules';
import { clinicalMismatchRuleService } from './clinicalMismatchRuleServiceInstance';
import { revisionStep, withReleaseSetting } from './amendmentMismatch';
import type { QaActivityRecord } from '@/types/quality/QaActivityRecord';

/** A suggestion and what the rules make of it. */
export interface ClinicalMismatchAssessment {
  suggestion: ClinicalMismatchSuggestion;
  outcome: ClinicalMismatchOutcome;
  /** Batch 531: the fingerprint of the text compared, recorded with the decision. */
  fingerprint?: string;
  /** Batch 531: the decision made on earlier text, when the text has changed since. */
  previous?: { resolution?: string; kind?: string; recordedAt?: string };
  /** Batch 609 (#31): a high-risk mismatch on an amendment, correction or addendum that the lab setting does not hold the release for. */
  releaseNotHeld?: boolean;
}

export type ClinicalMismatchSignOutStep = 'continue' | 'log' | 'decide';

/**
 * Gate B (pure): nothing to show or suppressed → continue; high risk (a Block
 * rule reached) → the pathologist decides before sign-out; any other mismatch
 * shown → logged to the QA dashboard, sign-out not held.
 */
export function clinicalMismatchSignOutStep(assessment: ClinicalMismatchAssessment | null): ClinicalMismatchSignOutStep {
  if (!assessment || assessment.outcome.risk === 'suppressed') return 'continue';
  return assessment.outcome.holdsSignOut ? 'decide' : 'log';
}

const qaRecords = async () => (await import('../quality/qaActivityRecordServiceInstance')).qaActivityRecordService;
const deps: ClinicalMismatchDeps = {
  qaRecords: { create: async record => (await qaRecords()).create(record) },
  audit: entry => auditService.logEvent(entry),
  enforce: async (capability, context) => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce(capability, context);
  },
  actor: () => {
    const p = readSessionProfile();
    return { userId: p?.id ?? 'unknown', userName: p?.name || p?.id || 'unknown' };
  },
};

// The last answer per case (and specimen) for the inputs it was asked about.
const lastAnswer = new Map<string, { key: string; suggestion: ClinicalMismatchSuggestion | null }>();
const scopeKey = (scope: { caseId: string; specimenId?: string }) => `${scope.caseId}|${scope.specimenId ?? ''}`;

async function latestRecord(scope: { caseId: string; specimenId?: string }): Promise<QaActivityRecord | null> {
  const records = await (await qaRecords()).getAll().catch(() => null);
  return records?.ok ? latestMismatchRecord(records.data, scope.caseId, scope.specimenId) : null;
}

export const clinicalMismatchService = {
  detect: detectClinicalPathologicMismatch,

  /** The suggestion and its risk, or null: none when a decision is already
   *  recorded for this same text (for the specimen, when one is named), when
   *  the text changed but the new result is no worse than what was decided
   *  (Batch 531), or when the check finds nothing or can't run. */
  async assess(input: ClinicalMismatchInput, scope: { caseId: string; specimenId?: string }, specimenTypeIds: readonly string[] = []): Promise<ClinicalMismatchAssessment | null> {
    const fingerprint = mismatchInputFingerprint(input);
    const previous = await latestRecord(scope);
    if (mismatchRecheck(previous, fingerprint) === 'decided') return null;
    const key = JSON.stringify(input);
    const cached = lastAnswer.get(scopeKey(scope));
    let suggestion: ClinicalMismatchSuggestion | null;
    if (cached?.key === key) suggestion = cached.suggestion;
    else {
      const res = await detectClinicalPathologicMismatch(input, { caseId: scope.caseId }).catch(() => null);
      suggestion = res?.ok ? res.data : null;
      lastAnswer.set(scopeKey(scope), { key, suggestion });
    }
    if (!suggestion) return null;
    const rules = await clinicalMismatchRuleService.rulesForCheck();
    const outcome = evaluateClinicalMismatch(suggestion, specimenTypeIds, rules);
    if (previous && !mismatchWorseThanBefore(previous, { kind: suggestion.kind, risk: outcome.risk })) return null;
    return {
      suggestion, outcome, fingerprint,
      ...(previous ? { previous: { resolution: String(previous.fieldValues?.resolutionStatus ?? ''), kind: String(previous.fieldValues?.mismatchKind ?? ''), recordedAt: previous.recordedAt } } : {}),
    };
  },

  signOutStep: clinicalMismatchSignOutStep,

  /**
   * Gate B. The assessment the pathologist must decide before signing, or
   * null to go on. A low-risk mismatch is logged to the QA dashboard here
   * (sign-out isn't held); a suppressed one leaves nothing.
   */
  async atSignOut(
    input: ClinicalMismatchInput,
    scope: { caseId: string; specimenId?: string },
    specimenTypeIds: readonly string[],
    meta: Pick<ClinicalMismatchDecisionInput, 'caseType' | 'subspecialtyId' | 'clinicalIndication' | 'discipline'>,
  ): Promise<ClinicalMismatchAssessment | null> {
    // Batch 530 (Pete: flag rather than block): no clinical information → the
    // check is deferred; sign-out goes on, with a notice in the audit log.
    if (mismatchCheckDeferred(input)) {
      if (!(await latestRecord(scope))) {
        await auditService.logEvent({
          type: 'system', event: 'CLINICAL_MISMATCH_CHECK_DEFERRED', caseId: scope.caseId, user: deps.actor().userId, confidence: null,
          detail: `Mismatch check deferred: no clinical history provided${meta.discipline && meta.discipline !== 'surgical' ? ` [${meta.discipline}${scope.specimenId ? `, specimen ${scope.specimenId}` : ''}]` : ''}.`,
        }).catch(() => {});
      }
      return null;
    }
    const assessment = await clinicalMismatchService.assess(input, scope, specimenTypeIds);
    const step = clinicalMismatchSignOutStep(assessment);
    if (step === 'decide') return assessment;
    if (step === 'log' && assessment) {
      await logLowRiskMismatch({
        ...meta, caseId: scope.caseId, ...(scope.specimenId ? { specimenId: scope.specimenId } : {}),
        kind: assessment.suggestion.kind, source: assessment.suggestion.source, confidence: assessment.suggestion.confidence,
        ...(assessment.suggestion.instructionVersion !== undefined ? { instructionVersion: assessment.suggestion.instructionVersion } : {}),
        ...(assessment.suggestion.evidence ? { evidence: assessment.suggestion.evidence } : {}), // Batch 685
        risk: 'low', ruleId: assessment.outcome.rule.id, inputFingerprint: assessment.fingerprint,
      }, deps).catch(() => null);
    }
    return null;
  },

  /**
   * Batch 609 (#31): the same check for an amendment, correction or addendum,
   * before it is released. Returns the assessment to decide first (a high-risk
   * mismatch, when the lab setting holds the release), or null to go on. A
   * mismatch that does not hold the release is logged to the QA dashboard
   * here, with the risk the rules gave it.
   */
  async atRevision(
    input: ClinicalMismatchInput,
    scope: { caseId: string; specimenId?: string },
    specimenTypeIds: readonly string[],
    meta: Pick<ClinicalMismatchDecisionInput, 'caseType' | 'subspecialtyId' | 'clinicalIndication' | 'discipline'>,
  ): Promise<ClinicalMismatchAssessment | null> {
    if (mismatchCheckDeferred(input)) return null;
    const holds = await clinicalMismatchRuleService.revisionHoldsRelease();
    const assessment = await clinicalMismatchService.assess(input, scope, specimenTypeIds);
    const step = revisionStep(assessment, holds);
    if (step === 'decide') return assessment;
    if (step === 'log' && assessment) {
      await logLowRiskMismatch({
        ...meta, caseId: scope.caseId, ...(scope.specimenId ? { specimenId: scope.specimenId } : {}),
        kind: assessment.suggestion.kind, source: assessment.suggestion.source, confidence: assessment.suggestion.confidence,
        ...(assessment.suggestion.instructionVersion !== undefined ? { instructionVersion: assessment.suggestion.instructionVersion } : {}),
        ...(assessment.suggestion.evidence ? { evidence: assessment.suggestion.evidence } : {}), // Batch 685
        risk: assessment.outcome.holdsSignOut ? 'high' : 'low', ruleId: assessment.outcome.rule.id, inputFingerprint: assessment.fingerprint,
      }, deps).catch(() => null);
    }
    return null;
  },

  /** Batch 609: the assessment as the report alert shows it while an amended report is edited. */
  async forRevisionAlert(assessment: ClinicalMismatchAssessment): Promise<ClinicalMismatchAssessment> {
    return withReleaseSetting(assessment, await clinicalMismatchRuleService.revisionHoldsRelease());
  },

  record: (input: ClinicalMismatchDecisionInput) => recordClinicalMismatchDecision(input, deps),

  logLowRisk: (input: Parameters<typeof logLowRiskMismatch>[0]) => logLowRiskMismatch(input, deps),

  /** Batch 530: deferred low-risk mismatches awaiting secondary review. */
  async secondaryReviewQueue(): Promise<QaActivityRecord[]> {
    const records = await (await qaRecords()).getAll().catch(() => null);
    return records?.ok ? mismatchesAwaitingSecondaryReview(records.data) : [];
  },

  /** For tests: forget the remembered answers. */
  forgetAnswers() { lastAnswer.clear(); },
};
