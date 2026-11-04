// src/types/reportRelease/HeldRelease.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 534 (Pete, Oct 12, 2026: "Any report output, unless it's a
// resubmission to an output failure, should follow the consistent delay
// rule"). A report output waiting out the laboratory's release delay: what
// was released, by whom, when it goes, what Recall reopens, and what else
// goes with it (a registry submission). The surgical FINAL sign-out keeps its
// own buffer on the case (status 'pending-release'), recalled from its banner;
// it is tracked here too (kind 'surgical-sign-out') so it is released on
// time with no page open. Everything else waits here
// (services/reportRelease/releaseReport.ts).
// ─────────────────────────────────────────────────────────────────────────────

import type { ReportReleasedEventType } from '@/services/reports/publishReportReleasedEvent';

/** What was released, which decides what Recall reopens. */
export type HeldReleaseKind =
  | 'surgical-sign-out'        // the surgical FINAL sign-out buffer (kept on the case); tracked here so it is released on time
  | 'cytology-sign-out'        // a cytology case report (FINAL) when the last specimen is signed
  | 'cytology-late-sign-out'   // a specimen signed after an early finalization (ADDENDUM)
  | 'cytology-finalize-early'  // a case finalized before every specimen was signed (FINAL)
  | 'cytology-revision'        // a cytology correction or addendum (CORRECTED / ADDENDUM)
  | 'cytology-preliminary'     // an urgent cytology preliminary (Batch 533)
  | 'surgical-preliminary'     // a surgical preliminary report
  | 'surgical-amendment'       // a surgical correction or addendum
  | 'autopsy';                 // an autopsy PAD (PRELIMINARY) or FAD (FINAL)

/** Another output that goes, or is withdrawn, with the report. */
/** The cytology dictionary entries the result was signed with (kept so the registry submission uses the same wording). */
type HeldCategories = import('@/services/cytology/ICytologyCategoryService').CytologyCategoryEntry[];

export type HeldReleaseFollowUp =
  | { type: 'cytology-registry'; recordIds: string[]; isGynCytology: boolean; categories: HeldCategories }
  | { type: 'cytology-revision-registry'; recordId: string; revision: 'correction' | 'addendum'; isGynCytology: boolean; categories: HeldCategories };

/** The release event, as stored (the PDF is kept separately, made when it was released). */
export interface HeldReleaseEvent {
  caseId: string;
  reportType: ReportReleasedEventType;
  releasedAt: string;
  releasedBy?: { id: string; name: string };
  performingFacilityId?: string;
  priority?: 'Routine' | 'Urgent';
  source?: 'SURGPATH' | 'CYTOLOGY';
  instanceId?: string;
  previouslyReportedAs?: string;
}

export interface HeldRelease {
  id: string;
  caseId: string;
  kind: HeldReleaseKind;
  event: HeldReleaseEvent;
  /** The report PDF as it was when released: sent as is when the delay ends, and stored then as the
   *  release's report document (Batch 538). */
  pdfBase64?: string;
  pdfError?: string;
  followUps: HeldReleaseFollowUp[];
  /** What Recall reopens: the record or release, and the case status to go back to. */
  subject?: {
    recordId?: string; specimenId?: string; previousStatus?: string;
    /** Batch 535: the surgical report instance a correction or addendum belongs to, and its revision label before. */
    instanceId?: string; previousRevisionType?: string;
  };
  heldAt: string;
  expiresAt: string;
  releasedBy: { userId: string; userName: string };
  status: 'held' | 'released' | 'recalled';
  sentAt?: string;
  recalledAt?: string;
}
