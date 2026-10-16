// src/services/patientIdentifiers/recordNationalPatientIdentifierDeps.ts
// Batch 417: the real services recordNationalPatientIdentifier uses.
import type { RecordNationalIdentifierDeps } from './recordNationalPatientIdentifier';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { caseRouter } from '../cases/CaseRouter';
import { mockPatientIndexService } from '../patients/mockPatientIndexService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { mockOutboundPatientAdtQueueService } from '../patients/mockOutboundPatientAdtQueueService';

export const recordNationalPatientIdentifierDeps: RecordNationalIdentifierDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  getCase: caseId => caseRouter.getCase(caseId) as any,
  // PS-71 (Batch 458): forwards the version the service built the save from.
  updateCase: (caseId, patch, expectedVersion) => caseRouter.updateCase(caseId, patch as any, expectedVersion),
  recordInMpi: (patientId, identifier) => mockPatientIndexService.recordNationalIdentifier(patientId, identifier),
  removeFromMpi: (patientId, system) => mockPatientIndexService.removeNationalIdentifier(patientId, system),
  // Batch 425: the existing A08, so the engine hears of a change made after accessioning.
  announceDemographicUpdate: async patientId => {
    const record = await mockPatientIndexService.getById(patientId);
    if (record) await mockOutboundPatientAdtQueueService.enqueue({ eventType: 'A08_DEMOGRAPHIC_UPDATE', organisationId: record.organisationId, sourcePatientId: patientId, sourceOperation: 'recordNationalIdentifier' });
  },
  logAudit: event => mockAuditService.logEvent(event),
  now: () => new Date().toISOString(),
};
