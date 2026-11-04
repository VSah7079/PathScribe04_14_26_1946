// src/services/departments/demoDepartmentIds.ts
// Batch 716 (Pete, Oct 28 2026: "set demo data for Cytology Part 2"): the ids of the demo departments, shared by
// the department, case mask, specimen dictionary and test code so none of them repeats a string.
//
// The three older departments keep their ids and names ('Surgical Tissue', 'Fluid / Cytology', 'Histology-Only /
// Consultation'): Configuration > Protocols and the technical-facility offer find them by name, so they are not
// renamed. GYN Cytology is new.

export const DEMO_DEPARTMENT_IDS = {
  surgical: 'cat-surgical-tissue',
  nonGynCytology: 'cat-fluid-cytology',
  gynCytology: 'cat-gyn-cytology',
  consultation: 'cat-histology-only',
} as const;
