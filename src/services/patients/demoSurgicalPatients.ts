// src/services/patients/demoSurgicalPatients.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 638 (Pete, Oct 20, 2026). The demo's surgical (and a few extra cytology) cases carry patient ids such as PAT-001 and PAT-US-004, but nothing
// registered those patients in the patient index (only the cytology patients were, in Batch 634), so releasing a surgical
// result recorded SURGICAL_DISPATCH_SKIPPED: no organisation to queue the message against. These are the same people, with the
// same ids, MRNs, names and organisations as the seed cases; the index adds each to its records the first time it is asked for
// (as it does for the cytology patients). Birth dates are fixed calendar dates taken from the seed cases on Oct 20, 2026.
// ─────────────────────────────────────────────────────────────────────────────
import type { MasterPatientRecord } from './IPatientIndexService';

interface DemoSurgicalPatient { id: string; organisationId: string; mrn: string; firstName: string; lastName: string; dateOfBirth: string }

export const DEMO_SURGICAL_PATIENTS: readonly DemoSurgicalPatient[] = [
  { id: 'PAT-001', organisationId: 'ENT-DEFAULT', mrn: '100001', firstName: 'Grace', lastName: 'Thompson', dateOfBirth: '1974-03-14' },
  { id: 'PAT-002', organisationId: 'ENT-DEFAULT', mrn: '100002', firstName: 'Robert', lastName: 'Jackson', dateOfBirth: '1959-08-22' },
  { id: 'PAT-003', organisationId: 'ENT-DEFAULT', mrn: '100003', firstName: 'Helen', lastName: 'Williams', dateOfBirth: '1963-11-05' },
  { id: 'PAT-004', organisationId: 'ENT-DEFAULT', mrn: '100004', firstName: 'David', lastName: 'Martinez', dateOfBirth: '1955-05-30' },
  { id: 'PAT-005', organisationId: 'ENT-DEFAULT', mrn: '100005', firstName: 'Susan', lastName: 'Taylor', dateOfBirth: '1978-09-12' },
  { id: 'PAT-006', organisationId: 'ENT-GLOBAL', mrn: '100006', firstName: 'Ruth', lastName: 'Anderson', dateOfBirth: '1968-01-28' },
  { id: 'PAT-007', organisationId: 'ENT-DEFAULT', mrn: '100007', firstName: 'Michael', lastName: 'Chen', dateOfBirth: '1952-04-09' },
  { id: 'PAT-008', organisationId: 'ENT-DEFAULT', mrn: '100008', firstName: 'Carol', lastName: 'Davis', dateOfBirth: '1965-07-03' },
  { id: 'PAT-009', organisationId: 'ENT-DEFAULT', mrn: '100009', firstName: 'Beatrice', lastName: 'Holloway', dateOfBirth: '1926-01-03' },
  { id: 'PAT-010', organisationId: 'ENT-DEFAULT', mrn: '100010', firstName: 'Baby', lastName: 'Nguyen', dateOfBirth: '2026-10-20' },
  { id: 'PAT-011', organisationId: 'ENT-DEFAULT', mrn: '100011', firstName: 'Margaret', lastName: 'Foster', dateOfBirth: '1965-04-22' },
  { id: 'PAT-012', organisationId: 'ENT-DEFAULT', mrn: '100012', firstName: 'Harold', lastName: 'Bennett', dateOfBirth: '1968-09-15' },
  { id: 'PAT-015', organisationId: 'ENT-DEFAULT', mrn: '100015', firstName: 'Robert', lastName: 'Hawkins', dateOfBirth: '1958-11-22' },
  { id: 'PAT-016', organisationId: 'ENT-DEFAULT', mrn: '100016', firstName: 'Linda', lastName: 'Okafor', dateOfBirth: '1971-04-09' },
  { id: 'PAT-017', organisationId: 'ENT-DEFAULT', mrn: '100017', firstName: 'Marcus', lastName: 'Delgado', dateOfBirth: '1965-07-30' },
  { id: 'PAT-090', organisationId: 'ENT-DEFAULT', mrn: '100090', firstName: 'Deborah', lastName: 'Whitfield', dateOfBirth: '1965-04-08' },
  { id: 'PAT-091', organisationId: 'ENT-DEFAULT', mrn: '100091', firstName: 'Thomas', lastName: 'Reilly', dateOfBirth: '1954-11-19' },
  { id: 'PAT-092', organisationId: 'ENT-DEFAULT', mrn: '100092', firstName: 'Carol', lastName: 'Simmons', dateOfBirth: '1960-01-30' },
  { id: 'PAT-093', organisationId: 'ENT-DEFAULT', mrn: '100093', firstName: 'Angela', lastName: 'Weiss', dateOfBirth: '1967-08-21' },
  { id: 'PAT-4420', organisationId: 'ENT-001', mrn: '104420', firstName: 'Margaret', lastName: 'Holloway', dateOfBirth: '1972-03-18' },
  { id: 'PAT-463', organisationId: 'ENT-DEFAULT', mrn: '100463', firstName: 'Walter', lastName: 'Brennan', dateOfBirth: '1952-02-11' },
  { id: 'PAT-464', organisationId: 'ENT-DEFAULT', mrn: '100464', firstName: 'Graham', lastName: 'Whitlock', dateOfBirth: '1963-05-02' },
  { id: 'PAT-465', organisationId: 'ENT-DEFAULT', mrn: '100465', firstName: 'Lorna', lastName: 'Achterberg', dateOfBirth: '1968-08-19' },
  { id: 'PAT-466', organisationId: 'ENT-DEFAULT', mrn: '100466', firstName: 'Desmond', lastName: 'Okafor-Hale', dateOfBirth: '1965-03-27' },
  { id: 'PAT-467', organisationId: 'ENT-DEFAULT', mrn: '100467', firstName: 'Marguerite', lastName: 'Ellsworth', dateOfBirth: '1959-01-14' },
  { id: 'PAT-CYT-PT001', organisationId: 'c-hfhs-01', mrn: 'PT-SYNTH-0001', firstName: 'CAP Gyn', lastName: 'Survey Challenge A-03', dateOfBirth: '1980-12-01' },
  { id: 'PAT-CYT-PT002', organisationId: 'c-hfhs-01', mrn: 'PT-SYNTH-0002', firstName: 'CAP Gyn', lastName: 'Survey Challenge A-07', dateOfBirth: '1980-12-01' },
  { id: 'PAT-CYT-PT003', organisationId: 'c-hfhs-01', mrn: 'PT-SYNTH-0003', firstName: 'CAP Gyn', lastName: 'Survey Challenge B-02', dateOfBirth: '1980-12-01' },
  { id: 'PAT-D601', organisationId: 'ENT-DEFAULT', mrn: '104601', firstName: 'Helen', lastName: 'Marsh', dateOfBirth: '1965-04-02' },
  { id: 'PAT-D602', organisationId: 'ENT-DEFAULT', mrn: '104602', firstName: 'George', lastName: 'Ellis', dateOfBirth: '1956-09-18' },
  { id: 'PAT-D603', organisationId: 'ENT-DEFAULT', mrn: '104603', firstName: 'Irene', lastName: 'Fowler', dateOfBirth: '1971-01-30' },
  { id: 'PAT-D604', organisationId: 'ENT-DEFAULT', mrn: '104604', firstName: 'Walter', lastName: 'Brennan', dateOfBirth: '1960-06-07' },
  { id: 'PAT-D610', organisationId: 'ENT-DEFAULT', mrn: '104610', firstName: 'Lorraine', lastName: 'Hughes', dateOfBirth: '1977-11-03' },
  { id: 'PAT-D620', organisationId: 'ENT-DEFAULT', mrn: '104620', firstName: 'Martin', lastName: 'Cole', dateOfBirth: '1968-02-14' },
  { id: 'PAT-D621', organisationId: 'ENT-DEFAULT', mrn: '104621', firstName: 'Agnes', lastName: 'Porter', dateOfBirth: '1954-07-21' },
  { id: 'PAT-D622', organisationId: 'ENT-DEFAULT', mrn: '104622', firstName: 'Victor', lastName: 'Lang', dateOfBirth: '1963-03-09' },
  { id: 'PAT-D623', organisationId: 'ENT-DEFAULT', mrn: '104623', firstName: 'Doris', lastName: 'Kemp', dateOfBirth: '1946-12-01' },
  { id: 'PAT-D630', organisationId: 'ENT-DEFAULT', mrn: '104630', firstName: 'Carol', lastName: 'Benson', dateOfBirth: '1969-05-05' },
  { id: 'PAT-D632', organisationId: 'ENT-DEFAULT', mrn: '104632', firstName: 'Rita', lastName: 'Gallagher', dateOfBirth: '1962-08-30' },
  { id: 'PAT-D633', organisationId: 'ENT-DEFAULT', mrn: '104633', firstName: 'Frank', lastName: 'Delaney', dateOfBirth: '1957-10-12' },
  { id: 'PAT-D640', organisationId: 'ENT-DEFAULT', mrn: '104640', firstName: 'Monica', lastName: 'Reyes', dateOfBirth: '1993-02-19' },
  { id: 'PAT-D641', organisationId: 'ENT-DEFAULT', mrn: '104641', firstName: 'Elena', lastName: 'Cruz', dateOfBirth: '1997-06-04' },
  { id: 'PAT-D650', organisationId: 'ENT-DEFAULT', mrn: '104650', firstName: 'Lucy', lastName: 'Hart', dateOfBirth: '1985-03-03' },
  { id: 'PAT-D651', organisationId: 'ENT-DEFAULT', mrn: '104651', firstName: 'Grace', lastName: 'Oyelaran', dateOfBirth: '1990-09-27' },
  { id: 'PAT-D652', organisationId: 'ENT-DEFAULT', mrn: '104652', firstName: 'Ruth', lastName: 'Okonjo', dateOfBirth: '1974-04-16' },
  { id: 'PAT-D660', organisationId: 'ENT-DEFAULT', mrn: '104660', firstName: 'Harold', lastName: 'Vance', dateOfBirth: '1948-01-22' },
  { id: 'PAT-D661', organisationId: 'ENT-DEFAULT', mrn: '104661', firstName: 'Eleanor', lastName: 'Brooks', dateOfBirth: '1962-08-11' },
  { id: 'PAT-D662', organisationId: 'ENT-DEFAULT', mrn: '104662', firstName: 'Samuel', lastName: 'Ortiz', dateOfBirth: '1945-05-03' },
  { id: 'PAT-D663', organisationId: 'ENT-DEFAULT', mrn: '104663', firstName: 'Marcus', lastName: 'Devereaux', dateOfBirth: '1979-11-09' },
  { id: 'PAT-D664', organisationId: 'ENT-DEFAULT', mrn: '104664', firstName: 'Winifred', lastName: 'Carrow', dateOfBirth: '1953-02-14' },
  { id: 'PAT-D670', organisationId: 'ENT-DEFAULT', mrn: '104670', firstName: 'Harold', lastName: 'Whitaker', dateOfBirth: '1959-01-22' },
  { id: 'PAT-D671', organisationId: 'ENT-DEFAULT', mrn: '104671', firstName: 'Doris', lastName: 'Kowalski', dateOfBirth: '1954-11-03' },
  { id: 'PAT-D672', organisationId: 'ENT-DEFAULT', mrn: '104672', firstName: 'Patricia', lastName: 'Lindqvist', dateOfBirth: '1965-07-09' },
  { id: 'PAT-D673', organisationId: 'ENT-DEFAULT', mrn: '104673', firstName: 'Leonard', lastName: 'Asante', dateOfBirth: '1962-04-28' },
  { id: 'PAT-DEMO-RB-01', organisationId: 'ENT-DEFAULT', mrn: 'DEMO100001', firstName: 'Eleanor', lastName: 'Bishop', dateOfBirth: '1974-03-14' },
  { id: 'PAT-DEMO-RB-02', organisationId: 'ENT-DEFAULT', mrn: 'DEMO100002', firstName: 'Celia', lastName: 'Moreau', dateOfBirth: '1978-11-07' },
  { id: 'PAT-DEMO-RB-03', organisationId: 'ENT-DEFAULT', mrn: 'DEMO100003', firstName: 'Martin', lastName: 'Hale', dateOfBirth: '1959-05-22' },
  { id: 'PAT-RB-01', organisationId: 'ENT-DEFAULT', mrn: '200101', firstName: 'Isabelle', lastName: 'Nakamura', dateOfBirth: '1982-07-19' },
  { id: 'PAT-RB-02', organisationId: 'ENT-DEFAULT', mrn: '200102', firstName: 'Constance', lastName: 'Adeyemi', dateOfBirth: '1968-02-28' },
  { id: 'PAT-RB-03', organisationId: 'ENT-DEFAULT', mrn: '200103', firstName: 'Victor', lastName: 'Halloran', dateOfBirth: '1964-11-03' },
  { id: 'PAT-RB-04', organisationId: 'ENT-DEFAULT', mrn: '200104', firstName: 'Andrea', lastName: 'Morelli', dateOfBirth: '1975-05-08' },
  { id: 'PAT-UK-001', organisationId: 'ENT-MFT', mrn: '200001', firstName: 'William', lastName: 'Hartley', dateOfBirth: '1958-04-12' },
  { id: 'PAT-UK-002', organisationId: 'ENT-MFT', mrn: '200002', firstName: 'Geoffrey', lastName: 'Barrowclough', dateOfBirth: '1955-09-03' },
  { id: 'PAT-UK-003', organisationId: 'ENT-MFT', mrn: '200003', firstName: 'Margaret', lastName: 'Ashworth', dateOfBirth: '1968-07-19' },
  { id: 'PAT-UK-004', organisationId: 'ENT-MFT', mrn: '200004', firstName: 'Thomas', lastName: 'Pemberton', dateOfBirth: '1963-11-28' },
  { id: 'PAT-UK-005', organisationId: 'ENT-MFT', mrn: '200005', firstName: 'Patricia', lastName: 'Hollingsworth', dateOfBirth: '1971-02-08' },
  { id: 'PAT-UK-006', organisationId: 'ENT-MFT', mrn: '200006', firstName: 'Edward', lastName: 'Blackwood', dateOfBirth: '1952-06-30' },
  { id: 'PAT-UK-007', organisationId: 'ENT-MFT', mrn: '200007', firstName: 'Susan', lastName: 'Hargreaves', dateOfBirth: '1964-05-14' },
  { id: 'PAT-UK-008', organisationId: 'ENT-MFT', mrn: '200008', firstName: 'Alan', lastName: 'Butterworth', dateOfBirth: '1949-03-22' },
  { id: 'PAT-UK-009', organisationId: 'ENT-MFT', mrn: '200009', firstName: 'Dorothy', lastName: 'Whitworth', dateOfBirth: '1977-08-05' },
  { id: 'PAT-US-001', organisationId: 'ENT-MPA', mrn: '300001', firstName: 'Patricia', lastName: 'Novak', dateOfBirth: '1968-03-14' },
  { id: 'PAT-US-002', organisationId: 'ENT-MPA', mrn: '300002', firstName: 'Robert', lastName: 'Dziedzic', dateOfBirth: '1959-11-02' },
  { id: 'PAT-US-003', organisationId: 'ENT-MPA', mrn: '300003', firstName: 'Charles', lastName: 'Okafor', dateOfBirth: '1963-07-22' },
  { id: 'PAT-US-004', organisationId: 'ENT-HFHS', mrn: '300004', firstName: 'Sandra', lastName: 'Kowalski', dateOfBirth: '1955-05-08' },
  { id: 'PAT-US-005', organisationId: 'ENT-HFHS', mrn: '300005', firstName: 'George', lastName: 'Washington', dateOfBirth: '1971-01-18' },
  { id: 'PAT-US-006', organisationId: 'ENT-MPA', mrn: '300006', firstName: 'Maria', lastName: 'Kowalczyk', dateOfBirth: '1982-09-03' },
  { id: 'PAT-US-007', organisationId: 'ENT-MPA', mrn: '300007', firstName: 'Liam', lastName: 'Osei', dateOfBirth: '2018-04-12' },
];

/** The index record for a demo surgical patient, or null when the id is not one of them. */
export function demoSurgicalPatientRecord(patientId: string, nowIso: string): MasterPatientRecord | null {
  const p = DEMO_SURGICAL_PATIENTS.find(x => x.id === patientId);
  if (!p) return null;
  return {
    id: p.id, organisationId: p.organisationId, mrn: p.mrn, firstName: p.firstName, lastName: p.lastName,
    dateOfBirth: `${p.dateOfBirth}T00:00:00.000Z`, createdAt: nowIso, updatedAt: nowIso, establishedVia: 'created',
  };
}
