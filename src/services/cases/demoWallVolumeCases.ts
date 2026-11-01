// src/services/cases/demoWallVolumeCases.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 747 (Pete's Demo Seed Data Requirements, row S8: "Wall display profiles and live-looking data", Video 6).
// A working day's histology at Desert Valley (the lab the demo cases belong to, tenant HOSP-001): forty-one surgical
// cases, each at one bench step, and a quieter second laboratory, Midwest Pathology Associates (tenant HOSP-MPA), with
// six, whose blocks and slides fill the batches the wall views count
// (services/batches/wallDisplayDemoBatches.ts) and the scanner runs (digitalPathology/mockWsiScanBatchService.ts).
// Not yet assigned to a pathologist (histology still has them), so no pathologist's worklist grows; the bench screens,
// Batch Management and the wall displays show them. Fictional patients and clinicians; times relative to the reset.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import { cassetteIdentifier, slideIdentifier } from '@/types/labels/LabelData';

const HOUR = 3_600_000;
const NOW = Date.now();
const hoursAgo = (h: number) => new Date(NOW - h * HOUR).toISOString();
const born = (years: number, month: number, day: number) => new Date(Date.UTC(new Date().getUTCFullYear() - years, month - 1, day)).toISOString();

/** The bench step a case's material is at. */
export type WallVolumeStage = 'decal' | 'processing' | 'embedding' | 'microtomy' | 'staining' | 'referral' | 'scanning';

/** Which laboratory: Desert Valley, or the second facility the wall displays scope to. */
export type WallVolumeSite = 'dvmc' | 'mpa';
export const WALL_VOLUME_SITES: Record<WallVolumeSite, { originHospitalId: string; organisationId: string; facilityId: string; facilityName: string }> = {
  dvmc: { originHospitalId: 'HOSP-001', organisationId: 'ENT-DEFAULT', facilityId: 'c1', facilityName: 'Metro General Hospital' },
  mpa: { originHospitalId: 'HOSP-MPA', organisationId: 'ENT-MPA', facilityId: 'c-ent-mpa', facilityName: 'Midwest Pathology Associates' },
};

export interface WallVolumeCaseSpec {
  id: string;
  site: WallVolumeSite;
  stage: WallVolumeStage;
  patient: { id: string; mrn: string; firstName: string; lastName: string; age: number; month: number; day: number; sex: 'F' | 'M' };
  description: string;
  blocks: number;
  stat: boolean;
  /** Hours since the specimen was received. */
  receivedHoursAgo: number;
}

const FIRST_F = ['Adela', 'Beatrix', 'Cordelia', 'Delphine', 'Esmé', 'Florence', 'Gwendolyn', 'Hester', 'Isadora', 'Juniper', 'Katrin', 'Leonie', 'Marisol', 'Nerys', 'Ottilie', 'Petra', 'Rosamund', 'Sabine', 'Tamsin', 'Una', 'Verity'];
const FIRST_M = ['Alaric', 'Barnaby', 'Cassius', 'Dorian', 'Emrys', 'Fitzgerald', 'Gideon', 'Horatio', 'Ignatius', 'Jasper', 'Kieran', 'Lysander', 'Mortimer', 'Nikolai', 'Orrin', 'Peregrine', 'Quentin', 'Rupert', 'Silas', 'Thaddeus'];
const LAST = ['Abernathy', 'Blackthorn', 'Calloway', 'Dunmore', 'Ellsworth', 'Fairbanks', 'Greenhalgh', 'Holloway', 'Iverson', 'Jessop', 'Kettering', 'Lockwood', 'Merriweather', 'Northcott', 'Oakhurst', 'Pemberton', 'Quayle', 'Ravensworth', 'Sedgwick', 'Thistlewood', 'Underhill', 'Vandermeer', 'Westbrook', 'Yardley', 'Ashdown', 'Birchall', 'Coverdale', 'Dewhurst', 'Eversley', 'Fenwright', 'Galloway', 'Hartigan', 'Inglewood', 'Kingsley', 'Langtry', 'Marchbanks', 'Norrington', 'Ormsby', 'Prendergast', 'Redfern', 'Stanhope'];

/** What each step's specimens are, and how many cases are at it. */
const STAGES: { site?: WallVolumeSite; stage: WallVolumeStage; count: number; descriptions: string[]; blocks: number; received: (i: number) => number }[] = [
  { stage: 'decal', count: 3, blocks: 2, received: i => 30 + i * 6, descriptions: ['Femoral head, total hip arthroplasty', 'Bone marrow trephine, right posterior iliac crest', 'Tibia, distal, amputation margin'] },
  { stage: 'processing', count: 10, blocks: 3, received: i => 4 + i, descriptions: ['Colon, sigmoid, polypectomy', 'Skin, left forearm, excision', 'Gallbladder, cholecystectomy', 'Appendix, appendectomy', 'Endometrium, curettage', 'Stomach, antrum, biopsy', 'Breast, left, core biopsy', 'Prostate, needle biopsies', 'Skin, back, shave biopsy', 'Uterus, hysterectomy'] },
  { stage: 'embedding', count: 3, blocks: 3, received: i => 18 + i, descriptions: ['Thyroid, right lobectomy', 'Kidney, left, partial nephrectomy', 'Ovary, right, oophorectomy'] },
  { stage: 'microtomy', count: 3, blocks: 3, received: i => 22 + i, descriptions: ['Colon, right hemicolectomy', 'Lymph node, axillary, sentinel', 'Esophagus, distal, biopsy'] },
  { stage: 'staining', count: 7, blocks: 2, received: i => 26 + i, descriptions: ['Duodenum, biopsy', 'Skin, nose, Mohs debulk', 'Cervix, LEEP excision', 'Bladder, transurethral resection', 'Liver, core biopsy', 'Placenta', 'Tonsils, tonsillectomy'] },
  { stage: 'referral', count: 7, blocks: 1, received: i => 48 + i * 4, descriptions: ['Lung, right upper lobe, core biopsy', 'Colon, sigmoid, resection', 'Lymph node, cervical, excision', 'Melanoma, back, wide excision', 'Brain, frontal lobe, resection', 'Soft tissue, thigh, excision', 'Thyroid, total thyroidectomy'] },
  { site: 'mpa', stage: 'processing', count: 2, blocks: 3, received: i => 5 + i, descriptions: ['Skin, right cheek, excision', 'Colon, biopsies'] },
  { site: 'mpa', stage: 'microtomy', count: 2, blocks: 2, received: i => 20 + i, descriptions: ['Breast, left, excision', 'Uterus, endometrial biopsy'] },
  { site: 'mpa', stage: 'staining', count: 2, blocks: 2, received: i => 24 + i, descriptions: ['Prostate, needle biopsies', 'Stomach, biopsy'] },
  { stage: 'scanning', count: 8, blocks: 2, received: i => 30 + i * 2, descriptions: ['Breast, right, lumpectomy', 'Prostate, radical prostatectomy', 'Skin, scalp, excision', 'Stomach, partial gastrectomy', 'Kidney, right, nephrectomy', 'Colon, transverse, biopsy', 'Lung, left lower lobe, wedge resection', 'Bladder, biopsy'] },
];

/** STAT cases: the first of several steps, so each wall view has an urgent item. */
const STAT_AT: Partial<Record<WallVolumeStage, number[]>> = { processing: [2], microtomy: [0], staining: [1], referral: [3], scanning: [0] };

export const WALL_VOLUME_CASE_SPECS: readonly WallVolumeCaseSpec[] = (() => {
  const specs: WallVolumeCaseSpec[] = [];
  let n = 0, mpa = 0;
  for (const s of STAGES) {
    const site = s.site ?? 'dvmc';
    for (let i = 0; i < s.count; i++, n++) {
      const sex: 'F' | 'M' = n % 2 === 0 ? 'F' : 'M';
      const first = sex === 'F' ? FIRST_F[(n / 2) % FIRST_F.length | 0] : FIRST_M[((n - 1) / 2) % FIRST_M.length | 0];
      const num = site === 'mpa' ? 2101 + mpa++ : 5301 + n - mpa;
      specs.push({
        id: site === 'mpa' ? `MPA26-${num}` : `S26-${num}`, site, stage: s.stage,
        patient: { id: `PAT-W${num}`, mrn: `${site === 'mpa' ? 30 : 10}${num}`, firstName: first, lastName: LAST[n % LAST.length], age: 34 + ((n * 7) % 48), month: 1 + (n % 12), day: 1 + ((n * 5) % 28), sex },
        description: s.descriptions[i % s.descriptions.length], blocks: s.blocks,
        stat: site === 'dvmc' && (STAT_AT[s.stage] ?? []).includes(i), receivedHoursAgo: s.received(i),
      });
    }
  }
  return specs;
})();

export const wallVolumeBlockIds = (spec: Pick<WallVolumeCaseSpec, 'id' | 'blocks'>) =>
  Array.from({ length: spec.blocks }, (_, i) => cassetteIdentifier(spec.id, 'A', String(i + 1)));
export const wallVolumeSlideIds = (spec: Pick<WallVolumeCaseSpec, 'id' | 'blocks'>) =>
  Array.from({ length: spec.blocks }, (_, i) => slideIdentifier(spec.id, 'A', String(i + 1), 'L1'));

/** The block and its H&E as they stand at the case's step. */
function blockAt(spec: WallVolumeCaseSpec, i: number) {
  const n = spec.id.toLowerCase().replace(/^s26-/, '');
  const he = (status: string) => [{ id: `stn-wall-${n}-a${i + 1}-he`, stainName: 'H&E', stainTypeId: 'st-he', status }];
  const base = { id: `blk-wall-${n}-a${i + 1}`, label: String(i + 1) };
  switch (spec.stage) {
    case 'decal': case 'processing': case 'embedding': return { ...base, status: 'Grossed', stains: [] };
    case 'microtomy': return { ...base, status: 'Embedded', stains: he('Pending Cut') };
    case 'staining': return { ...base, status: 'Embedded', stains: he('Staining') };
    case 'referral': return { ...base, status: 'Embedded', stains: he('Ready for Review') };
    case 'scanning': return { ...base, status: 'Embedded', stains: he('Coverslipped') };
  }
}

function caseFrom(spec: WallVolumeCaseSpec): Case {
  const p = spec.patient;
  const site = WALL_VOLUME_SITES[spec.site];
  const [prefix, number] = spec.id.split('-');
  return {
    id: spec.id,
    accession: { accessionNumber: number, accessionPrefix: prefix.replace(/\d+$/, ''), accessionYear: 2026, fullAccession: spec.id },
    originHospitalId: site.originHospitalId, originEnterpriseId: site.organisationId,
    patient: {
      id: p.id, mrn: p.mrn, firstName: p.firstName, lastName: p.lastName, dateOfBirth: born(p.age, p.month, p.day), sex: p.sex,
      phone: '555-530-' + p.mrn.slice(-4), email: `${p.firstName.toLowerCase().replace(/[^a-z]/g, '')}.${p.lastName.toLowerCase()}@example.org`,
      address: '1 Demo Way, Phoenix, AZ 85004',
    },
    specimens: [{
      id: `${spec.id}-SP-1`, label: 'A', description: spec.description, receivedAt: hoursAgo(spec.receivedHoursAgo), collectedAt: hoursAgo(spec.receivedHoursAgo + 3),
      specimenFlags: [], blocks: Array.from({ length: spec.blocks }, (_, i) => blockAt(spec, i)),
    }],
    order: {
      priority: spec.stat ? 'STAT' : 'Routine', facilityId: site.facilityId, facilityName: site.facilityName, requestingProvider: spec.site === 'mpa' ? 'Dr. Helena Voss' : 'Dr. Michael Brown',
      clinicalIndication: '', receivedDate: hoursAgo(spec.receivedHoursAgo), assignedTo: null,
    },
    diagnostic: { grossDescription: '', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    status: 'gross-complete',
    createdAt: hoursAgo(spec.receivedHoursAgo), updatedAt: hoursAgo(1),
    caseFlags: [], specimenFlags: [], reportingMode: 'orchestrator', coding: {},
  } as unknown as Case;
}

export const DEMO_WALL_VOLUME_CASES: Case[] = WALL_VOLUME_CASE_SPECS.map(caseFrom);
