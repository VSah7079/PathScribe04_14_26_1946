// src/services/cancerRegistry/resolveEffectiveCancerRegistrySettings.ts
// Real, pure resolution — mirrors resolveEffectiveCytologyRegistrySettings.ts exactly.
import type { CancerRegistrySettingsConfig } from './ICancerRegistrySettingsService';
import type { FacilityCancerRegistryOverride } from './IFacilityCancerRegistryOverrideService';

export function resolveEffectiveCancerRegistrySettings(
  enterpriseDefault: CancerRegistrySettingsConfig,
  facilityOverride: FacilityCancerRegistryOverride | null,
): CancerRegistrySettingsConfig {
  return {
    ...enterpriseDefault,
    ...(facilityOverride?.overrides ?? {}),
  };
}

/** Batch 423: every cancer registry the lab reports to (the enterprise's, then the facility overrides'),
 *  once each, 'none' left out: each needs its own go-live approval. */
export function cancerRegistriesInUse<T extends string>(enterpriseRegistryId: T, overrideRegistryIds: (T | undefined)[]): Exclude<T, 'none'>[] {
  const out: Exclude<T, 'none'>[] = [];
  for (const id of [enterpriseRegistryId, ...overrideRegistryIds]) {
    if (id && id !== 'none' && !out.includes(id as Exclude<T, 'none'>)) out.push(id as Exclude<T, 'none'>);
  }
  return out;
}
