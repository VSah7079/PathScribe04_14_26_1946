// src/services/cytology/resolveCytologyReportLanguage.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-340 follow-up (Batch 391, Pete): a cytology report is written in the
// performing lab's language. The lookup is shared with surgical pathology and
// lives in services/reports/resolveReportLocale.ts (Batch 392); these are the
// names cytology uses.
// ─────────────────────────────────────────────────────────────────────────────

import { resolvePerformingLabFacility, reportLocaleOf, resolveReportLocaleForFacility } from '../reports/resolveReportLocale';
import { resolveReportLanguage, type ReportLanguage } from '../reports/reportLanguage';

export { resolvePerformingLabFacility, reportLocaleOf };

export async function resolveCytologyReportLanguage(facilityId: string | undefined): Promise<ReportLanguage> {
  return resolveReportLanguage(await resolvePerformingLabFacility(facilityId));
}

/** The report's language and its date format, as stored on the report at sign-out. */
export const resolveCytologyReportLocale = resolveReportLocaleForFacility;
