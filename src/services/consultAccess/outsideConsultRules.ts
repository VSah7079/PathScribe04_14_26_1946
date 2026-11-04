// src/services/consultAccess/outsideConsultRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 439 (PS-148, Pete Oct 2): an outside consultant's opinion is one way
// a major discordance is found. The pathologist assesses each opinion that
// comes back against the case: agrees, minor difference, or major
// discordance. The assessment is a QA activity record ("Outside Consult
// Correlation"); a major discordance on a report already released
// recommends a CAPA (the QA lead confirms or dismisses it). Before release,
// the same disagreement is consultation working as designed. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { QaActivityRecord, QaDiscordanceSeverity } from '@/types/quality/QaActivityRecord';

export const OUTSIDE_CONSULT_CORRELATION_ACTIVITY_TYPE_ID = 'qa-activity-outside-consult';

export type OutsideConsultAssessment = 'agrees' | 'minor-difference' | 'major-discordance';
export const OUTSIDE_CONSULT_ASSESSMENTS: readonly OutsideConsultAssessment[] = ['agrees', 'minor-difference', 'major-discordance'];

/** Released to the patient's record: signed out and past any release buffer. */
const RELEASED_STATUSES: ReadonlySet<string> = new Set(['finalized', 'closed']);
export const reportReleased = (status: string | undefined) => !!status && RELEASED_STATUSES.has(status);

export type AssessmentProblem = 'ASSESSMENT_REQUIRED' | 'NOTE_REQUIRED' | 'ALREADY_ASSESSED' | 'NOT_SIGNED';

/** A difference needs a note saying what differs. Only a signed opinion can be assessed. */
export function assessmentProblem(
  opinion: { signedStatus: string; assessment?: OutsideConsultAssessment },
  assessment: string | undefined,
  note: string | undefined,
): AssessmentProblem | null {
  if (opinion.assessment) return 'ALREADY_ASSESSED';
  if (opinion.signedStatus !== 'Signed') return 'NOT_SIGNED';
  if (!assessment || !OUTSIDE_CONSULT_ASSESSMENTS.includes(assessment as OutsideConsultAssessment)) return 'ASSESSMENT_REQUIRED';
  if (assessment !== 'agrees' && !note?.trim()) return 'NOTE_REQUIRED';
  return null;
}

const SEVERITY: Record<Exclude<OutsideConsultAssessment, 'agrees'>, QaDiscordanceSeverity> = {
  'minor-difference': 'low',
  'major-discordance': 'high',
};

/** The QA record an assessment writes. */
export function outsideConsultQaRecord(input: {
  caseId: string;
  caseType: string;
  subspecialtyId?: string;
  caseDiagnosis?: string;
  consultant: string;
  opinionText: string;
  assessment: OutsideConsultAssessment;
  note?: string;
  released: boolean;
  actor: { userId: string; userName: string };
  signedOutBy?: { userId: string; userName: string };
}): Omit<QaActivityRecord, 'id' | 'recordedAt'> {
  const agrees = input.assessment === 'agrees';
  return {
    activityTypeId: OUTSIDE_CONSULT_CORRELATION_ACTIVITY_TYPE_ID,
    caseId: input.caseId,
    caseType: input.caseType,
    subspecialtyId: input.subspecialtyId,
    fieldValues: {
      consultant: input.consultant,
      consultantOpinion: input.opinionText,
      caseDiagnosis: input.caseDiagnosis ?? '',
    },
    outcome: agrees ? 'concordant' : 'discordant',
    ...(agrees ? {} : { severity: SEVERITY[input.assessment as Exclude<OutsideConsultAssessment, 'agrees'>] }),
    comments: input.note?.trim() || undefined,
    recordedBy: input.actor,
    ...(input.signedOutBy ? { reviewedPathologist: input.signedOutBy } : {}),
    postSignOut: input.released,
  };
}
