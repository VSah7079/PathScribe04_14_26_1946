// src/services/clinicalHistory/recordClinicalHistoryAfterAccession.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 530 (Pete, Oct 11, 2026): "Enable retroactive entry: allow
// pathologists or residents to add or reconcile the structured clinical
// history later during grossing or sign-out without failing initial intake
// requirements."
//
//   - Any case (surgical, cytology, autopsy), until it is signed out: after
//     sign-out a change belongs in an amendment.
//   - The case-level coded entries (Case.order.clinicalHistory), the same
//     ones Accession records. Per-specimen entries stay at Accession
//     (cytology).
//   - Needs case:clinical-history:record (Pathologist, Fellow, Resident,
//     PA by default). Audited with the codes added and removed (codes and
//     categories only: unmapped free text and metadata may hold PHI).
//   - Saved with updateCaseWithRetry: the change is rebuilt from the newest
//     case, so it never overwrites someone else's save.
//
// With clinical information on the case, the mismatch check can run (it was
// deferred without it: clinicalMismatchInputs.mismatchCheckDeferred).
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { RecordedClinicalHistoryEntry } from '@/types/clinicalHistory/RecordedClinicalHistoryEntry';
import { updateCaseWithRetry, type CaseWriteDeps } from '../cases/caseWrite';
import { caseSignedOut } from '../quality/peerReviewRules';

export type ClinicalHistoryRecordProblem = 'notPermitted' | 'notFound' | 'signedOut' | 'conflict' | 'noChange';

export interface ClinicalHistoryRecordDeps extends CaseWriteDeps {
  enforce(capability: string, context: { caseId: string }): Promise<{ allowed: boolean }>;
  audit(entry: NewAuditLog): Promise<unknown>;
  actorName(): string;
}

export type ClinicalHistoryRecordResult =
  | { ok: true; clinicalHistory: RecordedClinicalHistoryEntry[]; version: number }
  | { ok: false; reason: ClinicalHistoryRecordProblem };

const label = (e: RecordedClinicalHistoryEntry) => e.historyCode ?? `${e.categoryCode} (unmapped text)`;

/** The audit entry for the change, or null when nothing changed (pure; literal English). */
export function clinicalHistoryChangeAudit(
  caseId: string,
  before: readonly RecordedClinicalHistoryEntry[],
  after: readonly RecordedClinicalHistoryEntry[],
  actorName: string,
): NewAuditLog | null {
  if (JSON.stringify(before) === JSON.stringify(after)) return null;
  const was = new Set(before.map(label));
  const now = new Set(after.map(label));
  const added = [...now].filter(c => !was.has(c));
  const removed = [...was].filter(c => !now.has(c));
  const parts = [
    added.length ? `added ${added.join(', ')}` : '',
    removed.length ? `removed ${removed.join(', ')}` : '',
    !added.length && !removed.length ? 'details changed' : '',
  ].filter(Boolean);
  return {
    type: 'user', event: 'CLINICAL_HISTORY_UPDATED', caseId, user: actorName, confidence: null,
    detail: `Clinical history recorded after accession: ${parts.join('; ')} (${after.length} ${after.length === 1 ? 'entry' : 'entries'} now).`,
  };
}

export async function recordClinicalHistoryAfterAccession(
  caseId: string,
  entries: readonly RecordedClinicalHistoryEntry[],
  deps: ClinicalHistoryRecordDeps,
): Promise<ClinicalHistoryRecordResult> {
  if (!(await deps.enforce('case:clinical-history:record', { caseId })).allowed) return { ok: false, reason: 'notPermitted' };
  let before: RecordedClinicalHistoryEntry[] = [];
  let signedOut = false;
  const write = await updateCaseWithRetry(caseId, (current: Case) => {
    if (caseSignedOut(current.status)) { signedOut = true; return null; }
    before = current.order?.clinicalHistory ?? [];
    if (JSON.stringify(before) === JSON.stringify(entries)) return null;
    return { order: { ...(current.order ?? {}), clinicalHistory: [...entries] } as Case['order'] };
  }, deps);
  if (signedOut) return { ok: false, reason: 'signedOut' };
  if (write.ok === false) return { ok: false, reason: write.reason };
  const entry = clinicalHistoryChangeAudit(caseId, before, entries, deps.actorName());
  if (entry) await deps.audit(entry).catch(() => {});
  return { ok: true, clinicalHistory: [...entries], version: write.version };
}
