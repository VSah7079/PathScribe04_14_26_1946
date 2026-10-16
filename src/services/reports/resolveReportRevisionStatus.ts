// src/services/reports/resolveReportRevisionStatus.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 495 (PS-283 §4.2.2): "re-printed documents following an addendum/
// amendment must visibly show revision status in header and body, detailing
// original sign-out date vs. amendment date."
//
// Before this batch the printed paths disagreed:
//   - The assist-mode (CoPilot) print showed the amended flag, the reason and
//     an "originally reported / currently reported" table per section, but no
//     dates in the header.
//   - The preview window (retired in Batch 497) and the report page's HTML
//     fallback print (ReportPreviewRenderer) showed nothing about revisions.
//   - The orchestration PDF sent `amendments` to render_report
//     (functions/main.py, in this repo), which ignored them (found in the
//     Batch 496 audit; Batch 495 had called the service external, wrongly).
//     Since Batch 498 the app also sends `revision` (buildReportRenderRevision)
//     and the renderer draws it on page 1 and in every page's footer.
// This pure resolver gives every in-repo render path the same answer, and the
// orchestration PDF payload carries it too.
//
// Original sign-out date: Case.finalizedAt, stamped at the first sign-out.
// Releasing an amendment never rewrites it (mockAmendmentService.release only
// writes the amendment record's own releasedAt).
// ─────────────────────────────────────────────────────────────────────────────

import type { AmendmentRecord, AmendmentType } from '@/types/reports/AmendmentRecord';

export interface ReportRevisionStatus {
  /** The type of the most recent released revision. */
  latestType: AmendmentType;
  /** How many released revisions the report has. */
  revisionCount: number;
  /** When the report was first signed out; null when unknown. */
  originalSignOutAt: string | null;
  /** When the most recent revision was released. */
  latestRevisionAt: string;
}

/** Null when the report has no released revision (pure). */
export function resolveReportRevisionStatus(
  caseRecord: { finalizedAt?: string | null } | null | undefined,
  amendments: ReadonlyArray<Pick<AmendmentRecord, 'type' | 'status' | 'releasedAt'>>,
): ReportRevisionStatus | null {
  const released = amendments
    .filter(a => a.status === 'released' && !!a.releasedAt)
    .sort((a, b) => a.releasedAt!.localeCompare(b.releasedAt!));
  if (released.length === 0) return null;
  const latest = released[released.length - 1];
  return {
    latestType: latest.type,
    revisionCount: released.length,
    originalSignOutAt: caseRecord?.finalizedAt ?? null,
    latestRevisionAt: latest.releasedAt!,
  };
}
