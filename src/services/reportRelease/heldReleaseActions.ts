// src/services/reportRelease/heldReleaseActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 534 (Pete, Oct 12, 2026). What a held report's Recall reopens, and
// what goes out with it when the delay ends. Dependencies are passed in.
//
// Recall ("reopens, like sign-out"); nothing was sent, and:
//   cytology-sign-out        the last specimen's sign-out record is marked
//                            recalled (never deleted) and the case goes back
//                            to its earlier status, so the specimen can be
//                            signed again;
//   cytology-late-sign-out   that specimen's record is marked recalled;
//   cytology-finalize-early  the early finalization is undone (status back);
//   cytology-revision        the correction or addendum record is marked
//                            recalled; for a correction the specimen's final
//                            diagnosis goes back to what it corrected;
//   cytology-preliminary     the preliminary is marked recalled;
//   surgical-preliminary     the preliminary attestation is cleared;
//   surgical-amendment       (Batch 535) the correction or addendum record goes
//                            back to draft (amendmentService.reopen) and its
//                            report instance back to editing, with its pending
//                            id, as before it was released;
//   autopsy                  (Batch 535) the PAD or FAD signature's frozen
//                            snapshot is withdrawn; a FAD puts the case status
//                            back. A PAD can't be recalled once the FAD is
//                            signed on it (heldRecallBlocked: 'superseded').
//
// Follow-ups: the cytology registry submissions (per sample, together; or a
// correction / addendum), with the dictionary the result was signed with.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CytologySignOutRecord } from '@/types/cytology/CytologySignOutRecord';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import type { HeldRelease, HeldReleaseFollowUp } from '@/types/reportRelease/HeldRelease';
import type { ServiceResult } from '../types';
import type { CaseWriteDeps } from '../cases/caseWrite';
import { updateCaseWithRetry } from '../cases/caseWrite';
import { resolveCytologyFinalDiagnosisSnapshot } from '../cytology/resolveCytologyFinalDiagnosisSnapshot';

export interface HeldReleaseActionDeps extends CaseWriteDeps {
  markRecordRecalled: (recordId: string, by: { userId: string; userName: string }, at: string) => Promise<ServiceResult<CytologySignOutRecord>>;
  getRecordsIncludingRecalled: (caseId: string) => Promise<ServiceResult<CytologySignOutRecord[]>>;
  getCaseRecords: (caseId: string) => Promise<ServiceResult<CytologySignOutRecord[]>>;
  getAllReviews: () => Promise<ServiceResult<CytologyReviewRecord[]>>;
  /** One registry submission (submitScreeningRegistryResult with the sign-out services). */
  submitRegistry: (input: { caseData: Case; record: CytologySignOutRecord; review: CytologyReviewRecord; categories: HeldReleaseFollowUp['categories']; isGynCytology: boolean; kind: 'signOut' }) => Promise<unknown>;
  /** A correction or addendum to the registry (submitCytologyRevisionToRegistry, Batch 419). */
  /** Batch 535: a released surgical correction or addendum back to draft. */
  reopenAmendment: (id: string, by: { userId: string; userName: string }) => Promise<ServiceResult<{ type: 'addendum' | 'amendment' | 'correction' }>>;
  submitRevisionRegistry: (input: { caseData: Case; signOutRecordId: string; kind: 'correction' | 'addendum'; isGynCytology: boolean; categories: HeldReleaseFollowUp['categories'] }) => Promise<unknown>;
  now: () => Date;
}

type Patch = Partial<Case>;
const write = (caseId: string, change: (c: Case) => Patch | null, deps: CaseWriteDeps) => updateCaseWithRetry(caseId, change, deps);

export async function reopenHeldRelease(h: HeldRelease, by: { userId: string; userName: string }, deps: HeldReleaseActionDeps): Promise<void> {
  const at = deps.now().toISOString();
  const recordId = h.subject?.recordId;
  const previousStatus = (h.subject?.previousStatus ?? 'in-progress') as Case['status'];
  switch (h.kind) {
    case 'cytology-sign-out':
      if (recordId) await deps.markRecordRecalled(recordId, by, at);
      await write(h.caseId, () => ({ status: previousStatus }), deps);
      return;
    case 'cytology-late-sign-out':
      if (recordId) await deps.markRecordRecalled(recordId, by, at);
      return;
    case 'cytology-finalize-early':
      await write(h.caseId, () => ({ status: previousStatus, cytologyEarlyFinalization: undefined }), deps);
      return;
    case 'cytology-revision': {
      if (!recordId) return;
      const all = await deps.getRecordsIncludingRecalled(h.caseId);
      const record = all.ok ? all.data.find(r => r.id === recordId) : undefined;
      await deps.markRecordRecalled(recordId, by, at);
      // A correction made the corrected review the specimen's final diagnosis: put back what it corrected.
      const corrected = record?.amendsRecordId && all.ok ? all.data.find(r => r.id === record.amendsRecordId) : undefined;
      if (!record || !corrected) return;
      const reviews = await deps.getAllReviews();
      const review = reviews.ok ? reviews.data.find(v => v.id === corrected.reviewRecordId) : undefined;
      if (!review) return;
      const finalDiagnosis = { ...resolveCytologyFinalDiagnosisSnapshot(review), selectedBy: by.userId, selectedByName: by.userName, selectedAt: at };
      await write(h.caseId, c => ({
        specimens: (c.specimens ?? []).map(sp => (sp.id === record.specimenId
          ? { ...sp, cytologyScreening: { ...(sp as { cytologyScreening?: Record<string, unknown> }).cytologyScreening, finalDiagnosis } }
          : sp)) as Case['specimens'],
      }), deps);
      return;
    }
    case 'cytology-preliminary':
      await write(h.caseId, c => ({
        cytologyPreliminaryReleases: (c.cytologyPreliminaryReleases ?? []).map(p => (p.id === h.event.instanceId ? { ...p, recalled: { at, by } } : p)),
      }), deps);
      return;
    case 'surgical-preliminary':
      await write(h.caseId, c => ({ diagnostic: { ...c.diagnostic, reviewerRole: undefined, preliminaryRecordedAt: undefined } } as Patch), deps);
      return;
    case 'surgical-amendment': {
      if (!recordId) return;
      const reopened = await deps.reopenAmendment(recordId, by);
      if (!reopened.ok) return;
      const isAddendum = reopened.data.type === 'addendum';
      const instanceId = h.subject?.instanceId ?? h.event.instanceId;
      const revision = h.subject?.previousRevisionType;
      await write(h.caseId, c => ({
        // A correction released during the sign-out buffer: the sign-out's own recall restores the status.
        ...(isAddendum || previousStatus === 'pending-release' ? {} : { status: previousStatus }),
        lastRevisionType: revision as Case['lastRevisionType'],
        synopticReports: (c.synopticReports ?? []).map(r => (r.instanceId !== instanceId ? r : isAddendum
          ? { ...r, status: 'draft' as const, pendingAddendumId: recordId, lastRevisionType: revision as typeof r.lastRevisionType }
          : { ...r, status: 'draft' as const, pendingAmendmentId: recordId, previouslyFinalizedForAmendment: true, lastRevisionType: revision as typeof r.lastRevisionType })),
      }), deps);
      return;
    }
    case 'autopsy': {
      const isFad = h.event.reportType === 'FINAL';
      await write(h.caseId, c => (c.autopsy ? {
        ...(isFad ? { status: previousStatus } : {}),
        autopsy: { ...c.autopsy, ...(isFad ? { fadSnapshot: undefined } : { padSnapshot: undefined }) },
      } : null), deps);
      return;
    }
    default:
      return;
  }
}

export async function runHeldReleaseFollowUp(f: HeldReleaseFollowUp, caseId: string, deps: HeldReleaseActionDeps): Promise<void> {
  const caseData = await deps.getCase(caseId);
  if (!caseData) return;
  if (f.type === 'cytology-revision-registry') {
    await deps.submitRevisionRegistry({ caseData, signOutRecordId: f.recordId, kind: f.revision, isGynCytology: f.isGynCytology, categories: f.categories });
    return;
  }
  const [records, reviews] = await Promise.all([deps.getCaseRecords(caseId), deps.getAllReviews()]);
  if (!records.ok) return;
  for (const id of f.recordIds) {
    const record = records.data.find(r => r.id === id);
    const review = record && reviews.ok ? reviews.data.find(v => v.id === record.reviewRecordId) : undefined;
    if (!record || !review) continue;
    await deps.submitRegistry({ caseData, record, review, categories: f.categories, isGynCytology: f.isGynCytology, kind: 'signOut' });
  }
}

/** Batch 535: why this held report can't be reopened now, beyond who and when (heldRecallRefusal), or null. */
export async function heldRecallBlocked(h: HeldRelease, deps: Pick<HeldReleaseActionDeps, 'getCase'>): Promise<'superseded' | null> {
  if (h.kind === 'autopsy' && h.event.reportType === 'PRELIMINARY') {
    const c = await deps.getCase(h.caseId);
    // The FAD was signed on this PAD: withdraw the FAD first.
    if (c?.autopsy?.fadSnapshot) return 'superseded';
  }
  return null;
}
