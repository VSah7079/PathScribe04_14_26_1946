// src/services/patientIdentifiers/recordNationalPatientIdentifierDeps.ts
// Batch 417: the real services recordNationalPatientIdentifier uses.
import type { RecordNationalIdentifierDeps } from './recordNationalPatientIdentifier';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { caseRouter } from '../cases/CaseRouter';
import { patientIndexService } from '../patients/patientServicesInstance';
import { auditService } from '../auditlog/auditServiceInstance';
import { outboundPatientAdtQueueService } from '../patients/patientServicesInstance';

export const recordNationalPatientIdentifierDeps: RecordNationalIdentifierDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  getCase: caseId => caseRouter.getCase(caseId) as any,
  // PS-71 (Batch 458): forwards the version the service built the save from.
  updateCase: (caseId, patch, expectedVersion) => caseRouter.updateCase(caseId, patch as any, expectedVersion),
  recordInMpi: (patientId, identifier) => patientIndexService.recordNationalIdentifier(patientId, identifier),
  removeFromMpi: (patientId, system) => patientIndexService.removeNationalIdentifier(patientId, system),
  // Batch 425: the existing A08, so the engine hears of a change made after accessioning.
  announceDemographicUpdate: async patientId => {
    const record = await patientIndexService.getById(patientId);
    if (record) await outboundPatientAdtQueueService.enqueue({ eventType: 'A08_DEMOGRAPHIC_UPDATE', organisationId: record.organisationId, sourcePatientId: patientId, sourceOperation: 'recordNationalIdentifier' });
  },
  logAudit: event => auditService.logEvent(event),
  now: () => new Date().toISOString(),
};
