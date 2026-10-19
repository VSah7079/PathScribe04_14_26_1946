// src/services/cytology/cytologyComplianceSaveDeps.ts
// Batch 415: the real services saveCytologyComplianceFeatures uses.
import type { CytologyComplianceSaveDeps } from './saveCytologyComplianceFeatures';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { cytologyComplianceFeaturesService } from './cytologyComplianceFeaturesServiceInstance';
import { mockAuditService } from '../auditlog/mockAuditService';

export const cytologyComplianceSaveDeps: CytologyComplianceSaveDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  setEnterprise: settings => cytologyComplianceFeaturesService.setEnterprise(settings),
  setFacility: (facilityId, settings) => cytologyComplianceFeaturesService.setFacility(facilityId, settings),
  logAudit: event => mockAuditService.logEvent(event),
};
