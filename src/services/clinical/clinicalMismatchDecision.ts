// src/services/clinical/clinicalMismatchDecision.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-145 (Batch 439): the pathologist's decision on a clinical-pathologic
// mismatch suggestion (detectClinicalPathologicMismatch.ts), recorded as a
// QA record ("Clinical-Pathologic Correlation") and audited.
//
// Batch 530 (PS-554, Pete's decisions of Oct 11, 2026): the resolution status.
//   RESOLVED   — the mismatch is explained. Recommends nothing.
//   UNRESOLVED — nobody can explain it. Allowed on a high-risk mismatch and
//                counts as a decision: sign-out goes ahead, and the CAPA
//                engine recommends a corrective action (source
//                "clinical-mismatch") for the QA lead to follow up.
//   DEFERRED   — low-risk mismatches only: the case goes to the secondary
//                review queue (Surgical QA worklist), where a pathologist
//                later records RESOLVED or UNRESOLVED.
//   LOGGED     — not a person's choice: a low-risk mismatch nobody decided
//                is logged to the QA dashboard at sign-out (logLowRiskMismatch).
// Quick reasons replace most typing; the reason and the note are optional
// (rule 8). The Batch 439 "not a mismatch" choice is gone: "Resolved" with
// "Expected variation" or "Clinical context reviewed" says the same.
// Recording a decision needs case:clinical-mismatch:record.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { QaActivityRecord } from '@/types/quality/QaActivityRecord';
import { CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID } from '../quality/capaRecommendationRules';
import type { ClinicalMismatchDiscipline, ClinicalMismatchKind } from './detectClinicalPathologicMismatch';

export type ClinicalMismatchResolution = 'RESOLVED' | 'UNRESOLVED' | 'DEFERRED' | 'LOGGED';
/** What a person can choose; LOGGED is written by the sign-out itself. */
export const CLINICAL_MISMATCH_RESOLUTIONS: readonly ClinicalMismatchResolution[] = ['RESOLVED', 'UNRESOLVED', 'DEFERRED'];
export type ClinicalMismatchQuickReason = 'expected-variation' | 'clinical-context-reviewed' | 'preop-nonspecific';
export const CLINICAL_MISMATCH_QUICK_REASONS: readonly ClinicalMismatchQuickReason[] = ['expected-variation', 'clinical-context-reviewed', 'preop-nonspecific'];
export type ClinicalMismatchRiskLevel = 'low' | 'high';

export interface ClinicalMismatchDecisionInput {
  caseId: string;
  caseType: string;
  subspecialtyId?: string;
  clinicalIndication?: string;
  kind: ClinicalMismatchKind;
  source: 'ai' | 'rule' | 'pathologist';
  confidence?: number;
  resolution: ClinicalMismatchResolution;
  /** Batch 530: the risk the rules gave the suggestion (high = a Block rule reached). */
  risk?: ClinicalMismatchRiskLevel;
  /** Batch 530: the rule that decided the risk. */
  ruleId?: string;
  quickReason?: ClinicalMismatchQuickReason;
  note?: string;
  /** Batch 523: where the check ran (surgical when absent). */
  discipline?: ClinicalMismatchDiscipline;
  /** Batch 523: the cytology specimen decided on (cytology signs out specimen by specimen). */
  specimenId?: string;
  /** Batch 530: the deferred record this secondary review completes. */
  reviewOf?: string;
  /** Batch 531: the fingerprint of the text the decision was made on (a changed text is checked again). */
  inputFingerprint?: string;
}

export type ClinicalMismatchProblem = 'DECISION_REQUIRED' | 'DEFER_HIGH_RISK' | 'UNKNOWN_REASON';

/** Why this decision can't be recorded, or null (pure). */
export function clinicalMismatchProblem(
  resolution: string | undefined,
  risk: ClinicalMismatchRiskLevel | undefined,
  quickReason?: string,
): ClinicalMismatchProblem | null {
  if (!resolution || !CLINICAL_MISMATCH_RESOLUTIONS.includes(resolution as ClinicalMismatchResolution)) return 'DECISION_REQUIRED';
  if (resolution === 'DEFERRED' && risk === 'high') return 'DEFER_HIGH_RISK';
  if (quickReason && !CLINICAL_MISMATCH_QUICK_REASONS.includes(quickReason as ClinicalMismatchQuickReason)) return 'UNKNOWN_REASON';
  return null;
}

/** The QA record the decision writes (pure). */
export function qaRecordForMismatchDecision(
  input: ClinicalMismatchDecisionInput,
  actor: { userId: string; userName: string },
): Omit<QaActivityRecord, 'id' | 'recordedAt'> {
  const decided = input.resolution === 'RESOLVED' || input.resolution === 'UNRESOLVED';
  return {
    activityTypeId: CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID,
    caseId: input.caseId,
    caseType: input.caseType,
    subspecialtyId: input.subspecialtyId,
    fieldValues: {
      clinicalIndication: input.clinicalIndication ?? '',
      mismatchKind: input.kind,
      suggestionSource: input.source,
      resolutionStatus: input.resolution,
      ...(input.confidence !== undefined ? { suggestionConfidence: input.confidence } : {}),
      ...(input.risk ? { risk: input.risk } : {}),
      ...(input.ruleId ? { ruleId: input.ruleId } : {}),
      ...(input.quickReason ? { quickReason: input.quickReason } : {}),
      ...(input.discipline ? { discipline: input.discipline } : {}),
      ...(input.specimenId ? { specimenId: input.specimenId } : {}),
      ...(input.reviewOf ? { reviewOf: input.reviewOf } : {}),
      ...(input.inputFingerprint ? { inputFingerprint: input.inputFingerprint } : {}),
    },
    // The suggestion flagged a discrepancy; only a decision concludes it.
    outcome: 'discordant',
    ...(decided ? { consensus: input.resolution === 'UNRESOLVED' ? 'unresolved' as const : 'consensus-reached' as const } : {}),
    comments: input.note?.trim() || undefined,
    recordedBy: actor,
    postSignOut: !!input.reviewOf,
  };
}

export interface ClinicalMismatchDeps {
  qaRecords: { create(record: Omit<QaActivityRecord, 'id' | 'recordedAt'>): Promise<ServiceResult<QaActivityRecord>> };
  audit(entry: NewAuditLog): Promise<unknown>;
  enforce(capability: string, context: { caseId: string }): Promise<{ allowed: boolean }>;
  actor(): { userId: string; userName: string };
}

const RESOLUTION_TEXT: Record<ClinicalMismatchResolution, string> = {
  RESOLVED: 'RESOLVED (explained)',
  UNRESOLVED: 'UNRESOLVED (corrective action recommended to QA)',
  DEFERRED: 'DEFERRED to secondary review',
  LOGGED: 'LOGGED to the QA dashboard (low risk, no decision at sign-out)',
};

/** The audit text (literal English). */
export function clinicalMismatchAuditDetail(input: ClinicalMismatchDecisionInput): string {
  const where = input.discipline && input.discipline !== 'surgical' ? ` [${input.discipline}${input.specimenId ? `, specimen ${input.specimenId}` : ''}]` : '';
  const how = `${input.kind}, suggested by ${input.source}${input.confidence !== undefined ? ` at ${input.confidence}%` : ''}${input.risk ? `, ${input.risk} risk` : ''}`;
  const reason = input.quickReason ? ` Reason: ${input.quickReason}.` : '';
  const review = input.reviewOf ? ` Secondary review of ${input.reviewOf}.` : '';
  return `Clinical-pathologic correlation${where} (${how}): ${RESOLUTION_TEXT[input.resolution]}.${reason}${review}${input.note?.trim() ? ` ${input.note.trim()}` : ''}`;
}

export async function recordClinicalMismatchDecision(
  input: ClinicalMismatchDecisionInput,
  deps: ClinicalMismatchDeps,
): Promise<ServiceResult<QaActivityRecord>> {
  if (!(await deps.enforce('case:clinical-mismatch:record', { caseId: input.caseId })).allowed) return { ok: false, error: 'NOT_PERMITTED' };
  const problem = clinicalMismatchProblem(input.resolution, input.risk, input.quickReason);
  if (problem) return { ok: false, error: problem };
  const actor = deps.actor();
  const res = await deps.qaRecords.create(qaRecordForMismatchDecision(input, actor));
  if (res.ok) {
    deps.audit({
      type: 'user', event: input.resolution === 'DEFERRED' ? 'CLINICAL_MISMATCH_DEFERRED' : 'CLINICAL_MISMATCH_DECIDED',
      user: actor.userId, caseId: input.caseId, confidence: null,
      detail: clinicalMismatchAuditDetail(input),
    }).catch(() => {});
  }
  return res;
}

/**
 * Batch 530: a low-risk mismatch nobody decided before sign-out is logged to
 * the QA dashboard. Part of the sign-out, not a person's decision, so no
 * capability is checked; it is audited.
 */
export async function logLowRiskMismatch(
  input: Omit<ClinicalMismatchDecisionInput, 'resolution' | 'quickReason' | 'reviewOf'>,
  deps: Omit<ClinicalMismatchDeps, 'enforce'>,
): Promise<ServiceResult<QaActivityRecord>> {
  const actor = deps.actor();
  const full: ClinicalMismatchDecisionInput = { ...input, resolution: 'LOGGED' };
  const res = await deps.qaRecords.create(qaRecordForMismatchDecision(full, actor));
  if (res.ok) {
    deps.audit({ type: 'user', event: 'CLINICAL_MISMATCH_LOGGED', user: actor.userId, caseId: input.caseId, confidence: null, detail: clinicalMismatchAuditDetail(full) }).catch(() => {});
  }
  return res;
}
