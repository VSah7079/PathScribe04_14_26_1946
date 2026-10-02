// src/services/patients/patientRegistryDetailsDeps.ts
// Batch 425: the real services behind patientRegistryDetails.ts (intake and the Accession page's prefill).
import type { PatientRegistryDetailsDeps } from './patientRegistryDetails';
import { mockPatientIndexService } from './mockPatientIndexService';
import { caseRouter } from '../cases/CaseRouter';
import { mockAuditService } from '../auditlog/mockAuditService';

/* eslint-disable @typescript-eslint/no-explicit-any */
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
  updateCase: (caseId, patch) => caseRouter.updateCase(caseId, patch as any),
  logAudit: event => mockAuditService.logEvent(event),
};
