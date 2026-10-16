// src/services/cytology/cytologyComplianceSaveDeps.ts
// Batch 415: the real services saveCytologyComplianceFeatures uses.
import type { CytologyComplianceSaveDeps } from './saveCytologyComplianceFeatures';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockCytologyComplianceFeaturesService } from './mockCytologyComplianceFeaturesService';
import { mockAuditService } from '../auditlog/mockAuditService';

export const cytologyComplianceSaveDeps: CytologyComplianceSaveDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  setEnterprise: settings => mockCytologyComplianceFeaturesService.setEnterprise(settings),
  setFacility: (facilityId, settings) => mockCytologyComplianceFeaturesService.setFacility(facilityId, settings),
  logAudit: event => mockAuditService.logEvent(event),
};
