// src/services/templates/demoChecklistRegistry.ts
// Batch 754: the Synoptic Library entries of the 19 demonstration checklists (demoChecklists.ts), moved out of
// components/Config/Protocols/protocolShared.tsx so a customer build (mode "server") leaves them out. Their content
// is genericized placeholder or PathScribe-authored wording on a question list inherited from older CAP/RCPath-derived
// files; the version suffix "-generic" marks them. Data, in the order they were listed.
import type { Protocol } from '../../components/Config/Protocols/protocolShared';

export const DEMO_CHECKLIST_REGISTRY: Protocol[] = [
  {
    id: 'breast_invasive', name: 'Breast, invasive carcinoma (resection)',
    category: 'BREAST', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 47, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'breast_dcis_resection', name: 'Breast, ductal carcinoma in situ (resection)',
    category: 'BREAST', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 23, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'lung_adeno', name: 'Lung adenocarcinoma',
    category: 'LUNG', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 39, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'prostate_needle_biopsy', name: 'Prostate needle biopsy',
    category: 'PROSTATE', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 35, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'colon_resection', name: 'Colon resection',
    category: 'COLON', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 52, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'skin_melanoma_bx', name: 'Skin melanoma biopsy',
    category: 'SKIN', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 22, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'kidney_resection', name: 'Kidney resection',
    category: 'KIDNEY', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    // Batch 466: 25 + the renal map questions ("Anatomical map (PathScribe)"); Batch 466b: + non-standard margins.
    status: 'published', fields: 36, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'kidney_biopsy', name: 'Kidney biopsy',
    category: 'KIDNEY', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 10, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'wilms_resection', name: 'Wilms tumor resection',
    category: 'KIDNEY', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 32, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'wilms_biopsy', name: 'Wilms tumor biopsy',
    category: 'KIDNEY', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 8, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'prostate_resection', name: 'Prostate resection',
    category: 'PROSTATE', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 33, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'lung_resection', name: 'Lung resection',
    category: 'LUNG', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 22, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'breast_surgical_excision', name: 'Breast surgical excision',
    category: 'BREAST', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 99, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'colorectal_resection_b', name: 'Colorectal resection (UK layout)',
    category: 'COLORECTAL', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 45, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'colorectal_local_excision', name: 'Colorectal local excision',
    category: 'COLORECTAL', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 40, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'colorectal_further_investigations', name: 'Colorectal further investigations',
    category: 'COLORECTAL', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 26, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'prostate_biopsy', name: 'Prostate biopsy (UK layout)',
    category: 'PROSTATE', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 46, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'prostate_radical_prostatectomy', name: 'Radical prostatectomy',
    category: 'PROSTATE', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 43, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
  {
    id: 'prostate_turp_enucleation', name: 'Prostate, transurethral resection or enucleation',
    category: 'PROSTATE', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: 22, snomedPct: 0, icdPct: 0,
    lastModified: '2026-07-25', owner: 'System',
  },
];
