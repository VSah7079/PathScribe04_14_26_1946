// src/services/facilities/resolveSplitReportBranding.ts
// Batch 606 (PS-37): the second branding block for a split '26' report. The
// reporting lab's branding resolves as before (resolveFacilityPrintBranding).
// When the case also names a technical-component facility that is a different
// lab, that facility's block resolves too, with the director and CLIA/ISO number
// withheld, because no pathologist signed an interpretation under that
// facility's attribution (the same rule the 'TC' billing type already follows).

import type { Facility } from './IFacilityService';
import { resolveFacilityPrintBranding } from './resolveFacilityPrintBranding';
import { resolvePerformingLabFacilityId } from './IFacilityService';
import type { Department } from '../departments/IDepartmentService';
import type { ResolvedPrintBranding } from '@/types/config/FacilityBranding';
import type { CaseStatus } from '@/types/case/CaseStatus';
import { isCaseSignedOutForBilling } from '../billing/isCaseSignedOutForBilling';

export interface SplitReportBranding {
  /** The lab reporting the case. */
  professional?: ResolvedPrintBranding;
  /** The lab that did the technical work; absent when the case is not split. */
  technical?: ResolvedPrintBranding;
}

export function resolveSplitReportBranding(
  orderingFacility: Facility | undefined,
  technicalComponentFacilityId: string | undefined,
  allFacilities: Facility[],
  department?: Department,
): SplitReportBranding {
  if (!orderingFacility) return {};
  const professional = resolveFacilityPrintBranding(orderingFacility, allFacilities, department, '26');
  if (!technicalComponentFacilityId) return { professional };
  const technicalFacility = allFacilities.find(f => f.id === technicalComponentFacilityId);
  if (!technicalFacility) return { professional };
  // The same lab doing both halves is not a split.
  if (resolvePerformingLabFacilityId(technicalFacility) === resolvePerformingLabFacilityId(orderingFacility)) return { professional };
  const technical = resolveFacilityPrintBranding(technicalFacility, allFacilities, undefined, 'TC');
  return technical ? { professional, technical } : { professional };
}

/** Batch 618 (PS-336): the technical lab's block goes on the report only once the case is signed out, never on a draft. */
export function technicalBrandingForRender(split: SplitReportBranding, status: CaseStatus | undefined): ResolvedPrintBranding | undefined {
  return split.technical && isCaseSignedOutForBilling(status) ? split.technical : undefined;
}
