// src/services/screeningRegistry/screeningRegistrySettingsDeps.ts
// Batch 414: the real services saveScreeningRegistrySettings uses, wired once.
import type { ScreeningRegistrySettingsDeps } from './saveScreeningRegistrySettings';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockRegistrySettingsService } from '../facilities/mockRegistrySettingsService';
import { mockFacilityRegistryOverrideService } from '../facilities/mockFacilityRegistryOverrideService';
import { mockScreeningRegistryConfigService } from './mockScreeningRegistryConfigService';
import { mockAuditService } from '../auditlog/mockAuditService';

export const screeningRegistrySettingsDeps: ScreeningRegistrySettingsDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  updateEnterprise: registryId => mockRegistrySettingsService.update({ registryId }),
  getFacilityOverride: facilityId => mockFacilityRegistryOverrideService.getForFacility(facilityId) as any,
  createFacilityOverride: (facilityId, registryId) => mockFacilityRegistryOverrideService.create(facilityId, { registryId }),
  updateFacilityOverride: (facilityId, registryId) => mockFacilityRegistryOverrideService.update(facilityId, { registryId }),
  removeFacilityOverride: facilityId => mockFacilityRegistryOverrideService.remove(facilityId),
  saveConfig: config => mockScreeningRegistryConfigService.save(config),
  getConfig: async registryId => { const r = await mockScreeningRegistryConfigService.get(registryId); return r.ok ? r.data : undefined; },
  logAudit: event => mockAuditService.logEvent(event),
  now: () => new Date(),
};
