// src/services/reports/buildReportRenderRevision.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 498 (PS-283 §4.2.2, PS-333): the revision block sent to the PDF
// renderer (functions/main.py render_report, `revision`). Same answer as the
// in-app banner (resolveReportRevisionStatus), with the dates already written
// in the report's locale — the renderer formats nothing itself, the same rule
// it follows for the date of birth (Batch 392).
// ─────────────────────────────────────────────────────────────────────────────

import { formatDateTime } from '@/utils/formatDate';
import type { ReportRevisionStatus } from './resolveReportRevisionStatus';

export interface ReportRenderRevision {
  type: ReportRevisionStatus['latestType'];
  revisionCount: number;
  originalSignOutAt: string | null;
  latestRevisionAt: string;
}

/** Undefined when the report has no released revision (pure). */
export function buildReportRenderRevision(status: ReportRevisionStatus | null, locale: string): ReportRenderRevision | undefined {
  if (!status) return undefined;
  return {
    type: status.latestType,
    revisionCount: status.revisionCount,
    originalSignOutAt: status.originalSignOutAt ? formatDateTime(status.originalSignOutAt, locale) : null,
    latestRevisionAt: formatDateTime(status.latestRevisionAt, locale),
  };
}
