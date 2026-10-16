// src/services/cytology/publishCytologyRevision.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 532 (Pete, Oct 12, 2026: a correction or addendum to one specimen
// "reissues the whole case report"). Shared by releaseCytologyCorrection.ts
// and releaseCytologyAddendum.ts:
//
//   - the case has been released (every specimen signed, or finalized early):
//     the consolidated case report goes out again as CORRECTED or ADDENDUM,
//     naming the specimen that changed (dispatchCytologyAmendedCaseInstance);
//   - not released yet: nothing was published, so nothing is now. The new
//     record is part of the case report when the case is released.
// Returns whether it published.
//
// Batch 534 (Pete: every report output follows the release delay): through
// releaseReport, so it waits out the laboratory's delay and its sender can
// recall it (the record is then marked recalled). Its registry submission goes
// with it (`registry`), now or when the delay ends; the caller no longer sends it.
// ─────────────────────────────────────────────────────────────────────────────

import { caseRouter } from '../cases/CaseRouter';
import { mockCytologySignOutRecordService } from './mockCytologySignOutRecordService';
import { cytologyCaseIsReleased } from './cytologyCaseReportMessage';

export interface CytologyRevisionRelease {
  caseId: string;
  instanceId: string;
  reportType: 'CORRECTED' | 'ADDENDUM';
  releasedAt: string;
  releasedBy: { id: string; name: string };
  performingFacilityId?: string;
  previouslyReportedAs?: string;
  /** A caller's own PDF (tests); otherwise the consolidated case report. */
  generatePdf?: () => Promise<{ pdfBase64?: string; generationError?: string }>;
  /** Batch 534: the registry submission that goes with it (absent: none). */
  registry?: { isGynCytology: boolean; categories: import('./ICytologyCategoryService').CytologyCategoryEntry[] };
}

export async function publishCytologyRevision(release: CytologyRevisionRelease): Promise<boolean> {
  const caseData = await caseRouter.getCase(release.caseId).catch(() => null);
  if (!caseData || !cytologyCaseIsReleased(caseData)) return false;
  const { registry, ...event } = release;
  const { releaseThroughDelay } = await import('../reportRelease/releaseThroughDelay');
  await releaseThroughDelay({
    ...event,
    source: 'CYTOLOGY',
    generatePdf: release.generatePdf ?? (async () => {
      const records = await mockCytologySignOutRecordService.getByCaseId(release.caseId);
      const [{ resolveCytologyCaseReport }, { generateCytologyCaseReportPdfSnapshot }] = await Promise.all([
        import('./resolveCytologyCaseReport'), import('./generateCytologyCaseReportPdf'),
      ]);
      return generateCytologyCaseReportPdfSnapshot(resolveCytologyCaseReport(caseData, records.ok ? records.data : []));
    }),
  }, {
    kind: 'cytology-revision',
    releasedBy: { userId: release.releasedBy.id, userName: release.releasedBy.name },
    subject: { recordId: release.instanceId },
    followUps: registry ? [{
      type: 'cytology-revision-registry', recordId: release.instanceId, revision: release.reportType === 'CORRECTED' ? 'correction' : 'addendum',
      isGynCytology: registry.isGynCytology, categories: registry.categories,
    }] : [],
  });
  return true;
}
