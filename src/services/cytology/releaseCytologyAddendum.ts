// src/services/cytology/releaseCytologyAddendum.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct correction ("Cytology cases can have addendums...
// Addendum: appends new, additional data or subsequent test results to
// the report while leaving the original diagnosis intact") — the real
// addendum mechanism, genuinely simpler than releaseCytologyCorrection.ts
// because nothing about the underlying diagnosis changes here. No new
// CytologyReviewRecord is created — the new sign-out record references
// the SAME reviewRecordId as the one it adds to, since the actual
// clinical finding is unchanged; only the report content grows a new
// addendumText, and everything else is carried forward unaltered from
// the prior record. Same real "always written, never edited" posture
// as every other real event in this module: a new, linked
// CytologySignOutRecord (addsToRecordId), never a mutation of the one
// it supplements.
// ─────────────────────────────────────────────────────────────────────────────

import { revisionAllowedNow, REVISION_IN_RELEASE_DELAY } from '../reportRelease/revisionDuringDelay';
import { mockCytologySignOutRecordService } from './mockCytologySignOutRecordService';
import { publishCytologyRevision } from './publishCytologyRevision';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { resolvePerformingLabFacility } from './resolveCytologyReportLanguage';
import { resolveReportLanguage } from '../reports/reportLanguage';
import { reportLocaleOf } from './resolveCytologyReportLanguage';

export interface ReleaseCytologyAddendumResult {
  ok: boolean;
  /** Batch 540: refused, the case report is still in its release delay (recall it instead). */
  inReleaseDelay?: boolean;
  /** Batch 532: whether the case report was reissued (false while the case is still open: it goes out at release). */
  published?: boolean;
  signOutRecordId?: string;
  error?: string;
  /** Batch 390: the user lacks cytology:report:addend. */
  notPermitted?: true;
  /** Batch 390: no reason, or no addendum text, was given. */
  reasonMissing?: true;
  textMissing?: true;
}

export async function releaseCytologyAddendum(
  caseId: string,
  specimenId: string,
  addendumText: string,
  addingUser: { id: string; name: string; isPathologist: boolean },
  /** Batch 390 (PS-340): why the addendum is being added. Mandatory, stored on the new sign-out record and printed on the PDF. */
  reason: string,
  facilityId?: string,
  generatePdf?: () => Promise<{ pdfBase64?: string; generationError?: string }>,
  /** Batch 534: the registry submission that goes out with the reissued report (when the case is released). */
  registry?: { isGynCytology: boolean; categories: import('./ICytologyCategoryService').CytologyCategoryEntry[] },
): Promise<ReleaseCytologyAddendumResult> {
  // Batch 390 (PS-340): an addendum needs its own permission, some text and a reason.
  const decision = await authorizationService.enforce('cytology:report:addend', { caseId });
  if (!decision.allowed) return { ok: false, notPermitted: true, error: 'Adding an addendum to a signed-out cytology report needs the cytology:report:addend permission.' };
  const revisionReason = (reason ?? '').trim();
  if (revisionReason === '') return { ok: false, reasonMissing: true, error: 'A reason for the addendum is required.' };
  // Batch 540 (Pete): not while the case report is still in its release delay; it is recalled instead.
  if (!(await revisionAllowedNow(caseId))) return { ok: false, inReleaseDelay: true, error: REVISION_IN_RELEASE_DELAY };
  const text = (addendumText ?? '').trim();
  if (text === '') return { ok: false, textMissing: true, error: 'The addendum text is required.' };

  const priorRecordsRes = await mockCytologySignOutRecordService.getBySpecimenId(specimenId);
  if (!priorRecordsRes.ok || priorRecordsRes.data.length === 0) {
    return { ok: false, error: 'No prior sign-out exists for this specimen — nothing to add an addendum to.' };
  }
  const priorRecord = [...priorRecordsRes.data].sort((a, b) => b.signedAt.localeCompare(a.signedAt))[0];

  const signedAtIso = new Date().toISOString();

  // Real, per PS-277 §1.2.3 — "Addenda forced onto a dedicated page
  // when configured by client policy." facilityId was already a real
  // param here (threaded through to publishReportReleasedEvent's own
  // performingFacilityId); this resolves the real performing lab's own
  // print policy the exact same way every other performing-lab-scoped
  // Facility setting in this app resolves (resolvePerformingLabFacilityId),
  // rather than leaving this as a disclosed, not-yet-wired gap. A real,
  // honest failure to resolve (no facilityId given, facility not found,
  // no performing_lab role/override anywhere) leaves this undefined —
  // the renderer's own existing-behavior default, never a thrown error
  // over what's genuinely just a print-layout preference.
  // Batch 391: the same performing-lab lookup gives the report's language when
  // the record being added to has none.
  const performingLab = await resolvePerformingLabFacility(facilityId);
  const forceAddendumOnDedicatedPage: boolean | undefined = performingLab?.forceAddendumOnDedicatedPagePrintPolicy;

  // Real, per this file's own header — the original diagnosis stays
  // exactly what it was; only addendumText, signedBy, signedAt, and the
  // real print-policy flag above change from the prior record's own
  // real report content.
  const reportContent = {
    ...priorRecord.reportContent,
    addendumText: text,
    // Batch 391: an addendum keeps the language of the report it adds to.
    language: priorRecord.reportContent.language ?? resolveReportLanguage(performingLab),
    locale: priorRecord.reportContent.language ? priorRecord.reportContent.locale : reportLocaleOf(performingLab),
    revision: { kind: 'addendum' as const, reason: revisionReason },
    signedBy: { name: addingUser.name, isPathologist: addingUser.isPathologist },
    signedAt: signedAtIso,
    forceAddendumOnDedicatedPage,
  };

  const createRes = await mockCytologySignOutRecordService.create({
    caseId, specimenId,
    reviewRecordId: priorRecord.reviewRecordId,
    reportContent,
    signedBy: { userId: addingUser.id, userName: addingUser.name, isPathologist: addingUser.isPathologist },
    addsToRecordId: priorRecord.id,
    revisionReason,
  });
  if (!createRes.ok) return { ok: false, error: 'Could not create the addendum sign-out record.' };
  const newRecord = createRes.data;

  // Batch 532 (Pete, Oct 12): the whole case report is reissued, once the case has been released.
  const published = await publishCytologyRevision({
    caseId,
    instanceId: newRecord.id,
    reportType: 'ADDENDUM',
    releasedAt: signedAtIso,
    releasedBy: { id: addingUser.id, name: addingUser.name },
    performingFacilityId: facilityId,
    ...(generatePdf ? { generatePdf } : {}),
    ...(registry ? { registry } : {}),
  });

  return { ok: true, signOutRecordId: newRecord.id, published };
}
