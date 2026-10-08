// src/pages/AccessionPage/autopsyOrganLabelKeys.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 468 — pulled out of AccessionPage.tsx (where it was a local,
// unexported const) so SynopticReportPage.tsx can reuse the same
// organ display-label keys for the Batch 468 consent-scope warning
// banner, rather than defining a second, divergent label map for the
// same AutopsyOrganCode vocabulary.
// ─────────────────────────────────────────────────────────────────────────────

import type { AutopsyOrganCode } from '@/types/autopsy/AutopsyOrganCode';

export const AUTOPSY_ORGAN_LABEL_KEY: Record<AutopsyOrganCode, string> = {
  brain: 'accessionPage.autopsy.organLabel.brain', pituitary: 'accessionPage.autopsy.organLabel.pituitary',
  eyes: 'accessionPage.autopsy.organLabel.eyes', spinal_cord: 'accessionPage.autopsy.organLabel.spinalCord',
  thyroid: 'accessionPage.autopsy.organLabel.thyroid', parathyroid: 'accessionPage.autopsy.organLabel.parathyroid',
  larynx_trachea: 'accessionPage.autopsy.organLabel.larynxTrachea',
  heart: 'accessionPage.autopsy.organLabel.heart', pericardium: 'accessionPage.autopsy.organLabel.pericardium',
  aorta: 'accessionPage.autopsy.organLabel.aorta', major_vessels: 'accessionPage.autopsy.organLabel.majorVessels',
  right_lung: 'accessionPage.autopsy.organLabel.rightLung', left_lung: 'accessionPage.autopsy.organLabel.leftLung',
  pleura: 'accessionPage.autopsy.organLabel.pleura',
  tracheobronchial_tree: 'accessionPage.autopsy.organLabel.tracheobronchialTree',
  esophagus: 'accessionPage.autopsy.organLabel.esophagus', stomach: 'accessionPage.autopsy.organLabel.stomach',
  duodenum: 'accessionPage.autopsy.organLabel.duodenum', small_intestine: 'accessionPage.autopsy.organLabel.smallIntestine',
  large_intestine: 'accessionPage.autopsy.organLabel.largeIntestine', appendix: 'accessionPage.autopsy.organLabel.appendix',
  liver: 'accessionPage.autopsy.organLabel.liver', gallbladder_biliary: 'accessionPage.autopsy.organLabel.gallbladderBiliary',
  pancreas: 'accessionPage.autopsy.organLabel.pancreas', peritoneum_omentum: 'accessionPage.autopsy.organLabel.peritoneumOmentum',
  right_kidney: 'accessionPage.autopsy.organLabel.rightKidney', left_kidney: 'accessionPage.autopsy.organLabel.leftKidney',
  adrenal_glands: 'accessionPage.autopsy.organLabel.adrenalGlands', bladder: 'accessionPage.autopsy.organLabel.bladder',
  ureters: 'accessionPage.autopsy.organLabel.ureters', prostate: 'accessionPage.autopsy.organLabel.prostate',
  uterus_adnexa: 'accessionPage.autopsy.organLabel.uterusAdnexa', testes: 'accessionPage.autopsy.organLabel.testes',
  spleen: 'accessionPage.autopsy.organLabel.spleen', lymph_nodes: 'accessionPage.autopsy.organLabel.lymphNodes',
  bone_marrow: 'accessionPage.autopsy.organLabel.boneMarrow', skin_subcutis: 'accessionPage.autopsy.organLabel.skinSubcutis',
  musculoskeletal_specimen: 'accessionPage.autopsy.organLabel.musculoskeletalSpecimen',
};
