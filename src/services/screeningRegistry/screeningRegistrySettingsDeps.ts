// src/services/screeningRegistry/screeningRegistrySettingsDeps.ts
// Batch 414: the real services saveScreeningRegistrySettings uses, wired once.
import type { ScreeningRegistrySettingsDeps } from './saveScreeningRegistrySettings';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { registrySettingsService } from '../facilities/registrySettingsServiceInstance';
import { facilityRegistryOverrideService } from '../facilities/facilityRegistryOverrideServiceInstance';
import { screeningRegistryConfigService } from './screeningRegistryConfigServiceInstance';
import { auditService } from '../auditlog/auditServiceInstance';

export const screeningRegistrySettingsDeps: ScreeningRegistrySettingsDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  updateEnterprise: registryId => registrySettingsService.update({ registryId }),
  getFacilityOverride: facilityId => facilityRegistryOverrideService.getForFacility(facilityId) as any,
  createFacilityOverride: (facilityId, registryId) => facilityRegistryOverrideService.create(facilityId, { registryId }),
  updateFacilityOverride: (facilityId, registryId) => facilityRegistryOverrideService.update(facilityId, { registryId }),
  removeFacilityOverride: facilityId => facilityRegistryOverrideService.remove(facilityId),
  saveConfig: config => screeningRegistryConfigService.save(config),
  getConfig: async registryId => { const r = await screeningRegistryConfigService.get(registryId); return r.ok ? r.data : undefined; },
  logAudit: event => auditService.logEvent(event),
  now: () => new Date(),
};
