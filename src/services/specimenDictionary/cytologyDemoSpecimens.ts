// src/services/specimenDictionary/cytologyDemoSpecimens.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 716 (Pete, Oct 28 2026: "set demo data for Cytology Part 2 - this is actually a demonstration issue since
// we will want to be able to demo those capabilities").
//
// Found on research (Oct 28): the Accession cytology card ('Cytology — Clinical History & Accessioning
// Detail') only appears when a specimen's dictionary entry has specimenCategory GYN_CYTOLOGY or NON_GYN_CYTOLOGY,
// and only three demo entries had one. No dictionary entry had a department, so every demo accession number fell
// back to O26-xxxx and the "different case types are accessioned separately" rule never fired.
//
// This file supplies, as seed data only (no new behaviour):
//   • the cytology entries a training video needs, each with category, department, organ site / default synoptic
//     template where one exists, and a processing protocol where one is seeded (cell block, HPV aliquot);
//   • `applyDemoDepartments`, which gives the starter entries (scripts/terminology-sources/specimens-starter.json,
//     which is outside src/) their department and category: every surgical entry to Surgical Tissue, Consult to
//     Histology-Only / Consultation, and the starter cytology/FNA entries to Non-GYN Cytology.
// Everything is editable in Configuration > Specimen Dictionary. A Full Reset brings it all back.
// ─────────────────────────────────────────────────────────────────────────────

import type { SpecimenEntry } from './specimenTypes';
import { DEMO_DEPARTMENT_IDS } from '../departments/demoDepartmentIds';
import { CYTOLOGY_DEMO_PROTOCOL_IDS } from '../protocols/cytologyDemoProtocols';

const base = { active: true, version: 1, updatedBy: 'system', updatedAt: new Date().toISOString() } as const;

const gyn = {
  type: 'Cytology', subspecialty: 'Cytology', specimenCategory: 'GYN_CYTOLOGY',
  departmentId: DEMO_DEPARTMENT_IDS.gynCytology,
} as const;
const nonGyn = {
  type: 'Cytology', subspecialty: 'Cytology', specimenCategory: 'NON_GYN_CYTOLOGY',
  departmentId: DEMO_DEPARTMENT_IDS.nonGynCytology,
} as const;
const fna = {
  type: 'FNA', subspecialty: 'Cytology', specimenCategory: 'NON_GYN_CYTOLOGY',
  departmentId: DEMO_DEPARTMENT_IDS.nonGynCytology,
} as const;

/** Cytology entries added to the starter dictionary (the entries sp-cyto-pap, sp-cyto-hpv-self and sp-fna-thyroid are declared in mockSpecimenDictionaryService.ts). */
export const CYTOLOGY_DEMO_SPECIMENS: SpecimenEntry[] = [
  // ── GYN ───────────────────────────────────────────────────────────────────
  {
    id: 'sp-cyto-pap-thinprep', name: 'Pap Test, Liquid-Based (ThinPrep)',
    description: 'Liquid-based Pap test collected into a PreservCyt (ThinPrep) vial. No HPV co-test. No processing protocol: a Pap slide is not a decant.',
    procedure: 'Pap Smear', site: 'Cervix', ...gyn,
    normalizedLabel: 'Pap Test, Liquid-Based (ThinPrep)', synonyms: ['ThinPrep Pap Test', 'LBC Pap, ThinPrep'],
    ...base,
  },
  {
    id: 'sp-cyto-pap-surepath', name: 'Pap Test, Liquid-Based (SurePath)',
    description: 'Liquid-based Pap test collected into a CytoRich (SurePath) vial. No HPV co-test. No processing protocol is seeded for this vial type.',
    procedure: 'Pap Smear', site: 'Cervix', ...gyn,
    normalizedLabel: 'Pap Test, Liquid-Based (SurePath)', synonyms: ['SurePath Pap Test', 'LBC Pap, SurePath'], ...base,
  },
  {
    id: 'sp-cyto-pap-hpv-cotest', name: 'Pap Test with HPV Co-test (ThinPrep)',
    description: 'Liquid-based Pap test with an HPV co-test from the same PreservCyt vial: an HPV order is sent automatically when the case is accessioned.',
    procedure: 'Pap Smear with HPV Co-test', site: 'Cervix', ...gyn,
    normalizedLabel: 'Pap Test with HPV Co-test (ThinPrep)', synonyms: ['Pap with HPV', 'Pap and HPV Co-testing', 'Cotest'],
    protocolId: CYTOLOGY_DEMO_PROTOCOL_IDS.gynThinPrepHpv, ...base,
  },
  // ── Non-GYN body fluids, urine, respiratory ───────────────────────────────
  {
    id: 'sp-cyto-csf', name: 'Cerebrospinal Fluid Cytology',
    description: 'Cytologic examination of cerebrospinal fluid (lumbar puncture).',
    procedure: 'Fluid Cytology', site: 'Cerebrospinal Fluid', ...nonGyn, organSite: 'BODY_FLUID',
    normalizedLabel: 'Cerebrospinal Fluid Cytology', synonyms: ['CSF Cytology', 'Lumbar Puncture Cytology'],
    protocolId: CYTOLOGY_DEMO_PROTOCOL_IDS.fluidCellBlock, ...base,
  },
  {
    id: 'sp-cyto-sputum', name: 'Sputum Cytology',
    description: 'Cytologic examination of an expectorated or induced sputum specimen.',
    procedure: 'Sputum Cytology', site: 'Lung', ...nonGyn, organSite: 'LUNG_EBUS',
    normalizedLabel: 'Sputum Cytology', synonyms: ['Sputum', 'Induced Sputum Cytology'],
    protocolId: CYTOLOGY_DEMO_PROTOCOL_IDS.fluidCellBlock, ...base,
  },
  // ── FNA ───────────────────────────────────────────────────────────────────
  {
    id: 'sp-fna-breast', name: 'Breast, Fine Needle Aspiration',
    description: 'Fine needle aspiration of a breast lesion. No Non-GYN synoptic template is shipped for breast FNA.',
    procedure: 'Fine Needle Aspiration', site: 'Breast', ...fna, organSite: 'BREAST',
    normalizedLabel: 'Breast, Fine Needle Aspiration', synonyms: ['Breast FNA', 'Breast Fine Needle Aspirate'],
    protocolId: CYTOLOGY_DEMO_PROTOCOL_IDS.fnaCellBlock, ...base,
  },
  {
    id: 'sp-fna-salivary', name: 'Salivary Gland, Fine Needle Aspiration',
    description: 'Fine needle aspiration of a parotid or submandibular gland lesion.',
    procedure: 'Fine Needle Aspiration', site: 'Salivary Gland', ...fna, organSite: 'SALIVARY_GLAND',
    defaultSynopticTemplateId: 'salivary_gland_fna_cytology',
    normalizedLabel: 'Salivary Gland, Fine Needle Aspiration', synonyms: ['Salivary Gland FNA', 'Parotid FNA'],
    protocolId: CYTOLOGY_DEMO_PROTOCOL_IDS.fnaCellBlock, ...base,
  },
];

/** What the starter cytology/FNA entries (sp034..sp038) become: category, department, organ site, template, protocol. */
const STARTER_CYTOLOGY_PATCH: Record<string, Partial<SpecimenEntry>> = {
  sp034: { ...nonGyn, organSite: 'BODY_FLUID', protocolId: CYTOLOGY_DEMO_PROTOCOL_IDS.fluidCellBlock },  // Pleural Fluid Cytology
  sp035: { ...nonGyn, organSite: 'BODY_FLUID', protocolId: CYTOLOGY_DEMO_PROTOCOL_IDS.fluidCellBlock },  // Peritoneal Fluid Cytology
  sp036: { ...nonGyn, organSite: 'URINE', defaultSynopticTemplateId: 'urine_cytology', protocolId: CYTOLOGY_DEMO_PROTOCOL_IDS.fluidCellBlock }, // Urine Cytology
  sp037: { ...nonGyn, organSite: 'LUNG_EBUS', protocolId: CYTOLOGY_DEMO_PROTOCOL_IDS.fluidCellBlock },   // Bronchial Washing/Brushing Cytology
  sp038: { ...fna, organSite: 'OTHER_NGYN', defaultSynopticTemplateId: 'lymph_node_fna_cytology', protocolId: CYTOLOGY_DEMO_PROTOCOL_IDS.fnaCellBlock }, // Lymph Node FNA
};

/** Starter entry types that are surgical pathology (they take the Surgical Tissue department and series). */
const SURGICAL_ENTRY_TYPES = new Set(['Biopsy', 'Resection', 'Excision', 'Gross Only', 'Kidney']);

/**
 * Gives starter entries their department (and category) without overwriting anything already set: surgical entries
 * go to Surgical Tissue, Consult entries to Histology-Only / Consultation, and the five starter cytology/FNA
 * entries to Non-GYN Cytology. Molecular and Autopsy entries are left as they were (no demo series exists for them).
 */
export function applyDemoDepartments(entries: SpecimenEntry[]): SpecimenEntry[] {
  return entries.map(e => {
    const patch = STARTER_CYTOLOGY_PATCH[e.id];
    if (patch) return { ...e, ...patch };
    if (e.departmentId) return e;
    if (SURGICAL_ENTRY_TYPES.has(e.type)) return { ...e, departmentId: DEMO_DEPARTMENT_IDS.surgical, specimenCategory: e.specimenCategory ?? 'SURGICAL_TISSUE' };
    if (e.type === 'Consult') return { ...e, departmentId: DEMO_DEPARTMENT_IDS.consultation, specimenCategory: e.specimenCategory ?? 'CONSULT' };
    return e;
  });
}
