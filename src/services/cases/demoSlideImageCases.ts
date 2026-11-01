// src/services/cases/demoSlideImageCases.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 750 (Pete's seed row S10, Videos 1 and 7): the case whose slides have reference previews. PathScribe has no
// slide viewer: each slide shows the small preview its scanner made (here the demonstration images Pete's helper
// prepares, docs/product/SLIDE_IMAGE_DEMO.md) and opens in the laboratory's application (in the demo, the standalone
// demonstration page, tools/demo-slide-viewer/). The CAMELYON images are sentinel lymph nodes from breast cancer
// patients, so the case matches them:
//   S26-5404  Breast, left, mastectomy with sentinel lymph node biopsy (Dr. Sarah Johnson)
//             A1-L1  breast tumour H&E: scanned (an openly licensed breast image, once its licence is read)
//             B1-L1  sentinel node 1, H&E: scanned (CAMELYON, no metastasis)
//             C1-L1  sentinel node 2, H&E: scanned (CAMELYON, metastatic carcinoma)
//             C1-L2  sentinel node 2, H&E recut: back in the scanning queue, failed image quality (the blurred copy)
// The other image states are on the block-type cases (demoBlockTypeCases.ts): S26-5402 Scanned and Scanning,
// S26-5403 Queued and Scan failed, S26-5401 No image yet.
// Fictional patient and clinician; times relative to the reset.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';

const HOUR = 3_600_000;
const NOW = Date.now();
const hoursAgo = (h: number) => new Date(NOW - h * HOUR).toISOString();
const born = (years: number, month: number, day: number) => new Date(Date.UTC(new Date().getUTCFullYear() - years, month - 1, day)).toISOString();

export const DEMO_SLIDE_IMAGE_CASE_ID = 'S26-5404';
export const DEMO_SLIDE_IMAGE_PATIENT = { id: 'PAT-B5404', mrn: '105404', firstName: 'Philippa', lastName: 'Hawthorne', age: 58, month: 4, day: 27 };

const SCANNED = { distributionDestination: 'digital', distributionStatus: 'Scanned', lastScanOutcome: 'scanned' } as const;
const FAILED_QUALITY = { distributionDestination: 'digital', distributionStatus: 'In Scanning Queue', lastScanOutcome: 'imageQcFailed' } as const;
const he = (displayId: string, status: string, scan: Record<string, string>) => ({ id: `stn-demo-${displayId.toLowerCase()}`, stainName: 'H&E', stainTypeId: 'st-he', status, displayId, ...scan });
const specimen = (n: number, label: string, description: string, blocks: unknown[]) =>
  ({ id: `S26-5404-SP-${n}`, label, description, receivedAt: hoursAgo(52), collectedAt: hoursAgo(55), specimenFlags: [], collection: { bodySite: n === 1 ? 'Breast' : 'Lymph node, axillary', laterality: 'Left' }, blocks });

export const DEMO_SLIDE_IMAGE_CASES: Case[] = [{
  id: DEMO_SLIDE_IMAGE_CASE_ID,
  accession: { accessionNumber: '5404', accessionPrefix: 'S', accessionYear: 2026, fullAccession: DEMO_SLIDE_IMAGE_CASE_ID },
  originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-DEFAULT',
  patient: {
    id: DEMO_SLIDE_IMAGE_PATIENT.id, mrn: DEMO_SLIDE_IMAGE_PATIENT.mrn, firstName: DEMO_SLIDE_IMAGE_PATIENT.firstName, lastName: DEMO_SLIDE_IMAGE_PATIENT.lastName,
    dateOfBirth: born(DEMO_SLIDE_IMAGE_PATIENT.age, DEMO_SLIDE_IMAGE_PATIENT.month, DEMO_SLIDE_IMAGE_PATIENT.day), sex: 'F',
    phone: '555-540-5404', email: 'philippa.hawthorne@example.org', address: '1 Demo Way, Phoenix, AZ 85004',
  },
  specimens: [
    specimen(1, 'A', 'Breast, left, simple mastectomy', [{ id: 'blk-demo-5404-a1', label: '1', status: 'Embedded', stains: [he('S26-5404-A1-L1', 'Ready for Review', SCANNED)] }]),
    specimen(2, 'B', 'Lymph node, left axillary sentinel node 1, excision', [{ id: 'blk-demo-5404-b1', label: '1', status: 'Embedded', stains: [he('S26-5404-B1-L1', 'Ready for Review', SCANNED)] }]),
    specimen(3, 'C', 'Lymph node, left axillary sentinel node 2, excision', [{ id: 'blk-demo-5404-c1', label: '1', status: 'Embedded', stains: [he('S26-5404-C1-L1', 'Ready for Review', SCANNED), he('S26-5404-C1-L2', 'Coverslipped', FAILED_QUALITY)] }]),
  ],
  order: { priority: 'Routine', facilityId: 'c1', facilityName: 'Metro General Hospital', requestingProvider: 'Dr. Samuel Ortega', clinicalIndication: 'Left breast invasive carcinoma on core biopsy. Mastectomy with sentinel node biopsy.', receivedDate: hoursAgo(52), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary' },
  diagnostic: { grossDescription: 'A) Mastectomy, 640 g, with a 2.2 cm firm mass in the upper outer quadrant. B) Sentinel node 1, 1.4 cm. C) Sentinel node 2, 1.8 cm, with a firm white cut surface.', microscopicDescription: '', ancillaryStudies: '' },
  synopticReports: [],
  status: 'in-progress',
  createdAt: hoursAgo(52), updatedAt: hoursAgo(3),
  caseFlags: [], specimenFlags: [], reportingMode: 'orchestrator', coding: {},
} as unknown as Case];
