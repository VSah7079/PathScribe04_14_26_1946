// src/services/quality/surgicalQaReview.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 396 (Pete: "I would not want to force the pathologist to go to 2
// screens"). Surgical Post-Sign-Out QA can now be recorded from the case's
// report page as well as from the queue, so the decisions both screens
// share live here. Before this they were written out in
// SurgicalQaWorklistPage.tsx:
//   - which of a case's specimens are waiting for review (peer review flags
//     and open biopsy-to-resection correlation candidates);
//   - recording a review: the QA activity record, then linking it on the
//     specimen so the item leaves the queue;
//   - dismissing a correlation candidate as not relevant.
// Recording or dismissing needs surgical:qa-review:record, checked here.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { Specimen } from '@/types/case/Specimen';
import type { QaActivityType } from '@/types/quality/QaActivityType';
import type { QaActivityRecord } from '@/types/quality/QaActivityRecord';
import type { ServiceResult } from '../types';
import type { QaReviewCaptureSubmission } from '@/components/QualityAssurance/QaReviewCaptureForm';
import { SURGICAL_PEER_REVIEW_ACTIVITY_TYPE_ID, SURGICAL_BIOPSY_RESECTION_CORRELATION_ACTIVITY_TYPE_ID } from './mockQaActivityTypeService';
import { resolveSurgicalPeerReviewPoolMembership } from './resolveSurgicalPeerReviewPoolMembership';
import { resolveSurgicalBiopsyToResectionCorrelationPoolMembership } from './resolveSurgicalBiopsyToResectionCorrelationPoolMembership';
import { updateCaseWithRetry } from '../cases/caseWrite';

export const SURGICAL_QA_RECORD_CAPABILITY = 'surgical:qa-review:record';

export interface SurgicalQaPeerReviewRow {
  kind: 'peer_review';
  caseId: string;
  specimenId: string;
  caseData: Case;
}

export interface SurgicalQaCorrelationRow {
  kind: 'correlation';
  caseId: string;
  specimenId: string;
  candidateCaseId: string;
  candidateSpecimenId: string;
  caseData: Case;
}

export type SurgicalQaRow = SurgicalQaPeerReviewRow | SurgicalQaCorrelationRow;

/** The review items waiting on these cases, in case and specimen order. Pure. */
export function buildSurgicalQaRows(cases: Case[]): SurgicalQaRow[] {
  const rows: SurgicalQaRow[] = [];
  for (const c of cases) {
    for (const s of c.specimens ?? []) {
      const spr = (s as Specimen).surgicalPeerReview;
      if (resolveSurgicalPeerReviewPoolMembership(spr)) {
        rows.push({ kind: 'peer_review', caseId: c.id, specimenId: s.id, caseData: c });
      }
      if (resolveSurgicalBiopsyToResectionCorrelationPoolMembership(spr?.biopsyToResectionCandidates)) {
        for (const cand of (spr?.biopsyToResectionCandidates ?? []).filter(x => x.recordedActivityRecordId === undefined && !x.dismissedAsNotRelevant)) {
          rows.push({
            kind: 'correlation', caseId: c.id, specimenId: s.id,
            candidateCaseId: cand.candidateCaseId, candidateSpecimenId: cand.candidateSpecimenId, caseData: c,
          });
        }
      }
    }
  }
  return rows;
}

/** Which QA activity type records this item. Pure. */
export function activityTypeForSurgicalQaRow(row: SurgicalQaRow, activityTypes: QaActivityType[]): QaActivityType | undefined {
  return activityTypes.find(t => t.id === (row.kind === 'peer_review' ? SURGICAL_PEER_REVIEW_ACTIVITY_TYPE_ID : SURGICAL_BIOPSY_RESECTION_CORRELATION_ACTIVITY_TYPE_ID));
}

/**
 * Batch 442 (PS-147): whose work a retrospective peer review looks at: the
 * case's active primary pathologist, or its assignee when it has no team.
 * Pure.
 */
export function reviewedPathologistOf(c: Pick<Case, 'participants' | 'order'>): { userId: string; userName: string } | undefined {
  const primary = (c.participants ?? []).find(p => p.status === 'active' && p.participationTypeIds.includes('primary'));
  if (primary) return { userId: primary.staffId, userName: primary.staffName };
  const assigned = c.order?.assignedTo;
  return assigned ? { userId: assigned, userName: assigned } : undefined;
}

export interface SurgicalQaReviewDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  createRecord: (record: Omit<QaActivityRecord, 'id' | 'recordedAt'>) => Promise<ServiceResult<QaActivityRecord>>;
  getCase: (caseId: string) => Promise<Case | undefined>;
  /** PS-71 (Batch 458): saves carry the version of the case they were built from. */
  updateCase: (caseId: string, updates: Partial<Case>, expectedVersion: number) => Promise<void>;
}

// One flat shape: this project's tsconfig doesn't narrow unions reliably.
export interface SurgicalQaActionResult { ok: boolean; notPermitted?: boolean; failed?: boolean }

async function patchSpecimen(deps: SurgicalQaReviewDeps, caseId: string, specimenId: string, mutate: (s: Specimen) => Specimen): Promise<boolean> {
  // PS-71 (Batch 458): applied to the case as read, saved with its version;
  // on a conflict, re-read and re-applied. A save that keeps conflicting is
  // reported as failed (never claimed as saved).
  const r = await updateCaseWithRetry(caseId, current => ({
    specimens: (current.specimens ?? []).map(s => (s.id === specimenId ? mutate(s as Specimen) : s)),
  } as Partial<Case>), deps);
  return r.ok;
}

export async function recordSurgicalQaReview(
  row: SurgicalQaRow,
  activityType: QaActivityType,
  submission: QaReviewCaptureSubmission,
  recordedBy: { userId: string; userName: string },
  deps: SurgicalQaReviewDeps,
): Promise<SurgicalQaActionResult> {
  const decision = await deps.enforce('surgical:qa-review:record', { caseId: row.caseId });
  if (!decision.allowed) return { ok: false, notPermitted: true };

  const record = await deps.createRecord({
    activityTypeId: activityType.id,
    caseId: row.caseId,
    specimenId: row.specimenId,
    caseType: row.caseData.specimens?.find(s => s.id === row.specimenId)?.description || row.caseData.id,
    subspecialtyId: row.caseData.subspecialtyId,
    fieldValues: submission.fieldValues,
    outcome: submission.outcome,
    delta: submission.delta,
    severity: submission.severity,
    rootCause: submission.rootCause,
    rootCauseNote: submission.rootCauseNote,
    comments: submission.comments,
    recordedBy,
    // Batch 442 (PS-147): a peer review names whose work it reviewed, so the
    // discordance trend can count it. A correlation doesn't.
    ...(row.kind === 'peer_review' && reviewedPathologistOf(row.caseData) ? { reviewedPathologist: reviewedPathologistOf(row.caseData) } : {}),
  } as Omit<QaActivityRecord, 'id' | 'recordedAt'>);
  if (!record.ok) return { ok: false, failed: true };

  const linked = await patchSpecimen(deps, row.caseId, row.specimenId, s => row.kind === 'peer_review'
    ? { ...s, surgicalPeerReview: { ...s.surgicalPeerReview, peerReviewRecordedActivityRecordId: record.data.id } }
    : {
        ...s,
        surgicalPeerReview: {
          ...s.surgicalPeerReview,
          biopsyToResectionCandidates: (s.surgicalPeerReview?.biopsyToResectionCandidates ?? []).map(c =>
            c.candidateCaseId === row.candidateCaseId && c.candidateSpecimenId === row.candidateSpecimenId
              ? { ...c, recordedActivityRecordId: record.data.id }
              : c),
        },
      });
  return linked ? { ok: true } : { ok: false, failed: true };
}

export async function dismissSurgicalCorrelationCandidate(
  row: SurgicalQaCorrelationRow,
  deps: SurgicalQaReviewDeps,
): Promise<SurgicalQaActionResult> {
  const decision = await deps.enforce('surgical:qa-review:record', { caseId: row.caseId });
  if (!decision.allowed) return { ok: false, notPermitted: true };
  const done = await patchSpecimen(deps, row.caseId, row.specimenId, s => ({
    ...s,
    surgicalPeerReview: {
      ...s.surgicalPeerReview,
      biopsyToResectionCandidates: (s.surgicalPeerReview?.biopsyToResectionCandidates ?? []).map(c =>
        c.candidateCaseId === row.candidateCaseId && c.candidateSpecimenId === row.candidateSpecimenId
          ? { ...c, dismissedAsNotRelevant: true }
          : c),
    },
  }));
  return done ? { ok: true } : { ok: false, failed: true };
}
