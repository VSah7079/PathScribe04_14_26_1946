// src/services/facilities/resolveCasePerformingLab.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 434: the performing lab whose billing (and policy) a case falls under.
//
// A case's originHospitalId is either a facility id or one of the legacy
// tenant ids ('HOSP-002') that most seeded cases still carry
// (Facility.legacyTenantIds, resolved by auth/resolveTenantFacility.ts).
// Batch 433's charge approval looked the id up directly, so for those cases
// it found no lab: the "Performing lab" column was blank, the approval
// permission was checked with no facility, and the lab's "Charges need
// billing approval" setting was never applied to them. Both now use this.
// Pure: the caller passes the facility list.
// ─────────────────────────────────────────────────────────────────────────────

import { resolvePerformingLabFacilityId, type Facility } from './IFacilityService';
import { resolveTenantFacility } from '../auth/resolveTenantFacility';

export function resolveCasePerformingLab(
  caseRecord: { originHospitalId?: string | null } | null | undefined,
  facilities: readonly Facility[],
): Facility | undefined {
  const origin = caseRecord?.originHospitalId;
  if (!origin) return undefined;
  const ordering = facilities.find(f => f.id === origin) ?? resolveTenantFacility(origin, [...facilities]);
  if (!ordering) return undefined;
  const labId = resolvePerformingLabFacilityId(ordering);
  return labId ? facilities.find(f => f.id === labId) : undefined;
}

/** The lab's enterprise: the lab itself when it is one, else its parent (pure). */
export function enterpriseOf(lab: Facility | undefined, facilities: readonly Facility[]): Facility | undefined {
  if (!lab) return undefined;
  if (lab.isEnterprise) return lab;
  return lab.parentId ? facilities.find(f => f.id === lab.parentId) : undefined;
}
