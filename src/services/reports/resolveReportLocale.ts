// src/services/reports/resolveReportLocale.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 391/392 (Pete: a report is written in the language of the performing
// lab). Finds the performing lab behind an ordering facility, the way every
// performing-lab setting is found (the facility's own `performingLabFacilityId`,
// else itself if it is a performing lab), and gives its report language (its
// own setting, else its jurisdiction's) and date format (its jurisdiction's).
// No facility, or no performing lab: English with US dates. Used by cytology
// (stored on the report at sign-out) and surgical pathology (sent to the
// report renderer). Moved here from cytology/ in Batch 392.
// ─────────────────────────────────────────────────────────────────────────────

import { facilityService } from '../facilities/facilityServiceInstance';
import { resolvePerformingLabFacilityId, type Facility } from '../facilities/IFacilityService';
import { resolveReportLanguage, resolveReportDateLocale, type ReportLanguage } from './reportLanguage';
import { JURISDICTION_LOCALE } from '@/types/systemConfig';
import { loadLanguage } from '@/i18n/config';

/** The performing lab behind an ordering facility, or undefined if there is none to be found. */
export async function resolvePerformingLabFacility(facilityId: string | undefined): Promise<Facility | undefined> {
  if (!facilityId) return undefined;
  const facilityRes = await facilityService.getById(facilityId);
  if (!facilityRes.ok) return undefined;
  const labId = resolvePerformingLabFacilityId(facilityRes.data);
  if (!labId) return undefined;
  if (labId === facilityRes.data.id) return facilityRes.data;
  const labRes = await facilityService.getById(labId);
  return labRes.ok ? labRes.data : undefined;
}

export function reportLocaleOf(lab: Facility | undefined): string {
  return resolveReportDateLocale(lab, j => JURISDICTION_LOCALE[j]?.locale);
}

/** The report's language and date format for the lab performing a case ordered from this facility. */
export async function resolveReportLocaleForFacility(facilityId: string | undefined): Promise<{ language: ReportLanguage; locale: string }> {
  const lab = await resolvePerformingLabFacility(facilityId);
  const language = resolveReportLanguage(lab);
  // Batch 505 (PS-475): languages load on demand; the report's may not be the screen's.
  await loadLanguage(language);
  return { language, locale: reportLocaleOf(lab) };
}
