// src/services/cases/demoProstatectomyMapCase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 751 (Pete's seed row S15, Video 9 steps 5 to 8): a radical prostatectomy the demo pathologist can open, with its
// organ map already in the report, so the preview step can be shown without a first insert. MFT26-8804-PR-RP (the
// demo guide's prostatectomy) belongs to the Manchester demo organisation and opens only for its own pathologist, so
// Dr. Sarah Johnson cannot open it; this case carries the same map answers at Desert Valley.
//   S26-5407  Prostate, radical prostatectomy with pelvic lymph nodes (Dr. Sarah Johnson, an Orchestrator case):
//             Grade Group 3 in the right peripheral zone (base, mid and apex), extension outside the prostate and a
//             positive margin at the right mid posterolateral sector. The map image in the report was made by Insert
//             into report on this case (demoProstatectomyMapFigure.json), so it is current until an answer changes.
// Fictional patient and clinicians; times relative to the reset.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import { cassetteIdentifier, slideIdentifier } from '@/types/labels/LabelData';
import figure from './demoProstatectomyMapFigure.json';

export const DEMO_PROSTATECTOMY_MAP_CASE_ID = 'S26-5407';
export const DEMO_PROSTATECTOMY_MAP_PATIENT = { id: 'PAT-B5407', mrn: '105407', firstName: 'Harold', lastName: 'Brennick', dateOfBirth: '1962-07-03' };

const ACC = DEMO_PROSTATECTOMY_MAP_CASE_ID;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
export const DEMO_PROSTATECTOMY_INSTANCE_ID = `${ACC}-SP-1_prostate_radical_prostatectomy_001`;

/** The map questions (the anatomical map section of the prostatectomy checklist). */
export const DEMO_PROSTATECTOMY_MAP_ANSWERS: Record<string, string | string[]> = {
  psmap_tumour_sectors: ['psmap_sector_r_base_pzpl', 'psmap_sector_r_base_pzpm', 'psmap_sector_r_mid_pza', 'psmap_sector_r_mid_pzpl', 'psmap_sector_r_mid_pzpm', 'psmap_sector_r_apex_pzpl'],
  psmap_grade_group: 'psmap_gg_3',
  psmap_epe_sectors: ['psmap_sector_r_mid_pzpl'],
  psmap_margin_sectors: ['psmap_sector_r_mid_pzpl'],
  psmap_sv_invasion: 'psmap_sv_none',
};

/** Batch 753: the rest of the checklist, in step with the map (PathScribe's own checklist wording). */
export const DEMO_PROSTATECTOMY_SUMMARY_ANSWERS: Record<string, string | string[]> = {
  pre_biopsy_psa: '11.2', pre_biopsy_psa_availability: 'pre_biopsy_psa_availability_opt_1',
  specimen_weight_g: '54',
  seminal_vesicles_present: 'seminal_vesicles_present_opt_1', seminal_vesicle_laterality: 'seminal_vesicle_laterality_opt_3',
  lymph_nodes_present: 'lymph_nodes_present_opt_1', lymph_nodes_laterality: 'lymph_nodes_laterality_opt_3',
  histological_tumour_type: ['histological_tumour_type_opt_1'],
  location_dominant_tumour: 'Right peripheral zone, base to apex',
  gleason_applicable: 'gleason_applicable_opt_1',
  primary_gleason_grade: 'primary_gleason_grade_opt_2', secondary_gleason_grade: 'secondary_gleason_grade_opt_1',
  gleason_score_total: 'gleason_score_total_opt_3', grade_group: 'grade_group_opt_3',
  invasive_cribriform_intraductal: 'invasive_cribriform_intraductal_opt_2',
  extraprostatic_extension: 'extraprostatic_extension_opt_2',
  extraprostatic_extension_location: 'Right mid-gland, posterolateral',
  extraprostatic_extension_extent: 'extraprostatic_extension_extent_opt_1',
  bladder_neck_involvement: 'bladder_neck_involvement_opt_1', seminal_vesicle_involvement: 'seminal_vesicle_involvement_opt_1',
  margin_status: 'margin_status_opt_2', margin_extent: 'margin_extent_opt_1', margin_location: ['margin_location_opt_3'],
  circumferential_margin_type: ['circumferential_margin_type_opt_2'],
  circumferential_margin_location: '2 mm, Gleason pattern 4 at the margin',
  lymphovascular_invasion: 'lymphovascular_invasion_opt_1',
  number_lymph_nodes_examined: '14', number_positive_lymph_nodes: '0',
  t_category: 't_category_opt_2', n_category: 'n_category_opt_1',
};

const specimen = (n: number, label: string, description: string) => ({
  id: `${ACC}-SP-${n}`, label, description, receivedAt: hoursAgo(50), collectedAt: hoursAgo(53), specimenFlags: [],
  blocks: [{
    id: `blk-demo-5407-${label.toLowerCase()}1`, label: '1', status: 'Embedded', displayId: cassetteIdentifier(ACC, label, '1'),
    stains: [{ id: `stn-demo-5407-${label.toLowerCase()}1-he`, stainName: 'H&E', stainTypeId: 'st-he', status: 'Ready for Review', displayId: slideIdentifier(ACC, label, '1', 'L1') }],
  }],
});

export const DEMO_PROSTATECTOMY_MAP_CASE = {
  id: ACC,
  accession: { accessionNumber: '5407', accessionPrefix: 'S', accessionYear: 2026, fullAccession: ACC },
  originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-DEFAULT',
  patient: {
    id: DEMO_PROSTATECTOMY_MAP_PATIENT.id, mrn: DEMO_PROSTATECTOMY_MAP_PATIENT.mrn, firstName: DEMO_PROSTATECTOMY_MAP_PATIENT.firstName, lastName: DEMO_PROSTATECTOMY_MAP_PATIENT.lastName,
    dateOfBirth: `${DEMO_PROSTATECTOMY_MAP_PATIENT.dateOfBirth}T12:00:00.000Z`, sex: 'M',
    phone: '555-540-5407', email: 'harold.brennick@example.org', address: '1 Demo Way, Phoenix, AZ 85004',
  },
  specimens: [specimen(1, 'A', 'Prostate and seminal vesicles, radical prostatectomy'), specimen(2, 'B', 'Lymph nodes, right pelvic'), specimen(3, 'C', 'Lymph nodes, left pelvic')],
  order: {
    priority: 'Routine', requestingProvider: 'Dr. Anil Sharma', facilityId: 'c1', facilityName: 'Metro General Hospital',
    clinicalIndication: 'Prostate adenocarcinoma, Gleason 4+3=7 (Grade Group 3) on biopsy. PSA 11.2 ng/mL. MRI: right-sided lesion, T2N0. Robot-assisted radical prostatectomy with bilateral pelvic lymph node dissection.',
    receivedDate: hoursAgo(50), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary',
  },
  diagnostic: {
    grossDescription: 'Radical prostatectomy, 54 g, 4.8 x 4.2 x 3.9 cm, inked right red and left black, with both seminal vesicles. Serially sectioned from apex to base and submitted entirely.',
    microscopicDescription: 'Acinar adenocarcinoma, Gleason 4+3=7 (Grade Group 3), in the right peripheral zone at the base, mid-gland and apex. Extraprostatic extension at the right mid posterolateral aspect, where the inked margin is involved. Seminal vesicles free. Lymph nodes: 0 of 14 involved.',
    ancillaryStudies: '',
  },
  synopticReports: [{
    instanceId: DEMO_PROSTATECTOMY_INSTANCE_ID, specimenId: `${ACC}-SP-1`,
    templateId: 'prostate_radical_prostatectomy', templateName: 'Radical prostatectomy',
    status: 'draft', answers: { ...DEMO_PROSTATECTOMY_SUMMARY_ANSWERS, ...DEMO_PROSTATECTOMY_MAP_ANSWERS },
    createdAt: hoursAgo(26), updatedAt: hoursAgo(2),
  }],
  // The map image already in the report (made by Insert into report on this case, the light print colours).
  organMapFigures: [{ ...figure, instanceId: DEMO_PROSTATECTOMY_INSTANCE_ID, insertedAt: hoursAgo(2) }],
  participants: [{ staffId: 'PATH-SJ-001', staffName: 'Dr. Sarah Johnson', source: 'system', participationTypeIds: ['attending'], addedBy: 'system', addedAt: hoursAgo(50), status: 'active' }],
  status: 'in-progress',
  createdAt: hoursAgo(50), updatedAt: hoursAgo(2),
  caseFlags: [], specimenFlags: [], reportingMode: 'orchestrator', coding: {},
} as unknown as Case;
