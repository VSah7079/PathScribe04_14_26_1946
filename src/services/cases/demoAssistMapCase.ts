// src/services/cases/demoAssistMapCase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 751 (Pete's seed row S15 and spec section 12, Video 9 step 10): an Assist case with a complete checklist in
// real wording whose template is linked to an organ map. The primary LIS writes this case's report, so its map is a
// working aid only: the panel shows "Your laboratory system writes this report." where Insert into report would be.
//   S26-5405  Rectum, low anterior resection for adenocarcinoma (Dr. Sarah Johnson). The colon resection checklist
//             (data/templates/generic/colon_resection.json, PathScribe-authored wording, Batch 738) fully answered,
//             with its rectal map questions: tumour anterior and left lateral, below the peritoneal reflection,
//             circumferential margin 6 mm (anterior), mesorectal plane complete, distal margin 25 mm. Finalised an
//             hour before the reset; its result and its map file went to the laboratory system (the panel's "Map
//             file sent" line; reports/organMapDeliveryDemoQueue.ts).
//   S26-5406  The same kind of case for another patient, finalised; its map file delivery failed, so the outbound
//             queue shows a failed organ map delivery to retry.
// The demo's performing lab (Desert Valley, c-ent-dvmc) sends the map as text and a PNG file (mockFacilityService).
// Fictional patient and clinicians; times relative to the reset.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import { cassetteIdentifier, slideIdentifier } from '@/types/labels/LabelData';
import { SIGN_OUT_READY_COLON_ANSWERS } from './demoSignOutReadyCase';

export const DEMO_ASSIST_MAP_CASE_ID = 'S26-5405';
export const DEMO_ASSIST_MAP_PATIENT = { id: 'PAT-B5405', mrn: '105405', firstName: 'Cornelius', lastName: 'Wexford', dateOfBirth: '1961-11-08' };

const ACC = DEMO_ASSIST_MAP_CASE_ID;
const SP = `${ACC}-SP-1`;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

/** The colon checklist (every required question) for a rectal tumour, with the rectal map's questions. */
export const DEMO_ASSIST_MAP_ANSWERS: Record<string, string | string[]> = {
  ...SIGN_OUT_READY_COLON_ANSWERS,
  procedure: 'procedure_opt_6',                          // Low anterior resection
  tumor_site: ['tumor_site_opt_10'],                     // Rectum
  tumor_size: '3.6 cm',
  closest_margins_invasive: ['closest_margins_invasive_opt_3'], // Radial/circumferential
  distance_to_closest_margin: '0.6 cm',
  distance_radial_margin: '0.6 cm',
  distance_distal_margin: '2.5 cm',
  ln_examined: '16',
  additional_findings_list: ['additional_findings_list_opt_1'], // None identified
  psmap_rec_quadrants: ['psmap_rec_quadrants_anterior', 'psmap_rec_quadrants_left'],
  psmap_rec_crmMm: '6',
  psmap_rec_crmQuadrant: 'psmap_rec_crmQuadrant_anterior',
  psmap_rec_tmePlane: 'psmap_rec_tmePlane_mesorectal',
  psmap_rec_reflection: 'psmap_rec_reflection_below',
  psmap_rec_distalMarginMm: '25',
};

const BLOCKS = ['Tumour, deepest invasion', 'Tumour with the circumferential margin, inked black', 'Distal margin', 'Lymph nodes'];

const finalised = { status: 'finalized', finalizedAt: hoursAgo(1), finalizedBy: 'PATH-SJ-001', releasedAt: hoursAgo(1) };

export const DEMO_ASSIST_MAP_CASE = {
  id: ACC,
  accession: { accessionNumber: '5405', accessionPrefix: 'S', accessionYear: 2026, fullAccession: ACC },
  originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-DEFAULT',
  patient: {
    id: DEMO_ASSIST_MAP_PATIENT.id, mrn: DEMO_ASSIST_MAP_PATIENT.mrn, firstName: DEMO_ASSIST_MAP_PATIENT.firstName, lastName: DEMO_ASSIST_MAP_PATIENT.lastName,
    dateOfBirth: `${DEMO_ASSIST_MAP_PATIENT.dateOfBirth}T12:00:00.000Z`, sex: 'M',
    phone: '555-540-5405', email: 'cornelius.wexford@example.org', address: '1 Demo Way, Phoenix, AZ 85004',
  },
  specimens: [{
    id: SP, label: 'A', description: 'Rectum, low anterior resection for tumour',
    collectedAt: hoursAgo(76), receivedAt: hoursAgo(74), specimenFlags: [], collection: { bodySite: 'Rectum' },
    blocks: BLOCKS.map((description, i) => ({
      id: `blk-demo-5405-a${i + 1}`, label: String(i + 1), status: 'Embedded', displayId: cassetteIdentifier(ACC, 'A', String(i + 1)),
      pieceCount: 1, pieceDescription: description,
      stains: [{ id: `stn-demo-5405-a${i + 1}-he`, stainName: 'H&E', stainTypeId: 'st-he', status: 'Ready for Review', displayId: slideIdentifier(ACC, 'A', String(i + 1), 'L1') }],
    })),
  }],
  order: {
    priority: 'Routine', requestingProvider: 'Dr. Miriam Castellano', facilityId: 'c1', facilityName: 'Metro General Hospital',
    clinicalIndication: 'Rectal adenocarcinoma at 9 cm from the anal verge on biopsy. MRI: tumour below the peritoneal reflection, anterior and left lateral, no threatened circumferential margin. Low anterior resection.',
    receivedDate: hoursAgo(74), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary',
  },
  diagnostic: {
    grossDescription: 'Low anterior resection, 18 cm, with intact mesorectum (mesorectal plane). A 3.6 cm ulcerated tumour on the anterior and left lateral wall lies below the peritoneal reflection, 2.5 cm from the distal margin. The circumferential margin is inked black; closest approach 6 mm, anteriorly.',
    microscopicDescription: 'Moderately differentiated adenocarcinoma invades through the muscularis propria into the mesorectal fat. Small-vessel lymphovascular invasion is present. Two of sixteen lymph nodes contain metastatic carcinoma. Margins free.',
    ancillaryStudies: 'Mismatch repair proteins retained (MLH1, PMS2, MSH2, MSH6).',
  },
  synopticReports: [{
    instanceId: `${SP}_colon_resection_demo`, specimenId: SP,
    templateId: 'colon_resection', templateName: 'Colon resection',
    status: 'finalized', answers: DEMO_ASSIST_MAP_ANSWERS,
    createdAt: hoursAgo(30), updatedAt: hoursAgo(2),
  }],
  participants: [{ staffId: 'PATH-SJ-001', staffName: 'Dr. Sarah Johnson', source: 'system', participationTypeIds: ['attending'], addedBy: 'system', addedAt: hoursAgo(74), status: 'active' }],
  ...finalised,
  createdAt: hoursAgo(74), updatedAt: hoursAgo(1),
  caseFlags: [], specimenFlags: [], reportingMode: 'assist', coding: {},
} as unknown as Case;

export const DEMO_ASSIST_MAP_FAILED_CASE_ID = 'S26-5406';
export const DEMO_ASSIST_MAP_FAILED_PATIENT = { id: 'PAT-B5406', mrn: '105406', firstName: 'Rosalind', lastName: 'Ashcombe', dateOfBirth: '1957-02-19' };
const SP6 = `${DEMO_ASSIST_MAP_FAILED_CASE_ID}-SP-1`;

export const DEMO_ASSIST_MAP_FAILED_CASE = {
  ...DEMO_ASSIST_MAP_CASE,
  id: DEMO_ASSIST_MAP_FAILED_CASE_ID,
  accession: { accessionNumber: '5406', accessionPrefix: 'S', accessionYear: 2026, fullAccession: DEMO_ASSIST_MAP_FAILED_CASE_ID },
  patient: {
    id: DEMO_ASSIST_MAP_FAILED_PATIENT.id, mrn: DEMO_ASSIST_MAP_FAILED_PATIENT.mrn, firstName: DEMO_ASSIST_MAP_FAILED_PATIENT.firstName, lastName: DEMO_ASSIST_MAP_FAILED_PATIENT.lastName,
    dateOfBirth: `${DEMO_ASSIST_MAP_FAILED_PATIENT.dateOfBirth}T12:00:00.000Z`, sex: 'F',
    phone: '555-540-5406', email: 'rosalind.ashcombe@example.org', address: '1 Demo Way, Phoenix, AZ 85004',
  },
  specimens: [{
    id: SP6, label: 'A', description: 'Rectum, low anterior resection for tumour',
    collectedAt: hoursAgo(98), receivedAt: hoursAgo(96), specimenFlags: [], collection: { bodySite: 'Rectum' },
    blocks: BLOCKS.map((description, i) => ({
      id: `blk-demo-5406-a${i + 1}`, label: String(i + 1), status: 'Embedded', displayId: cassetteIdentifier(DEMO_ASSIST_MAP_FAILED_CASE_ID, 'A', String(i + 1)),
      pieceCount: 1, pieceDescription: description,
      stains: [{ id: `stn-demo-5406-a${i + 1}-he`, stainName: 'H&E', stainTypeId: 'st-he', status: 'Ready for Review', displayId: slideIdentifier(DEMO_ASSIST_MAP_FAILED_CASE_ID, 'A', String(i + 1), 'L1') }],
    })),
  }],
  order: { ...DEMO_ASSIST_MAP_CASE.order, receivedDate: hoursAgo(96) },
  synopticReports: [{
    instanceId: `${SP6}_colon_resection_demo`, specimenId: SP6,
    templateId: 'colon_resection', templateName: 'Colon resection',
    status: 'finalized', answers: { ...DEMO_ASSIST_MAP_ANSWERS, psmap_rec_quadrants: ['psmap_rec_quadrants_posterior'], psmap_rec_crmQuadrant: 'psmap_rec_crmQuadrant_posterior', psmap_rec_crmMm: '4' },
    createdAt: hoursAgo(50), updatedAt: hoursAgo(3),
  }],
  createdAt: hoursAgo(96), updatedAt: hoursAgo(3),
  finalizedAt: hoursAgo(3), releasedAt: hoursAgo(3),
} as unknown as Case;
