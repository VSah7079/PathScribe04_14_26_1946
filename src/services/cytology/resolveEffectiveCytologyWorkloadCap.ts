// src/services/cytology/resolveEffectiveCytologyWorkloadCap.ts
// Real, pure resolution — mirrors resolveEffectiveCytologyQcSettings.ts's
// own established 3-tier cascade exactly: staff override > facility
// override > Enterprise default. Real, per direct guidance: "make it
// universal but configurable at the enterprise, facility and staff
// level."
import { CYTOLOGY_WORKLOAD_CAP_MAX } from './cytologyWorkloadCapRules';
import type { CytologyWorkloadCapSettingsConfig } from './ICytologyWorkloadCapSettingsService';
import type { FacilityCytologyWorkloadCapOverride } from './IFacilityCytologyWorkloadCapOverrideService';
import type { StaffCytologyWorkloadCapOverride } from './IStaffCytologyWorkloadCapOverrideService';

export function resolveEffectiveCytologyWorkloadCap(
  enterpriseDefault: CytologyWorkloadCapSettingsConfig,
  facilityOverride: FacilityCytologyWorkloadCapOverride | null,
  staffOverride: StaffCytologyWorkloadCapOverride | null,
): CytologyWorkloadCapSettingsConfig {
  const merged = {
    ...enterpriseDefault,
    ...(facilityOverride?.overrides ?? {}),
    ...(staffOverride?.overrides ?? {}),
  };
  // Batch 576: a cap saved before caps were checked (over 100, or not a number) never loosens the limit.
  const cap = merged.dailySlideCap;
  return { ...merged, dailySlideCap: typeof cap === 'number' && Number.isFinite(cap) && cap > 0 ? Math.min(cap, CYTOLOGY_WORKLOAD_CAP_MAX) : CYTOLOGY_WORKLOAD_CAP_MAX };
}
