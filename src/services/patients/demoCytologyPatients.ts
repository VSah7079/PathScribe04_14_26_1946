// src/services/patients/demoCytologyPatients.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 634 (Pete, Oct 19, 2026). The demo's cytology cases (S26-5001 onward) carry patient ids PAT-CYT-001 to 023, but nothing
// ever registered those patients in the patient index, so signing one of those cases out could not queue a result message (no
// organisation to queue it against). These are the same people, with the same ids, MRNs and names as the seed cases; the index
// adds each to its records the first time it is asked for. The organisation is the case's enterprise (the scope the index
// uses for matching). Birth dates are the seed cases' ages in the demo's year, so they stay fixed.
// ─────────────────────────────────────────────────────────────────────────────
import type { MasterPatientRecord } from './IPatientIndexService';

interface DemoCytologyPatient {
  id: string; organisationId: string; mrn: string; firstName: string; lastName: string; age: number; month: number; day: number;
}

const DEMO_YEAR = 2026;

export const DEMO_CYTOLOGY_PATIENTS: readonly DemoCytologyPatient[] = [
  { id: 'PAT-CYT-001', organisationId: 'ENT-DEFAULT', mrn: '100501', firstName: 'Maria', lastName: 'Gonzalez', age: 34, month: 4, day: 2 },
  { id: 'PAT-CYT-002', organisationId: 'ENT-DEFAULT', mrn: '100502', firstName: 'Angela', lastName: 'Torres', age: 41, month: 9, day: 18 },
  { id: 'PAT-CYT-003', organisationId: 'ENT-DEFAULT', mrn: '100503', firstName: 'Linda', lastName: 'Chen', age: 29, month: 1, day: 27 },
  { id: 'PAT-CYT-004', organisationId: 'ENT-DEFAULT', mrn: '100504', firstName: 'Sarah', lastName: 'Johnson', age: 46, month: 11, day: 9 },
  { id: 'PAT-CYT-005', organisationId: 'ENT-DEFAULT', mrn: '100505', firstName: 'Robert', lastName: 'Kim', age: 57, month: 6, day: 30 },
  { id: 'PAT-CYT-006', organisationId: 'ENT-DEFAULT', mrn: '100506', firstName: 'Denise', lastName: 'Walker', age: 38, month: 3, day: 5 },
  { id: 'PAT-CYT-007', organisationId: 'ENT-DEFAULT', mrn: '100507', firstName: 'Patricia', lastName: 'Nguyen', age: 44, month: 8, day: 12 },
  { id: 'PAT-CYT-008', organisationId: 'c-trust-fenwick', mrn: '200601', firstName: 'Fiona', lastName: 'Hartley', age: 33, month: 2, day: 14 },
  { id: 'PAT-CYT-009', organisationId: 'c-trust-fenwick', mrn: '200602', firstName: 'Grace', lastName: 'Whitfield', age: 41, month: 7, day: 22 },
  { id: 'PAT-CYT-010', organisationId: 'c-trust-fenwick', mrn: '200603', firstName: 'Heather', lastName: 'Ogilvie', age: 29, month: 11, day: 3 },
  { id: 'PAT-CYT-011', organisationId: 'c-kr-seoul-general', mrn: '300701', firstName: 'Ji-woo', lastName: 'Kim', age: 38, month: 5, day: 19 },
  { id: 'PAT-CYT-012', organisationId: 'c-de-berlin-frauenklinik', mrn: '400801', firstName: 'Lena', lastName: 'Hoffmann', age: 28, month: 3, day: 11 },
  { id: 'PAT-CYT-013', organisationId: 'c-de-berlin-frauenklinik', mrn: '400802', firstName: 'Petra', lastName: 'Schulz', age: 42, month: 8, day: 27 },
  { id: 'PAT-CYT-014', organisationId: 'c-nl-amsterdam-cyto', mrn: '500901', firstName: 'Anneke', lastName: 'de Vries', age: 33, month: 6, day: 14 },
  { id: 'PAT-CYT-015', organisationId: 'c-fr-paris-cyto', mrn: '500902', firstName: 'Camille', lastName: 'Moreau', age: 42, month: 2, day: 9 },
  { id: 'PAT-CYT-016', organisationId: 'c-be-brussels-cyto', mrn: '500903', firstName: 'Marie', lastName: 'Dubois', age: 27, month: 10, day: 5 },
  { id: 'PAT-CYT-017', organisationId: 'c-ca-vancouver-cyto', mrn: '500904', firstName: 'Emily', lastName: 'MacDonald', age: 36, month: 4, day: 22 },
  { id: 'PAT-CYT-018', organisationId: 'c-nz-auckland-cyto', mrn: '500905', firstName: 'Aroha', lastName: 'Ngata', age: 31, month: 12, day: 3 },
  { id: 'PAT-CYT-019', organisationId: 'c-au-sydney-cyto', mrn: '500906', firstName: 'Isla', lastName: 'Thompson', age: 29, month: 7, day: 18 },
  { id: 'PAT-CYT-020', organisationId: 'c-trust-fenwick', mrn: '200602', firstName: 'Margaret', lastName: 'Ellison', age: 52, month: 5, day: 9 },
  { id: 'PAT-CYT-021', organisationId: 'c-ie-ncsl-dublin', mrn: '700901', firstName: 'Siobhan', lastName: 'Kelly', age: 38, month: 3, day: 22 },
  { id: 'PAT-CYT-022', organisationId: 'c-au-sydney-cyto', mrn: '600601', firstName: 'Chloe', lastName: 'Nguyen', age: 34, month: 9, day: 11 },
  { id: 'PAT-CYT-023', organisationId: 'c-ni-lagan-valley', mrn: '800701', firstName: 'Orla', lastName: 'McKendry', age: 41, month: 6, day: 14 },
];

const pad = (n: number) => String(n).padStart(2, '0');

/** The index record for a demo cytology patient, or null when the id is not one of them. */
export function demoCytologyPatientRecord(patientId: string, nowIso: string): MasterPatientRecord | null {
  const p = DEMO_CYTOLOGY_PATIENTS.find(x => x.id === patientId);
  if (!p) return null;
  return {
    id: p.id, organisationId: p.organisationId, mrn: p.mrn, firstName: p.firstName, lastName: p.lastName,
    dateOfBirth: `${DEMO_YEAR - p.age}-${pad(p.month)}-${pad(p.day)}T00:00:00.000Z`,
    createdAt: nowIso, updatedAt: nowIso, establishedVia: 'created',
  };
}
