// src/services/quality/biopsyResectionCorrelationSettings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 453 (PS-156 follow-up, PS-324): the surgical biopsy-to-resection
// correlation window, configured the same way as the cyto-histo window
// (enterprise → jurisdiction → facility), instead of a fixed 180 days from
// receipt. Default: 180 days from the earlier specimen's collection, falling
// back to receipt, then the earlier case's sign-out (Pete, Oct 4: the
// clinical clock starts at collection). Changing it needs
// config:biopsy-resection-correlation:manage.
// ─────────────────────────────────────────────────────────────────────────────

import { createCorrelationSettingsServices } from '../cytology/mockCytologyHistologyCorrelationSettingsService';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { resolveEffectiveCorrelationRule, type EffectiveCorrelationRule } from '../cytology/cytologyHistologyCorrelationWindow';

const services = createCorrelationSettingsServices({
  settingsKey: 'biopsyResectionCorrelationSettings',
  overridesKey: 'facilityBiopsyResectionCorrelationOverrides',
});

export const mockBiopsyResectionCorrelationSettingsService = guardConfigWrites(services.settings, [
  ['config:biopsy-resection-correlation:manage', ['update', 'reset']],
]);
export const mockFacilityBiopsyResectionCorrelationOverrideService = guardConfigWrites(services.overrides, [
  ['config:biopsy-resection-correlation:manage', ['set', 'remove']],
]);

/** The rule for a facility (enterprise → its jurisdiction → its override). */
export async function getEffectiveBiopsyResectionRule(facilityId: string | undefined): Promise<EffectiveCorrelationRule> {
  const { mockFacilityService } = await import('../facilities/mockFacilityService');
  const settings = await mockBiopsyResectionCorrelationSettingsService.get();
  const facility = facilityId ? await mockFacilityService.getById(facilityId) : null;
  const override = facilityId ? await mockFacilityBiopsyResectionCorrelationOverrideService.getForFacility(facilityId) : null;
  return resolveEffectiveCorrelationRule(
    settings.ok ? settings.data : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    facility && facility.ok ? (facility.data as any)?.jurisdiction ?? null : null,
    override && override.ok ? override.data : null,
  );
}
