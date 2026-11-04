// src/services/caseAttachments/reportEditState.ts
// Batch 742: whether a report can take or lose a placement now. On an Assist case (Pete, Oct 30, 2026) the primary LIS
// writes the report, so nothing is placed in a report at all: attachments there are references for the working case.
// Otherwise: A signed report (pending release or finalized)
// changes only through an amendment or addendum in progress (an amendment record in draft), so a photo or file
// placed after sign-out appears in the report the amendment releases, never silently in a reprint. Pure.
import type { ReportEditState } from '../imageAssociation/caseReportImages';

const SIGNED_STATUSES = ['pending-release', 'finalized'];

export function reportEditStateFor(caseStatus: string | null | undefined, amendments: readonly { status?: string }[], reportingMode?: string | null): ReportEditState {
  return {
    signed: SIGNED_STATUSES.includes(caseStatus ?? ''), amendmentOpen: amendments.some(a => a.status === 'draft'),
    ...(reportingMode === 'assist' ? { lisOwnsReport: true } : {}),
  };
}
