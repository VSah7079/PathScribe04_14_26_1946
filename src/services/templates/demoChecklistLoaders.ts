// src/services/templates/demoChecklistLoaders.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 754: the loaders of the 19 demonstration checklists (demoChecklists.ts), moved out of templateService.ts so a
// customer build (mode "server") leaves their files out: templateService only spreads these in when
// DEMO_CHECKLISTS_IN_BUILD, and Vite then drops the unused imports and their JSON chunks.
// ─────────────────────────────────────────────────────────────────────────────

type SeedLoader = () => Promise<{ default: unknown }>;

export const DEMO_CHECKLIST_LOADERS: Record<string, SeedLoader> = {
  breast_invasive:            () => import('../../data/templates/generic/breast_invasive.json'),
  breast_dcis_resection:      () => import('../../data/templates/generic/breast_dcis_resection.json'),
  lung_adeno:                 () => import('../../data/templates/generic/lung_adeno.json'),
  prostate_needle_biopsy:     () => import('../../data/templates/generic/prostate_needle_biopsy.json'),
  colon_resection:            () => import('../../data/templates/generic/colon_resection.json'),
  skin_melanoma_bx:           () => import('../../data/templates/generic/skin_melanoma_bx.json'),
  // Alias: the internal protocol id for the same generic melanoma template.
  skin_invasive_melanoma_biopsy: () => import('../../data/templates/generic/skin_melanoma_bx.json'),
  prostate_resection:         () => import('../../data/templates/generic/prostate_resection.json'),
  lung_resection:             () => import('../../data/templates/generic/lung_resection.json'),
  kidney_resection:           () => import('../../data/templates/generic/kidney_resection.json'),
  kidney_biopsy:              () => import('../../data/templates/generic/kidney_biopsy.json'),
  wilms_resection:            () => import('../../data/templates/generic/wilms_resection.json'),
  wilms_biopsy:               () => import('../../data/templates/generic/wilms_biopsy.json'),
  // UK generic templates
  breast_surgical_excision:          () => import('../../data/templates/generic/breast_surgical_excision.json'),
  colorectal_resection_b:            () => import('../../data/templates/generic/colorectal_resection_b.json'),
  colorectal_local_excision:         () => import('../../data/templates/generic/colorectal_local_excision.json'),
  colorectal_further_investigations: () => import('../../data/templates/generic/colorectal_further_investigations.json'),
  prostate_biopsy:                   () => import('../../data/templates/generic/prostate_biopsy.json'),
  prostate_radical_prostatectomy:    () => import('../../data/templates/generic/prostate_radical_prostatectomy.json'),
  prostate_turp_enucleation:         () => import('../../data/templates/generic/prostate_turp_enucleation.json'),
};
