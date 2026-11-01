// src/services/cases/demoCytologyVolumeCases.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 749 (Pete's Demo Seed Data Requirements, rows S5 "GYN cytology volume and a screening-ready case" for Video 3,
// and S4's remaining "breast FNA" for Video 2). Priya Desai (CT-001) signs in to a GYN worklist with work on each tile:
//   My Worklist   S26-5501  negative-looking ThinPrep Pap, HPV co-test pending, an AI gallery read done: the Video 3 case
//                 S26-5502  HPV negative;  S26-5503  HPV positive after ASC-US, AI read done;  S26-5504  age 23, no co-test
//                 S26-5510  Northside Clinic (primary HPV screening): HPV positive, so the reflex cytology is screened
//   Pool          S26-5505, S26-5506
//   HPV Triage    S26-5508  Northside Clinic, HPV result not back yet (cytology waits for it)
//   Recall        S26-5509  Northside Clinic, self-collected swab HPV positive: a clinician-collected sample is needed
//   Peer Review   S26-5507  signed out NILM last week, picked for random post-sign-out peer review
//   Non-GYN       S26-5511  breast FNA (dictionary entry sp-fna-breast), ready to screen
// The Paps use the ThinPrep entries (sp-cyto-pap-hpv-cotest, or sp-cyto-pap-thinprep without a co-test).
// Northside Clinic (c3) screens with primary HPV and reflex cytology (cytology/mockFacilityCytologyScreeningStrategy-
// OverrideService.ts), as US guidelines allow. Fictional patients and clinicians; times relative to the reset.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';

const HOUR = 3_600_000;
const NOW = Date.now();
const hoursAgo = (h: number) => new Date(NOW - h * HOUR).toISOString();
const born = (years: number, month: number, day: number) => new Date(Date.UTC(new Date().getUTCFullYear() - years, month - 1, day)).toISOString();
const PRIYA = 'CT-001';

export const NORTHSIDE_CLINIC = { id: 'c3', name: 'Northside Clinic' } as const;

export interface CytologyVolumeSpec {
  id: string;
  patient: { id: string; mrn: string; firstName: string; lastName: string; age: number; month: number; day: number };
  entryId: string;
  description: string;
  assignedTo: string | null;
  status: 'in-progress' | 'pool' | 'finalized';
  facility: { id: string; name: string };
  hpv?: { ordered: boolean; result: 'Pending' | 'Negative' | 'Positive' | 'Not Performed' };
  indication: string;
  receivedHoursAgo: number;
  /** Added by withCytologyVolumeFlags: a QA flag on the specimen. */
  peerReview?: boolean;
}

const MGH = { id: 'c1', name: 'Metro General Hospital' };
const pat = (n: number, firstName: string, lastName: string, age: number, month: number, day: number) =>
  ({ id: `PAT-CYT-0${n}`, mrn: `1055${String(n).padStart(2, '0')}`, firstName, lastName, age, month, day });
const PAP = 'Cervical, liquid-based Pap test (ThinPrep)';

export const CYTOLOGY_VOLUME_SPECS: readonly CytologyVolumeSpec[] = [
  { id: 'S26-5501-CYT-001', patient: pat(32, 'Maribel', 'Underwood', 38, 4, 9), entryId: 'sp-cyto-pap-hpv-cotest', description: PAP, assignedTo: PRIYA, status: 'in-progress', facility: MGH, hpv: { ordered: true, result: 'Pending' }, indication: 'Routine screening. LMP 12 days ago. No prior abnormal results.', receivedHoursAgo: 20 },
  { id: 'S26-5502-CYT-001', patient: pat(33, 'Celeste', 'Okonkwo', 45, 11, 2), entryId: 'sp-cyto-pap-hpv-cotest', description: PAP, assignedTo: PRIYA, status: 'in-progress', facility: MGH, hpv: { ordered: true, result: 'Negative' }, indication: 'Routine co-test. Postpartum 8 months.', receivedHoursAgo: 26 },
  { id: 'S26-5503-CYT-001', patient: pat(34, 'Danica', 'Holmberg', 33, 7, 21), entryId: 'sp-cyto-pap-hpv-cotest', description: PAP, assignedTo: PRIYA, status: 'in-progress', facility: MGH, hpv: { ordered: true, result: 'Positive' }, indication: 'ASC-US one year ago, HPV positive then. Follow-up co-test.', receivedHoursAgo: 30 },
  { id: 'S26-5504-CYT-001', patient: pat(35, 'Juliet', 'Abernethy', 23, 2, 14), entryId: 'sp-cyto-pap-thinprep', description: PAP, assignedTo: PRIYA, status: 'in-progress', facility: MGH, hpv: { ordered: false, result: 'Not Performed' }, indication: 'First screening, age 23 (cytology alone).', receivedHoursAgo: 18 },
  { id: 'S26-5505-CYT-001', patient: pat(36, 'Henrietta', 'Mbeki', 51, 9, 30), entryId: 'sp-cyto-pap-hpv-cotest', description: PAP, assignedTo: null, status: 'pool', facility: MGH, hpv: { ordered: true, result: 'Pending' }, indication: 'Routine screening, perimenopausal.', receivedHoursAgo: 10 },
  { id: 'S26-5506-CYT-001', patient: pat(37, 'Annika', 'Lindgren', 29, 5, 6), entryId: 'sp-cyto-pap-hpv-cotest', description: PAP, assignedTo: null, status: 'pool', facility: MGH, hpv: { ordered: true, result: 'Negative' }, indication: 'Routine screening. Contraception: IUD.', receivedHoursAgo: 8 },
  { id: 'S26-5507-CYT-001', patient: pat(38, 'Felicity', 'Ramsbottom', 41, 12, 17), entryId: 'sp-cyto-pap-hpv-cotest', description: PAP, assignedTo: PRIYA, status: 'finalized', facility: MGH, hpv: { ordered: true, result: 'Negative' }, indication: 'Routine co-test.', receivedHoursAgo: 190, peerReview: true },
  { id: 'S26-5508-CYT-001', patient: pat(39, 'Ingrid', 'Solberg', 36, 3, 3), entryId: 'sp-cyto-pap-hpv-cotest', description: PAP, assignedTo: PRIYA, status: 'in-progress', facility: NORTHSIDE_CLINIC, hpv: { ordered: true, result: 'Pending' }, indication: 'Primary HPV screening; cytology only if HPV positive.', receivedHoursAgo: 14 },
  { id: 'S26-5509-CYT-001', patient: pat(40, 'Lucinda', 'Achebe', 47, 8, 25), entryId: 'sp-cyto-hpv-self', description: 'Self-collected vaginal swab, HPV only', assignedTo: PRIYA, status: 'in-progress', facility: NORTHSIDE_CLINIC, hpv: { ordered: true, result: 'Positive' }, indication: 'Self-sampling kit returned by mail.', receivedHoursAgo: 40 },
  { id: 'S26-5510-CYT-001', patient: pat(41, 'Rowena', 'Castellane', 52, 1, 11), entryId: 'sp-cyto-pap-hpv-cotest', description: PAP, assignedTo: PRIYA, status: 'in-progress', facility: NORTHSIDE_CLINIC, hpv: { ordered: true, result: 'Positive' }, indication: 'Primary HPV screening: HPV positive (other high-risk types). Reflex cytology.', receivedHoursAgo: 36 },
  { id: 'S26-5511-CYT-001', patient: pat(42, 'Theodora', 'Vasquez-Lind', 49, 6, 19), entryId: 'sp-fna-breast', description: 'Breast, left, 2 o’clock, fine needle aspiration', assignedTo: PRIYA, status: 'in-progress', facility: MGH, indication: '1.4 cm left breast mass, BI-RADS 4A. Ultrasound-guided FNA, two passes.', receivedHoursAgo: 12 },
];

function caseFrom(s: CytologyVolumeSpec): Case {
  const p = s.patient;
  const number = s.id.slice(4, 8);
  const screening = s.hpv
    ? { hpvCoTestOrdered: s.hpv.ordered, hpvResult: s.hpv.result,
        ...(s.hpv.result === 'Positive' ? { hpvAbnormalFlag: 'A', hpvReferenceRange: 'Not Detected', hpvGenotypeDetail: { hpv16: false, hpv18Or45: false, otherHighRisk: true } } : {}),
        ...(s.hpv.result === 'Negative' ? { hpvAbnormalFlag: 'N', hpvReferenceRange: 'Not Detected' } : {}),
        ...(s.peerReview ? { postSignOutPeerReviewFlag: { reason: 'random_selection', flaggedBy: 'system', flaggedByName: 'Random peer review sample', flaggedAt: hoursAgo(20) } } : {}) }
    : undefined;
  return {
    id: s.id,
    accession: { accessionNumber: number, accessionPrefix: 'S', accessionYear: 2026, fullAccession: s.id },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-DEFAULT',
    patient: {
      id: p.id, mrn: p.mrn, firstName: p.firstName, lastName: p.lastName, dateOfBirth: born(p.age, p.month, p.day), sex: 'F',
      phone: '555-550-' + p.mrn.slice(-4), email: `${p.firstName.toLowerCase()}.${p.lastName.toLowerCase().replace(/[^a-z]/g, '')}@example.org`,
      address: '1 Demo Way, Phoenix, AZ 85004',
    },
    specimens: [{
      id: `S26-${number}-SP-1`, label: 'A', description: s.description, receivedAt: hoursAgo(s.receivedHoursAgo), collectedAt: hoursAgo(s.receivedHoursAgo + 4),
      specimenFlags: [], specimenDictionaryEntryId: s.entryId, ...(screening ? { cytologyScreening: screening } : {}),
    }],
    order: { priority: 'Routine', facilityId: s.facility.id, facilityName: s.facility.name, requestingProvider: 'Dr. Jennifer Davis', clinicalIndication: s.indication, receivedDate: hoursAgo(s.receivedHoursAgo), assignedTo: s.assignedTo },
    diagnostic: { grossDescription: '', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    status: s.status,
    createdAt: hoursAgo(s.receivedHoursAgo), updatedAt: hoursAgo(s.status === 'finalized' ? 160 : 2),
    ...(s.status === 'finalized' ? { finalizedAt: hoursAgo(165), finalizedBy: PRIYA, releasedAt: hoursAgo(165) } : {}),
    caseFlags: [], specimenFlags: [], reportingMode: 'orchestrator', coding: {},
  } as unknown as Case;
}

export const DEMO_CYTOLOGY_VOLUME_CASES: Case[] = CYTOLOGY_VOLUME_SPECS.map(caseFrom);
