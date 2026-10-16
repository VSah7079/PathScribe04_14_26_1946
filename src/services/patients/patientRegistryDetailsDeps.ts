// src/services/patients/patientRegistryDetailsDeps.ts
// Batch 425: the real services behind patientRegistryDetails.ts (intake and the Accession page's prefill).
import type { PatientRegistryDetailsDeps } from './patientRegistryDetails';
import { mockPatientIndexService } from './mockPatientIndexService';
import { caseRouter } from '../cases/CaseRouter';
import { mockAuditService } from '../auditlog/mockAuditService';

export const patientRegistryDetailsDeps: PatientRegistryDetailsDeps = {
  resolvePatient: (authority, value) => mockPatientIndexService.resolveByIdentifier(authority, value),
  getPatient: id => mockPatientIndexService.getById(id) as any,
  listNationalIdentifiers: id => mockPatientIndexService.listNationalIdentifiers(id),
  recordInMpi: (id, identifier) => mockPatientIndexService.recordNationalIdentifier(id, identifier),
  setConsentInMpi: (id, consent) => mockPatientIndexService.setRegistryConsent(id, consent),
  // System to system: every case of the patient, not only those the signed-in user can see.
  casesForPatient: async id => {
    const all = await caseRouter.getAll(undefined, { bypassAccessControl: true });
    return all.ok ? (all.data as any[]).filter(c => c.patient?.id === id) : [];
  },
  // PS-71 (Batch 458): one case, read the same system-to-system way, and a
  // save that carries the version it was built from.
  getCase: async caseId => {
    const all = await caseRouter.getAll(undefined, { bypassAccessControl: true });
    return all.ok ? (all.data as any[]).find(c => c.id === caseId) : undefined;
  },
  updateCase: (caseId, patch, expectedVersion) => caseRouter.updateCase(caseId, patch as any, expectedVersion),
  logAudit: event => mockAuditService.logEvent(event),
};
