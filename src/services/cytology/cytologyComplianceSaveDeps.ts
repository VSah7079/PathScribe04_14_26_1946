// src/services/cytology/cytologyComplianceSaveDeps.ts
// Batch 415: the real services saveCytologyComplianceFeatures uses.
import type { CytologyComplianceSaveDeps } from './saveCytologyComplianceFeatures';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { cytologyComplianceFeaturesService } from './cytologyComplianceFeaturesServiceInstance';
import { auditService } from '../auditlog/auditServiceInstance';

export const cytologyComplianceSaveDeps: CytologyComplianceSaveDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  setEnterprise: settings => cytologyComplianceFeaturesService.setEnterprise(settings),
  setFacility: (facilityId, settings) => cytologyComplianceFeaturesService.setFacility(facilityId, settings),
  logAudit: event => auditService.logEvent(event),
};
