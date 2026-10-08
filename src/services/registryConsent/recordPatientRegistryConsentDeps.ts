// src/services/registryConsent/recordPatientRegistryConsentDeps.ts
// Batch 418: the real services recordPatientRegistryConsent uses.
import type { RecordRegistryConsentDeps } from './recordPatientRegistryConsent';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { caseRouter } from '../cases/CaseRouter';
import { mockPatientIndexService } from '../patients/mockPatientIndexService';
import { mockAuditService } from '../auditlog/mockAuditService';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const recordPatientRegistryConsentDeps: RecordRegistryConsentDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  getCase: caseId => caseRouter.getCase(caseId) as any,
  // PS-71 (Batch 458): forwards the version the service built the save from.
  updateCase: (caseId, patch, expectedVersion) => caseRouter.updateCase(caseId, patch as any, expectedVersion),
  setInMpi: (patientId, consent) => mockPatientIndexService.setRegistryConsent(patientId, consent),
  logAudit: event => mockAuditService.logEvent(event),
  now: () => new Date().toISOString(),
};
