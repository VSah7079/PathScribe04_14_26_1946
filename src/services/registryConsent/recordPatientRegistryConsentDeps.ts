// src/services/registryConsent/recordPatientRegistryConsentDeps.ts
// Batch 418: the real services recordPatientRegistryConsent uses.
import type { RecordRegistryConsentDeps } from './recordPatientRegistryConsent';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { caseRouter } from '../cases/CaseRouter';
import { patientIndexService } from '../patients/patientServicesInstance';
import { auditService } from '../auditlog/auditServiceInstance';

export const recordPatientRegistryConsentDeps: RecordRegistryConsentDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  getCase: caseId => caseRouter.getCase(caseId) as any,
  // PS-71 (Batch 458): forwards the version the service built the save from.
  updateCase: (caseId, patch, expectedVersion) => caseRouter.updateCase(caseId, patch as any, expectedVersion),
  setInMpi: (patientId, consent) => patientIndexService.setRegistryConsent(patientId, consent),
  logAudit: event => auditService.logEvent(event),
  now: () => new Date().toISOString(),
};
