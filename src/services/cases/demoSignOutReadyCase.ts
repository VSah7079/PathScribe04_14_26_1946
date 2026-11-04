// src/services/cases/demoSignOutReadyCase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 738 (Pete, Demo Seed Data Requirements S1): one surgical case that passes every sign-out check, for the end
// of Video 1 (Surgical case, accession to sign-out). Pete chose a colon resection (Oct 30, 2026).
//
//   S26-4680  sigmoid colectomy for adenocarcinoma, pT3 pN1b, all slides Ready for Review, grossing complete with
//             the Colon — Segmental Resection for Tumor protocol, the colon synoptic fully answered and checked by a
//             person (no unverified AI answers), gross and microscopic descriptions, the final diagnosis, the CPT
//             charges drafted. Assigned to Dr. Sarah Johnson (the demo pathologist, sarah.johnson@demo.pathscribe.ai).
//
// A Full Reset brings it back unsigned, so the sign-out can be recorded again (the "pre-sign-out state for a
// re-take"). All names are fictional; dates are relative to the reset. Synoptic wording: the colon template's
// PathScribe-authored labels (data/templates/generic/colon_resection.json, Batch 738).
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import { cassetteIdentifier, slideIdentifier } from '@/types/labels/LabelData';
import { SURGICAL_DEMO_PROTOCOL_IDS } from '../protocols/surgicalDemoProtocols';

export const SIGN_OUT_READY_CASE_ID = 'S26-4680';
const ACC = SIGN_OUT_READY_CASE_ID;
const SP = `${ACC}-SP-1`;

/** The blocks the colon tumor protocol lays out, with what grossing put in each. */
const BLOCKS: { label: string; description: string; pieces: number }[] = [
  { label: '1', description: 'Tumor, deepest invasion into the mesocolic fat', pieces: 1 },
  { label: '2', description: 'Tumor with the radial (mesocolic) margin, inked blue', pieces: 1 },
  { label: '3', description: 'Tumor and adjacent mucosa', pieces: 1 },
  { label: '4', description: 'Tumor, centre', pieces: 1 },
  { label: '5', description: 'Proximal margin, en face', pieces: 1 },
  { label: '6', description: 'Distal margin, en face', pieces: 1 },
  { label: '7', description: 'Radial (mesocolic) margin, closest point, inked blue', pieces: 1 },
  { label: '8', description: 'Lymph nodes, five whole', pieces: 5 },
  { label: '9', description: 'Lymph nodes, five whole', pieces: 5 },
  { label: '10', description: 'Lymph nodes, four whole', pieces: 4 },
  { label: '11', description: 'Lymph nodes, four whole', pieces: 4 },
  { label: '12', description: 'Uninvolved mucosa with diverticula', pieces: 1 },
];

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
// Its own helper, not demoBaselineCases' demoDaysAgo: the baseline imports this file.
const demoDaysAgo = (d: number) => hoursAgo(d * 24);

/** Batch 742: demo illustrations (public/demo/attachments, labelled as such; never patient images) standing in for the
 *  photos the grossing camera sends to the imaging system, so the Attachments window has something to place. */
const photo = (id: string, kind: 'gross_photo' | 'block_face_photo', file: string) =>
  ({ id, kind, url: `/demo/attachments/${file}`, capturedAt: hoursAgo(52), capturedBy: 'Connor Whitlock' });
const GROSS_PHOTOS = [photo('img-4680-a-opened', 'gross_photo', 's26-4680-a-gross-opened.jpg'), photo('img-4680-a-sections', 'gross_photo', 's26-4680-a-gross-sections.jpg')];

const blocks = BLOCKS.map(b => ({
  id: `blk-4680-a${b.label}`, label: b.label, status: 'Embedded',
  ...(b.label === '2' ? { digitalAssets: [photo('img-4680-a2-face', 'block_face_photo', 's26-4680-a2-block-face.png')] } : {}),
  displayId: cassetteIdentifier(ACC, 'A', b.label),
  pieceCount: b.pieces, pieceDescription: b.description, pieceCountAtEmbedding: b.pieces,
  locationHistory: [
    { location: 'Grossing Station 1', workflowStage: 'Grossing', action: 'Grossed & Cut', at: hoursAgo(52), source: 'PathScribe', performedByName: 'Connor Whitlock' },
    { location: 'Histology — Embedding', workflowStage: 'Embedding', action: 'Embedded', at: hoursAgo(30), source: 'PathScribe', performedByName: 'Kevin Brooks' },
    { location: 'Microtome — Bench 1', workflowStage: 'Microtomy / Sectioning', action: 'Sectioned', at: hoursAgo(28), source: 'PathScribe', performedByName: 'Kevin Brooks' },
  ],
  stains: [{
    id: `stn-4680-a${b.label}-1`, stainName: 'H&E', stainTypeId: 'st-he', status: 'Ready for Review',
    displayId: slideIdentifier(ACC, 'A', b.label, 'L1'),
    locationHistory: [
      { location: 'Staining Station 1', workflowStage: 'Staining', action: 'Stained & Coverslipped', at: hoursAgo(26), source: 'PathScribe', performedByName: 'Kevin Brooks' },
      { location: 'Slide Distribution — Desk 1', workflowStage: 'Slide Distribution', action: 'Checked out to pathologist', at: hoursAgo(24), source: 'PathScribe', performedByName: 'Kevin Brooks' },
    ],
  }],
}));

/** The colon synoptic, every required question answered (option ids from colon_resection.json). */
export const SIGN_OUT_READY_COLON_ANSWERS: Record<string, string | string[]> = {
  procedure: 'procedure_opt_5',                          // Sigmoidectomy
  tumor_site: ['tumor_site_opt_8'],                      // Sigmoid colon
  histologic_type: 'histologic_type_opt_1',              // Adenocarcinoma
  histologic_grade: 'histologic_grade_opt_2',            // Moderately differentiated (G2)
  multiple_primary_sites: 'multiple_primary_sites_opt_1', // Not identified
  tumor_size: '4.2 cm',
  tumor_extent: 'tumor_extent_opt_5',                    // Through the muscularis propria into pericolorectal tissue
  macroscopic_perforation: 'macroscopic_perforation_opt_1',
  lvi: ['lvi_opt_2'],                                    // Small vessel
  perineural_invasion: 'perineural_invasion_opt_1',
  tumor_budding_score: 'tumor_budding_score_opt_1',      // Bd1
  polyp_type: 'polyp_type_opt_1',                        // None identified
  treatment_effect: 'treatment_effect_opt_6',            // Not applicable (no neoadjuvant therapy)
  margin_status_invasive: 'margin_status_invasive_opt_1', // Negative
  closest_margins_invasive: ['closest_margins_invasive_opt_3'], // Radial/circumferential
  distance_to_closest_margin: '1.8 cm',
  distance_radial_margin: '1.8 cm',
  distance_distal_margin: '6.5 cm',
  margin_status_noninvasive: ['margin_status_noninvasive_opt_1'],
  regional_ln_status: 'regional_ln_status_opt_2',        // Tumor present
  ln_with_tumor: '2',
  ln_examined: '18',
  tumor_deposits: 'tumor_deposits_opt_1',                // Not identified
  stage_category_a: 'stage_category_a_opt_5',           // pT3
  stage_category_b: 'stage_category_b_opt_3',           // pN1b
  stage_category_c: 'stage_category_c_opt_4',           // Not applicable
  additional_findings_list: ['additional_findings_list_opt_5'], // Diverticulosis
  special_studies_note: 'Mismatch repair proteins (MLH1, PMS2, MSH2, MSH6) by immunohistochemistry: nuclear expression retained in all four (mismatch repair proficient).',
};

export const DEMO_SIGN_OUT_READY_CASE = {
  id: ACC,
  accession: { accessionNumber: '4680', accessionPrefix: 'S', accessionYear: 2026, fullAccession: ACC },
  originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-DEFAULT',
  patient: {
    id: 'PAT-4680', mrn: '104680', firstName: 'Gerald', lastName: 'Hartwell',
    dateOfBirth: '1959-03-14T12:00:00.000Z', sex: 'M',
    phone: '555-468-0001', email: 'gerald.hartwell@example.org', address: '18 Ironwood Lane, Phoenix, AZ 85016',
  },
  specimens: [{
    id: SP, label: 'A', description: 'Sigmoid colon, segmental resection for tumor',
    specimenDictionaryEntryId: 'sp014',
    protocolSnapshot: { id: SURGICAL_DEMO_PROTOCOL_IDS.colonResectionTumor, version: 1, name: 'Colon — Segmental Resection for Tumor' },
    collectedAt: demoDaysAgo(3), receivedAt: demoDaysAgo(3), specimenFlags: [],
    processing: { processedAt: demoDaysAgo(3), fixationEndedAt: hoursAgo(54), fixativeToTissueRatioConfirmation: { userId: 'PA-001', userName: 'Connor Whitlock', confirmedAt: hoursAgo(54) } },
    coding: { icdO: [{ code: '8140/3', description: 'Adenocarcinoma, NOS' }] },
    blocks, digitalAssets: GROSS_PHOTOS,
  }],
  order: {
    priority: 'Routine', requestingProvider: 'Dr. Miriam Castellano', facilityId: 'c1', facilityName: 'Metro General Hospital',
    clinicalIndication: 'Sigmoid colon mass at 28 cm on colonoscopy; biopsy showed invasive adenocarcinoma. CT: no distant disease. Laparoscopic sigmoid colectomy.',
    receivedDate: demoDaysAgo(3), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary',
  },
  diagnostic: {
    grossDescription: 'Received in formalin, labeled with the patient’s name and "sigmoid colon", is a segment of colon 24.0 cm long and 4.5 cm in diameter, with attached mesocolic fat to 6.0 cm. There is an ulcerated, firm tan-white tumor, 4.2 × 3.8 cm, 8.0 cm from the proximal and 6.5 cm from the distal margin, involving 70% of the circumference. On section it extends through the muscle wall into the mesocolic fat, 1.8 cm from the inked radial (mesocolic) margin. No perforation. The background mucosa has scattered diverticula. Eighteen lymph nodes are found, 0.3 to 1.4 cm. Representative sections are submitted in cassettes A1 to A12.',
    microscopicDescription: 'Moderately differentiated adenocarcinoma invades through the muscularis propria into the mesocolic fat (pT3). Small-vessel lymphovascular invasion is present; no perineural invasion; tumor budding low (Bd1). The proximal, distal and radial margins are free of tumor, the radial margin 1.8 cm away. Two of eighteen lymph nodes contain metastatic adenocarcinoma (2/18); no tumor deposits. Background diverticulosis. Mismatch repair proteins are retained.',
    primaryDiagnosis: 'Sigmoid colon, segmental resection: invasive adenocarcinoma, moderately differentiated, 4.2 cm, invading through the muscularis propria into the mesocolic fat; margins free (radial 1.8 cm); metastatic adenocarcinoma in 2 of 18 lymph nodes; pT3 pN1b. Mismatch repair proficient.',
  },
  synopticReports: [{
    instanceId: `${SP}_colon_resection_demo`, specimenId: SP,
    templateId: 'colon_resection', templateName: 'Colon resection',
    status: 'draft', answers: SIGN_OUT_READY_COLON_ANSWERS,
    createdAt: demoDaysAgo(2), updatedAt: hoursAgo(3),
  }],
  // The signing pathologist must be an active participant whose participation type can finalize.
  participants: [{ staffId: 'PATH-SJ-001', staffName: 'Dr. Sarah Johnson', source: 'system', participationTypeIds: ['attending'], addedBy: 'system', addedAt: demoDaysAgo(3), status: 'active' }],
  coding: { icd10: ['C18.7'], cpt: ['88309', '88342'] },
  // The pathologist has confirmed the malignant finding (else the mismatch check reads "confirmed malignant: no").
  abnormalDetectionStatus: { severity: 'Malignant', confirmedAt: hoursAgo(4) },
  grossCompletedAt: hoursAgo(50),
  status: 'in-progress',
  createdAt: demoDaysAgo(3), updatedAt: hoursAgo(3),
  caseFlags: [], specimenFlags: [], reportingMode: 'assist',
} as unknown as Case;
