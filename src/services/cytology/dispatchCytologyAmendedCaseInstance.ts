// src/services/cytology/dispatchCytologyAmendedCaseInstance.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up ("Cytology has no amendment mechanism at
// all... work this"), then corrected ("Cytology cases can have
// addendums") — the real, electronic dispatch for a genuine Cytology
// correction OR addendum. Mirrors services/reports/dispatchAmendedCaseInstance.ts's
// own shape (scoped to one specific record, no dedup — each real
// correction/addendum is its own, distinct, legitimate event), but
// built against Cytology's own real, genuinely different data model —
// same real caseRouter/mockPatientIndexService resolution
// dispatchCytologyCaseInstances.ts already established, dispatched
// through the same, real Cytology-specific outbound queue and payload
// builder, never buildOruR01Payload/mockOutboundResultQueueService.
// ─────────────────────────────────────────────────────────────────────────────

import type { GenerateReportPdf } from '../reports/resolveOruReportPdf';
import { caseRouter } from '../cases/CaseRouter';
import { mockPatientIndexService } from '../patients/mockPatientIndexService';
import { mockCytologySignOutRecordService } from './mockCytologySignOutRecordService';
import { sendCaseMessage } from './dispatchCytologyCaseInstances';
import { cytologyCaseIsReleased } from './cytologyCaseReportMessage';

/**
 * Batch 532 (Pete, Oct 12, 2026: a correction or addendum reissues the whole
 * case report). Sends the consolidated case report again as CORRECTED or
 * ADDENDUM, naming the specimen that changed. If the case hasn't been released
 * yet (other specimens still to sign out), nothing was sent before, so
 * nothing is sent now: the changed record is in the case report at release.
 */
export async function dispatchCytologyAmendedCaseInstance(
  caseId: string,
  signOutRecordId: string,
  resultState: 'CORRECTED' | 'ADDENDUM',
  previouslyReportedAs?: string,
  /** Batch 538: the release's report document. */
  generatePdf?: GenerateReportPdf,
): Promise<void> {
  const caseData = await caseRouter.getCase(caseId);
  if (!caseData || !cytologyCaseIsReleased(caseData)) return;

  const patientId = (caseData as any)?.patient?.id;
  const patientRecord = patientId ? await mockPatientIndexService.getById(patientId) : null;
  // Non-blocking skip: no organisationId to enqueue against.
  if (!patientRecord) return;

  const recordsRes = await mockCytologySignOutRecordService.getByCaseId(caseId);
  if (!recordsRes.ok || !recordsRes.data.some(r => r.id === signOutRecordId)) return;
  await sendCaseMessage(caseData, recordsRes.data, (patientRecord as any).organisationId, resultState, signOutRecordId, previouslyReportedAs, generatePdf);
}
