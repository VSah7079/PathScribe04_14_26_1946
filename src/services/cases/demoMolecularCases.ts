// src/services/cases/demoMolecularCases.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 746 (Pete's Demo Seed Data Requirements, row S7: "Molecular data end to end", for Videos 3 and 5).
// Fictional patients and clinicians only; every time is relative to the reset.
//
// The surgical cases behind the molecular seed (services/molecular/molecularRunHistoryDemoSeed.ts):
//   S26-5201 to 5207  lung (seven): an in-house EGFR mutation PCR add-on on one block, its order waiting for a plate
//   S26-5211 to 5215  colorectal (five): an in-house KRAS mutation PCR add-on, waiting for a plate
//   S26-5208          lung lobectomy: EGFR resulted Positive on yesterday's completed run; the Lung Adenocarcinoma
//                     synoptic's EGFR Mutation Status reads Detected (the case whose report shows a molecular result)
//   S26-5209          lung core biopsy: EGFR resulted Negative on the same run; the synoptic reads Not detected
//   S26-5216          sigmoid resection: KRAS resulted Positive on the repeat run, after the first run's no-template
//                     control amplified (that run is blocked and superseded)
// Each add-on is a block's DNA curls (Five 10 µm curls), ordered by the pathologist the case is assigned to, routed to
// Desert Valley's in-house molecular laboratory, as S26-4493's EGFR add-on is (mockCaseService.ts).
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';

const HOUR = 3_600_000;
const NOW = Date.now();
const hoursAgo = (h: number) => new Date(NOW - h * HOUR).toISOString();
const born = (years: number, month: number, day: number) => new Date(Date.UTC(new Date().getUTCFullYear() - years, month - 1, day)).toISOString();

export const DESERT_VALLEY_LAB = 'c-ent-dvmc';
export const MOLECULAR_DEMO_PATHOLOGISTS = {
  sarah: { id: 'PATH-SJ-001', name: 'Dr. Sarah Johnson' },
  pete: { id: 'PATH-001', name: 'Pete Nimmo' },
} as const;
type Pathologist = (typeof MOLECULAR_DEMO_PATHOLOGISTS)[keyof typeof MOLECULAR_DEMO_PATHOLOGISTS];

export type MolecularDemoAssay = 'egfr' | 'kras';
export const MOLECULAR_DEMO_ASSAYS: Record<MolecularDemoAssay, { stainTypeId: string; name: string }> = {
  egfr: { stainTypeId: 'st-egfr-pcr', name: 'EGFR mutation PCR' },
  kras: { stainTypeId: 'st-kras-pcr', name: 'KRAS mutation PCR' },
};

/** One case behind the molecular seed: what the order and the plate need to know about it. */
export interface MolecularDemoCaseSpec {
  id: string;
  assay: MolecularDemoAssay;
  patient: { id: string; mrn: string; firstName: string; lastName: string; age: number; month: number; day: number; sex: 'F' | 'M' };
  description: string;
  bodySite: string;
  blockLabel: string;
  clinician: string;
  indication: string;
  diagnosis: string;
  pathologist: Pathologist;
  /** Hours since the add-on was ordered. */
  orderedHoursAgo: number;
  /** The curls are cut and in their tube (else still waiting at the microtome). */
  curlsCut: boolean;
  /** Resulted on a completed run (molecularRunHistoryDemoSeed.ts). */
  result?: 'POSITIVE' | 'NEGATIVE';
  /** The text the ancillary studies line carries once resulted. */
  resultText?: string;
}

const S = MOLECULAR_DEMO_PATHOLOGISTS.sarah;
const P = MOLECULAR_DEMO_PATHOLOGISTS.pete;
const lungDx = 'Invasive non-mucinous adenocarcinoma of lung.';
const crcDx = 'Invasive adenocarcinoma, colorectal primary.';

export const MOLECULAR_DEMO_CASE_SPECS: readonly MolecularDemoCaseSpec[] = [
  // ── Waiting for an EGFR plate ──
  { id: 'S26-5201', assay: 'egfr', patient: { id: 'PAT-M5201', mrn: '105201', firstName: 'Lorraine', lastName: 'Haverty', age: 64, month: 3, day: 11, sex: 'F' }, description: 'Lung, right lower lobe, CT-guided core biopsy', bodySite: 'Lung, right lower lobe', blockLabel: '1', clinician: 'Dr. Michael Brown', indication: '2.6 cm right lower lobe mass, never smoker.', diagnosis: lungDx, pathologist: S, orderedHoursAgo: 30, curlsCut: true },
  { id: 'S26-5202', assay: 'egfr', patient: { id: 'PAT-M5202', mrn: '105202', firstName: 'Desmond', lastName: 'Achterberg', age: 71, month: 7, day: 2, sex: 'M' }, description: 'Lung, left upper lobe, wedge resection', bodySite: 'Lung, left upper lobe', blockLabel: '2', clinician: 'Dr. Samuel Ortega', indication: '1.9 cm left upper lobe nodule, enlarging on surveillance.', diagnosis: lungDx, pathologist: S, orderedHoursAgo: 28, curlsCut: true },
  { id: 'S26-5203', assay: 'egfr', patient: { id: 'PAT-M5203', mrn: '105203', firstName: 'Mei-Ling', lastName: 'Corcoran', age: 58, month: 11, day: 19, sex: 'F' }, description: 'Lung, right upper lobe, lobectomy', bodySite: 'Lung, right upper lobe', blockLabel: '4', clinician: 'Dr. Samuel Ortega', indication: 'Biopsy-proven adenocarcinoma, right upper lobe. Lobectomy.', diagnosis: lungDx, pathologist: P, orderedHoursAgo: 26, curlsCut: true },
  { id: 'S26-5204', assay: 'egfr', patient: { id: 'PAT-M5204', mrn: '105204', firstName: 'Augustin', lastName: 'Pelletier', age: 67, month: 1, day: 30, sex: 'M' }, description: 'Lung, left lower lobe, CT-guided core biopsy', bodySite: 'Lung, left lower lobe', blockLabel: '1', clinician: 'Dr. Michael Brown', indication: 'Left lower lobe mass with pleural effusion.', diagnosis: lungDx, pathologist: P, orderedHoursAgo: 20, curlsCut: true },
  { id: 'S26-5205', assay: 'egfr', patient: { id: 'PAT-M5205', mrn: '105205', firstName: 'Philippa', lastName: 'Nakashima', age: 61, month: 5, day: 8, sex: 'F' }, description: 'Pleura, parietal, VATS biopsy', bodySite: 'Pleura, parietal', blockLabel: '1', clinician: 'Dr. Samuel Ortega', indication: 'Pleural thickening and nodules; known lung mass.', diagnosis: 'Metastatic adenocarcinoma, consistent with lung primary (TTF-1 positive).', pathologist: S, orderedHoursAgo: 9, curlsCut: false },
  { id: 'S26-5206', assay: 'egfr', patient: { id: 'PAT-M5206', mrn: '105206', firstName: 'Tobias', lastName: 'Wrenfield', age: 55, month: 9, day: 14, sex: 'M' }, description: 'Lung, right middle lobe, wedge resection', bodySite: 'Lung, right middle lobe', blockLabel: '1', clinician: 'Dr. Michael Brown', indication: '1.4 cm right middle lobe ground-glass nodule.', diagnosis: lungDx, pathologist: P, orderedHoursAgo: 6, curlsCut: false },
  { id: 'S26-5207', assay: 'egfr', patient: { id: 'PAT-M5207', mrn: '105207', firstName: 'Imogen', lastName: 'Saltonstall', age: 69, month: 2, day: 25, sex: 'F' }, description: 'Lymph node, left supraclavicular, excision', bodySite: 'Lymph node, supraclavicular', blockLabel: '1', clinician: 'Dr. Samuel Ortega', indication: 'Enlarged supraclavicular node; lung mass on CT.', diagnosis: 'Metastatic adenocarcinoma, consistent with lung primary (TTF-1 positive).', pathologist: S, orderedHoursAgo: 3, curlsCut: false },
  // ── Waiting for a KRAS plate ──
  { id: 'S26-5211', assay: 'kras', patient: { id: 'PAT-M5211', mrn: '105211', firstName: 'Bartholomew', lastName: 'Quist', age: 66, month: 4, day: 17, sex: 'M' }, description: 'Colon, sigmoid, segmental resection', bodySite: 'Colon, sigmoid', blockLabel: '3', clinician: 'Dr. Jennifer Davis', indication: 'Sigmoid adenocarcinoma on biopsy, liver lesions on staging CT.', diagnosis: crcDx, pathologist: S, orderedHoursAgo: 27, curlsCut: true },
  { id: 'S26-5212', assay: 'kras', patient: { id: 'PAT-M5212', mrn: '105212', firstName: 'Rosalind', lastName: 'Okereke', age: 52, month: 8, day: 6, sex: 'F' }, description: 'Rectum, endoscopic biopsy', bodySite: 'Rectum', blockLabel: '1', clinician: 'Dr. Jennifer Davis', indication: 'Rectal mass at 8 cm, metastatic disease suspected.', diagnosis: crcDx, pathologist: P, orderedHoursAgo: 22, curlsCut: true },
  { id: 'S26-5213', assay: 'kras', patient: { id: 'PAT-M5213', mrn: '105213', firstName: 'Cornelius', lastName: 'Vashti', age: 73, month: 12, day: 1, sex: 'M' }, description: 'Liver, segment 6, core biopsy', bodySite: 'Liver, segment 6', blockLabel: '1', clinician: 'Dr. Michael Brown', indication: 'Liver lesion; history of colon cancer.', diagnosis: 'Metastatic adenocarcinoma, consistent with colorectal primary (CK20 and CDX2 positive).', pathologist: S, orderedHoursAgo: 12, curlsCut: true },
  { id: 'S26-5214', assay: 'kras', patient: { id: 'PAT-M5214', mrn: '105214', firstName: 'Henrietta', lastName: 'Blackwood', age: 60, month: 6, day: 23, sex: 'F' }, description: 'Colon, right hemicolectomy', bodySite: 'Colon, ascending', blockLabel: '5', clinician: 'Dr. Jennifer Davis', indication: 'Ascending colon carcinoma. Right hemicolectomy.', diagnosis: crcDx, pathologist: P, orderedHoursAgo: 7, curlsCut: false },
  { id: 'S26-5215', assay: 'kras', patient: { id: 'PAT-M5215', mrn: '105215', firstName: 'Lionel', lastName: 'Ferreira-Hale', age: 48, month: 10, day: 9, sex: 'M' }, description: 'Colon, transverse, endoscopic biopsy', bodySite: 'Colon, transverse', blockLabel: '1', clinician: 'Dr. Michael Brown', indication: 'Transverse colon mass, lung nodules on CT.', diagnosis: crcDx, pathologist: S, orderedHoursAgo: 2, curlsCut: false },
  // ── Resulted on a completed run ──
  { id: 'S26-5208', assay: 'egfr', patient: { id: 'PAT-M5208', mrn: '105208', firstName: 'Evangeline', lastName: 'Thornbury', age: 62, month: 3, day: 29, sex: 'F' }, description: 'Lung, left upper lobe, lobectomy', bodySite: 'Lung, left upper lobe', blockLabel: '3', clinician: 'Dr. Samuel Ortega', indication: 'Left upper lobe adenocarcinoma on biopsy, never smoker. Lobectomy.', diagnosis: lungDx, pathologist: S, orderedHoursAgo: 60, curlsCut: true, result: 'POSITIVE', resultText: 'EGFR mutation PCR (in-house, Desert Valley): mutation detected, exon 19 deletion.' },
  { id: 'S26-5209', assay: 'egfr', patient: { id: 'PAT-M5209', mrn: '105209', firstName: 'Fergus', lastName: 'Ingleby', age: 70, month: 8, day: 13, sex: 'M' }, description: 'Lung, right upper lobe, CT-guided core biopsy', bodySite: 'Lung, right upper lobe', blockLabel: '1', clinician: 'Dr. Michael Brown', indication: 'Right upper lobe mass, former smoker.', diagnosis: lungDx, pathologist: S, orderedHoursAgo: 58, curlsCut: true, result: 'NEGATIVE', resultText: 'EGFR mutation PCR (in-house, Desert Valley): no mutation detected.' },
  { id: 'S26-5216', assay: 'kras', patient: { id: 'PAT-M5216', mrn: '105216', firstName: 'Wilhelmina', lastName: 'Strand', age: 57, month: 1, day: 4, sex: 'F' }, description: 'Colon, sigmoid, segmental resection', bodySite: 'Colon, sigmoid', blockLabel: '4', clinician: 'Dr. Jennifer Davis', indication: 'Sigmoid carcinoma with liver metastases. Resection before systemic therapy.', diagnosis: crcDx, pathologist: P, orderedHoursAgo: 110, curlsCut: true, result: 'POSITIVE', resultText: 'KRAS mutation PCR (in-house, Desert Valley): mutation detected, codon 12 (G12D). The first run was repeated after its no-template control amplified.' },
];

export const molecularDemoSpecimenId = (caseId: string) => `${caseId}-SP-1`;
export const molecularDemoBlockId = (spec: Pick<MolecularDemoCaseSpec, 'id' | 'blockLabel'>) => `blk-demo-${spec.id.slice(4)}-a${spec.blockLabel}`;
export const molecularDemoAddOnId = (spec: Pick<MolecularDemoCaseSpec, 'id' | 'assay'>) => `addon-demo-${spec.id.slice(4)}-${spec.assay}`;

/** The Lung Adenocarcinoma synoptic for a resulted lung case: the result already in EGFR Mutation Status. */
function lungSynoptic(spec: MolecularDemoCaseSpec) {
  const specimenId = molecularDemoSpecimenId(spec.id);
  return [{
    instanceId: `${specimenId}_lung_adeno_demo`, specimenId, templateId: 'lung_adeno', templateName: 'Generic Template — Lung Adeno',
    status: 'draft',
    answers: {
      histologic_type: 'histologic_type_opt_3', histologic_grade: 'histologic_grade_opt_2',
      pdl1_tps: 'pdl1_tps_lt1', alk_status: 'alk_non_rearranged', ros1_status: 'ros1_not_tested',
      egfr_status: spec.result === 'POSITIVE' ? 'egfr_detected' : 'egfr_not_detected',
    },
    createdAt: hoursAgo(spec.orderedHoursAgo), updatedAt: hoursAgo(16),
  }];
}

function caseFrom(spec: MolecularDemoCaseSpec): Case {
  const p = spec.patient;
  const specimenId = molecularDemoSpecimenId(spec.id);
  const received = spec.orderedHoursAgo + 26;
  const assay = MOLECULAR_DEMO_ASSAYS[spec.assay];
  const ordered = hoursAgo(spec.orderedHoursAgo);
  return {
    id: spec.id,
    accession: { accessionNumber: spec.id.slice(4), accessionPrefix: 'S', accessionYear: 2026, fullAccession: spec.id },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-DEFAULT',
    patient: {
      id: p.id, mrn: p.mrn, firstName: p.firstName, lastName: p.lastName, dateOfBirth: born(p.age, p.month, p.day), sex: p.sex,
      phone: '555-520-' + p.mrn.slice(-4), email: `${p.firstName.toLowerCase().replace(/[^a-z]/g, '')}.${p.lastName.toLowerCase().replace(/[^a-z]/g, '')}@example.org`,
      address: '1 Demo Way, Phoenix, AZ 85004',
    },
    specimens: [{
      id: specimenId, label: 'A', description: spec.description, receivedAt: hoursAgo(received), collectedAt: hoursAgo(received + 2), specimenFlags: [],
      collection: { bodySite: spec.bodySite },
      blocks: [{
        id: molecularDemoBlockId(spec), label: spec.blockLabel, status: 'Embedded', stains: [
          { id: `stn-demo-${spec.id.slice(4)}-he`, stainName: 'H&E', stainTypeId: 'st-he', status: 'Ready for Review' },
          {
            id: molecularDemoAddOnId(spec), stainName: assay.name, stainTypeId: assay.stainTypeId, status: spec.curlsCut ? 'Cut & Placed' : 'Pending Cut',
            userAdded: true, printStatus: spec.curlsCut ? 'Printed' : 'Pending',
            orderedByPathologistId: spec.pathologist.id, orderedByPathologistName: spec.pathologist.name, orderedAt: ordered,
            addOnPriority: 'Routine Sign-Out', slideMediaType: 'Plus Glass', cuttingInstructions: 'Five 10 µm curls for DNA extraction.',
            routedQueueLabel: 'Molecular In-House Queue', performingLabFacilityId: DESERT_VALLEY_LAB,
          },
        ],
      }],
    }],
    order: {
      priority: 'Routine', facilityId: 'c1', facilityName: 'Metro General Hospital', requestingProvider: spec.clinician,
      clinicalIndication: spec.indication, receivedDate: hoursAgo(received), assignedTo: spec.pathologist.id, assignedParticipationTypeId: 'primary',
    },
    diagnostic: {
      grossDescription: '', microscopicDescription: spec.diagnosis,
      ancillaryStudies: spec.resultText ?? `${assay.name} ordered in-house (pending).`,
    },
    synopticReports: spec.result && spec.assay === 'egfr' ? lungSynoptic(spec) : [],
    status: 'in-progress',
    createdAt: hoursAgo(received), updatedAt: hoursAgo(spec.result ? 16 : 1),
    caseFlags: [], specimenFlags: [], reportingMode: 'orchestrator', coding: {},
  } as unknown as Case;
}

export const DEMO_MOLECULAR_CASES: Case[] = MOLECULAR_DEMO_CASE_SPECS.map(caseFrom);
