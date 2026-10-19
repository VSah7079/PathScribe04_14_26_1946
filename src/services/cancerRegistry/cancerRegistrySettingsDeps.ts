// src/services/cancerRegistry/cancerRegistrySettingsDeps.ts
// Batch 422: the real services saveCancerRegistrySettings uses.
import type { CancerRegistrySettingsDeps } from './saveCancerRegistrySettings';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { cancerRegistrySettingsService } from './cancerRegistrySettingsServiceInstance';
import { facilityCancerRegistryOverrideService } from './facilityCancerRegistryOverrideServiceInstance';
import { mockAuditService } from '../auditlog/mockAuditService';

export const cancerRegistrySettingsDeps: CancerRegistrySettingsDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  updateEnterprise: patch => cancerRegistrySettingsService.update(patch),
  getFacilityOverride: facilityId => facilityCancerRegistryOverrideService.getForFacility(facilityId) as any,
  createFacilityOverride: (facilityId, registryId) => facilityCancerRegistryOverrideService.create(facilityId, { registryId }),
  updateFacilityOverride: (facilityId, registryId) => facilityCancerRegistryOverrideService.update(facilityId, { registryId }),
  removeFacilityOverride: facilityId => facilityCancerRegistryOverrideService.remove(facilityId),
  logAudit: event => mockAuditService.logEvent(event),
};
