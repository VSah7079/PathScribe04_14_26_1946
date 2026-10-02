// src/services/cancerRegistry/cancerRegistrySettingsDeps.ts
// Batch 422: the real services saveCancerRegistrySettings uses.
import type { CancerRegistrySettingsDeps } from './saveCancerRegistrySettings';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockCancerRegistrySettingsService } from './mockCancerRegistrySettingsService';
import { mockFacilityCancerRegistryOverrideService } from './mockFacilityCancerRegistryOverrideService';
import { mockAuditService } from '../auditlog/mockAuditService';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const cancerRegistrySettingsDeps: CancerRegistrySettingsDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  updateEnterprise: patch => mockCancerRegistrySettingsService.update(patch),
  getFacilityOverride: facilityId => mockFacilityCancerRegistryOverrideService.getForFacility(facilityId) as any,
  createFacilityOverride: (facilityId, registryId) => mockFacilityCancerRegistryOverrideService.create(facilityId, { registryId }),
  updateFacilityOverride: (facilityId, registryId) => mockFacilityCancerRegistryOverrideService.update(facilityId, { registryId }),
  removeFacilityOverride: facilityId => mockFacilityCancerRegistryOverrideService.remove(facilityId),
  logAudit: event => mockAuditService.logEvent(event),
};
