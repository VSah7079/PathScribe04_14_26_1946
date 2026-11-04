// src/services/facilityOpsDashboard/caseFacility.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 747 (Pete's seed row S8, Video 6). A wall display profile names its facility by Facility.id (c-ent-dvmc), and so
// does a scan station; a case still carries its tenant as Case.originHospitalId, which on the seeded cases is a legacy
// tenant id (HOSP-001, mapped to its enterprise facility by Facility.legacyTenantIds, Phase 1 of the facility migration).
// The wall views compared the two directly, so no case-backed item ever matched a profile's facility and the views
// showed only what a station alone placed. Resolved here the way the support-access gate does (supportAccessGate.ts).
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { Facility } from '../facilities/IFacilityService';
import { resolveTenantFacility } from '../auth/resolveTenantFacility';

/** The facility a case belongs to, as profiles and stations name it: an id that is already a facility's is kept (a
 *  site such as Fenwick Women's stays itself, though its trust lists it among its tenant ids); a legacy tenant id
 *  becomes its enterprise facility's id; anything else is kept as it is. */
export function caseFacilityId(originHospitalId: string | null | undefined, facilities: readonly Facility[]): string | undefined {
  if (!originHospitalId) return undefined;
  if (facilities.some(f => f.id === originHospitalId)) return originHospitalId;
  return resolveTenantFacility(originHospitalId, [...facilities])?.id ?? originHospitalId;
}
