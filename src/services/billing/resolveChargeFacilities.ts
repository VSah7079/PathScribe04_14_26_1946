// src/services/billing/resolveChargeFacilities.ts
// Batch 618 (PS-336): which lab performed each charge of a split case.
// The technical charge (TC) belongs to the technical-component lab when the case names
// one that is a different lab from the reporting lab; the professional (26) and global
// charges belong to the reporting lab. A case with no second facility, or with the same
// lab on both sides, is not split and every charge stays with the reporting lab.
// When each charge is released is unchanged (codeMapTable.ts BILLING_TYPE_DEFAULT_TRIGGER:
// TC at grossing; 26 and Global at sign-out).

import type { Facility } from '../facilities/IFacilityService';
import { resolvePerformingLabFacilityId } from '../facilities/IFacilityService';

export type ChargeBillingType = 'TC' | '26' | 'Global';

/** The technical lab of a genuinely split case, or undefined. */
export function resolveSplitTechnicalFacility(reporting: Facility | undefined, technical: Facility | undefined): Facility | undefined {
  if (!reporting || !technical) return undefined;
  return resolvePerformingLabFacilityId(technical) === resolvePerformingLabFacilityId(reporting) ? undefined : technical;
}

/** The facility id a charge is performed at; undefined when no reporting lab is known. */
export function resolveChargePerformingFacilityId(
  billingType: ChargeBillingType | undefined,
  reportingFacilityId: string | undefined,
  splitTechnical: Facility | undefined,
): string | undefined {
  if (billingType === 'TC' && splitTechnical) return splitTechnical.id;
  return reportingFacilityId;
}
