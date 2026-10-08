// src/services/clinical/clinicalMismatchDecision.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-145 (Batch 439): the pathologist's decision on a clinical-pathologic
// mismatch suggestion (detectClinicalPathologicMismatch.ts).
//
//   not-a-mismatch — the suggestion was wrong. Recorded as concordant, so the
//                    suggestion's accuracy can be measured later.
//   resolved       — a real mismatch, explained (the clinician corrected the
//                    history, the specimen was relabelled correctly, …).
//                    Recorded; recommends nothing.
//   unresolved     — a real mismatch nobody can explain. Recorded; the CAPA
//                    engine recommends a CAPA (source "clinical-mismatch"),
//                    which the QA lead confirms or dismisses.
//
// A pathologist may also record a mismatch they spotted themselves (source
// "pathologist"). Needs case:clinical-mismatch:record.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { QaActivityRecord } from '@/types/quality/QaActivityRecord';
import { CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID } from '../quality/capaRecommendationRules';
import type { ClinicalMismatchKind } from './detectClinicalPathologicMismatch';

export type ClinicalMismatchDecision = 'not-a-mismatch' | 'resolved' | 'unresolved';
export const CLINICAL_MISMATCH_DECISIONS: readonly ClinicalMismatchDecision[] = ['not-a-mismatch', 'resolved', 'unresolved'];

export interface ClinicalMismatchDecisionInput {
  caseId: string;
  caseType: string;
  subspecialtyId?: string;
  clinicalIndication?: string;
  kind: ClinicalMismatchKind;
  source: 'ai' | 'rule' | 'pathologist';
  confidence?: number;
  decision: ClinicalMismatchDecision;
  note?: string;
}

export type ClinicalMismatchProblem = 'DECISION_REQUIRED' | 'NOTE_REQUIRED';

/** A real mismatch, resolved or not, needs a note saying what was found. */
export function clinicalMismatchProblem(decision: string | undefined, note: string | undefined): ClinicalMismatchProblem | null {
  if (!decision || !CLINICAL_MISMATCH_DECISIONS.includes(decision as ClinicalMismatchDecision)) return 'DECISION_REQUIRED';
  if (decision !== 'not-a-mismatch' && !note?.trim()) return 'NOTE_REQUIRED';
  return null;
}

/** The QA record the decision writes (pure). */
export function qaRecordForMismatchDecision(
  input: ClinicalMismatchDecisionInput,
  actor: { userId: string; userName: string },
): Omit<QaActivityRecord, 'id' | 'recordedAt'> {
  const mismatch = input.decision !== 'not-a-mismatch';
  return {
    activityTypeId: CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID,
    caseId: input.caseId,
    caseType: input.caseType,
    subspecialtyId: input.subspecialtyId,
    fieldValues: {
      clinicalIndication: input.clinicalIndication ?? '',
      mismatchKind: input.kind,
      suggestionSource: input.source,
      ...(input.confidence !== undefined ? { suggestionConfidence: input.confidence } : {}),
    },
    outcome: mismatch ? 'discordant' : 'concordant',
    ...(mismatch ? { consensus: input.decision === 'unresolved' ? 'unresolved' as const : 'consensus-reached' as const } : {}),
    comments: input.note?.trim() || undefined,
    recordedBy: actor,
    postSignOut: false,
  };
}

export interface ClinicalMismatchDeps {
  qaRecords: { create(record: Omit<QaActivityRecord, 'id' | 'recordedAt'>): Promise<ServiceResult<QaActivityRecord>> };
  audit(entry: NewAuditLog): Promise<unknown>;
  enforce(capability: string, context: { caseId: string }): Promise<{ allowed: boolean }>;
  actor(): { userId: string; userName: string };
}

const DECISION_TEXT: Record<ClinicalMismatchDecision, string> = {
  'not-a-mismatch': 'not a mismatch',
  resolved: 'a mismatch, resolved',
  unresolved: 'a mismatch, unresolved',
};

export async function recordClinicalMismatchDecision(
  input: ClinicalMismatchDecisionInput,
  deps: ClinicalMismatchDeps,
): Promise<ServiceResult<QaActivityRecord>> {
  if (!(await deps.enforce('case:clinical-mismatch:record', { caseId: input.caseId })).allowed) return { ok: false, error: 'NOT_PERMITTED' };
  const problem = clinicalMismatchProblem(input.decision, input.note);
  if (problem) return { ok: false, error: problem };
  const actor = deps.actor();
  const res = await deps.qaRecords.create(qaRecordForMismatchDecision(input, actor));
  if (res.ok) {
    deps.audit({
      type: 'user', event: 'CLINICAL_MISMATCH_DECIDED', user: actor.userId, caseId: input.caseId, confidence: null,
      detail: `Clinical-pathologic correlation (${input.kind}, suggested by ${input.source}${input.confidence !== undefined ? ` at ${input.confidence}%` : ''}): ${DECISION_TEXT[input.decision]}.${input.note?.trim() ? ` ${input.note.trim()}` : ''}`,
    }).catch(() => {});
  }
  return res;
}
