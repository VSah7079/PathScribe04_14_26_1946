// src/components/Config/NarrativeTemplates/narrativeTemplateRegistry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Maps report template IDs (from TemplateRoutingService) to their
// narrative section configurations.
//
// Each entry defines:
//   - Which sections appear in the AI-generated narrative
//   - The order and enabled state of each section
//   - The AI instruction for that section (what to generate)
//   - Which synoptic fields feed into that section
//
// When the OrchestratorEngine runs, it uses context.narrativeTemplate.sections
// (populated by buildContext() via this registry) to determine what to generate.
//
// Admin UI: System → Template Routing (future) will allow editing these
// without a code deploy. For now they are code-defined and version-controlled.
// ─────────────────────────────────────────────────────────────────────────────

export interface NarrativeSectionDef {
  id:            string;
  title:         string;
  order:         number;
  enabled:       boolean;
  aiInstruction: string;
  fields:        { name: string; cardinality: string }[];
}

export interface NarrativeTemplateConfig {
  templateId:          string;
  name:                string;
  orchestratorEnabled: boolean;
  sections:            NarrativeSectionDef[];
}

// ── Section library — reusable across templates ────────────────────────────

const SECTIONS = {

  adminHeader: (instruction = 'Summarise clinical context from the provided fields. Do not restate demographics verbatim.'): NarrativeSectionDef => ({
    id: 'admin_header', title: 'Administrative & Clinical Header', order: 1, enabled: true,
    aiInstruction: instruction,
    fields: [
      { name: 'Patient Demographics',   cardinality: 'Many-to-One' },
      { name: 'Accession Number',        cardinality: 'One-to-One' },
      { name: 'Ordering Physician',      cardinality: 'Many-to-One' },
      { name: 'Clinical History',        cardinality: 'One-to-One' },
      { name: 'Pre-Operative Diagnosis', cardinality: 'One-to-One' },
    ],
  }),

  specimenGross: (instruction = 'Summarise gross findings from structured fields. Do not invent measurements.'): NarrativeSectionDef => ({
    id: 'gross_description', title: 'Specimen & Gross Description', order: 2, enabled: true,
    aiInstruction: instruction,
    fields: [
      { name: 'Specimen Label/Source', cardinality: 'Many-to-One' },
      { name: 'Procedure',             cardinality: 'Many-to-One' },
      { name: 'Gross Measurements',    cardinality: 'Many-to-One' },
      { name: 'Tissue Integrity',      cardinality: 'Many-to-One' },
      { name: 'Block Index',           cardinality: 'Many-to-One' },
    ],
  }),

  synopticSummary: (instruction = 'Summarise synoptic data in narrative form. Do not alter or reinterpret discrete values. Do not infer staging or diagnosis.'): NarrativeSectionDef => ({
    id: 'synoptic_summary', title: 'Synoptic Data Summary', order: 3, enabled: true,
    aiInstruction: instruction,
    fields: [
      { name: 'Histologic Type',          cardinality: 'One-to-One' },
      { name: 'Histologic Grade',         cardinality: 'One-to-One' },
      { name: 'Tumor Size',               cardinality: 'One-to-One' },
      { name: 'Margin Status',            cardinality: 'Many-to-One' },
      { name: 'Lymphovascular Invasion',  cardinality: 'One-to-One' },
      { name: 'pTNM Stage',               cardinality: 'One-to-One' },
      { name: 'Lymph Node Status',        cardinality: 'Many-to-One' },
    ],
  }),

  microscopic: (instruction = 'Generate a concise microscopic description from the structured synoptic data. Use standard pathology terminology.'): NarrativeSectionDef => ({
    id: 'microscopic_description', title: 'Microscopic Description', order: 4, enabled: true,
    aiInstruction: instruction,
    fields: [
      { name: 'Histologic Type',         cardinality: 'One-to-One' },
      { name: 'Histologic Grade',        cardinality: 'One-to-One' },
      { name: 'Lymphovascular Invasion', cardinality: 'One-to-One' },
      { name: 'Perineural Invasion',     cardinality: 'One-to-One' },
    ],
  }),

  ancillaryDiagnosis: (instruction = 'Draft a clear, concise narrative incorporating IHC and molecular results. Do not invent findings. Final Diagnosis must reflect structured data or pathologist input.'): NarrativeSectionDef => ({
    id: 'ancillary_and_diagnosis', title: 'Ancillary Testing & Final Diagnosis', order: 5, enabled: true,
    aiInstruction: instruction,
    fields: [
      { name: 'Immunohistochemistry (IHC)', cardinality: 'Many-to-One' },
      { name: 'Molecular/Cytogenetics',     cardinality: 'Many-to-One' },
      { name: 'Final Diagnosis',            cardinality: 'One-to-One' },
      { name: 'Comment/Note',              cardinality: 'One-to-One' },
    ],
  }),

  biomarkers: (instruction = 'Summarise biomarker results. Include ER, PR, HER2, Ki-67 if available. State results factually without interpretation.'): NarrativeSectionDef => ({
    id: 'biomarkers', title: 'Biomarker Results', order: 4, enabled: true,
    aiInstruction: instruction,
    fields: [
      { name: 'ER Status',  cardinality: 'One-to-One' },
      { name: 'PR Status',  cardinality: 'One-to-One' },
      { name: 'HER2 Status', cardinality: 'One-to-One' },
      { name: 'Ki-67 Index', cardinality: 'One-to-One' },
    ],
  }),

  prostateBiomarkers: (instruction = 'Report PSA, Gleason scoring, and any molecular markers. State factually without clinical interpretation.'): NarrativeSectionDef => ({
    id: 'biomarkers', title: 'Biomarker & Molecular Results', order: 4, enabled: true,
    aiInstruction: instruction,
    fields: [
      { name: 'PSA Level',       cardinality: 'One-to-One' },
      { name: 'Gleason Score',   cardinality: 'One-to-One' },
      { name: 'Grade Group',     cardinality: 'One-to-One' },
      { name: 'Molecular Tests', cardinality: 'Many-to-One' },
    ],
  }),

  signOff: (instruction = 'Generate a standard pathologist attestation statement. Include case accession, date, and indicate the report is subject to pathologist review.'): NarrativeSectionDef => ({
    id: 'sign_off', title: 'Sign-off & Attestation', order: 99, enabled: true,
    aiInstruction: instruction,
    fields: [
      { name: 'Pathologist Name',        cardinality: 'One-to-One' },
      { name: 'Credentials',             cardinality: 'One-to-One' },
      { name: 'Attestation Statement',   cardinality: 'One-to-One' },
    ],
  }),
};

// ── Template registry ──────────────────────────────────────────────────────

const REGISTRY: Record<string, NarrativeTemplateConfig> = {

  // ── Gold Standard — General Surgical Pathology ─────────────────────────
  'tmpl-gold-standard': {
    templateId:          'tmpl-gold-standard',
    name:                'Gold Standard — General Surgical Pathology',
    orchestratorEnabled: true,
    sections: [
      SECTIONS.adminHeader(),
      SECTIONS.specimenGross(),
      SECTIONS.synopticSummary(),
      SECTIONS.microscopic(),
      SECTIONS.ancillaryDiagnosis(),
      SECTIONS.signOff(),
    ],
  },

  // ── Breast Pathology ───────────────────────────────────────────────────
  'tmpl-breast': {
    templateId:          'tmpl-breast',
    name:                'Breast Pathology Report',
    orchestratorEnabled: true,
    sections: [
      SECTIONS.adminHeader('Summarise clinical context for breast pathology. Include indication (screening vs diagnostic), prior history if stated.'),
      SECTIONS.specimenGross('Describe the breast specimen including orientation, dimensions, skin ellipse if present, and tumour location. Note distances from margins.'),
      SECTIONS.synopticSummary('Summarise breast synoptic data including histologic type, grade, tumour size, margin status, lymphovascular invasion, and nodal status. Do not interpret staging.'),
      SECTIONS.biomarkers('Report ER, PR, HER2, and Ki-67 results. Include test methodology (IHC, ISH) where available. State scores and percentages factually.'),
      SECTIONS.microscopic('Describe breast tumour histology including architectural pattern, nuclear grade, mitotic rate, and associated DCIS if present.'),
      SECTIONS.ancillaryDiagnosis('State the final breast diagnosis incorporating all synoptic and biomarker data. Draft a concise final diagnosis line per CAP/WHO conventions.'),
      SECTIONS.signOff(),
    ],
  },

  // ── Gastrointestinal ───────────────────────────────────────────────────
  'tmpl-gi': {
    templateId:          'tmpl-gi',
    name:                'Gastrointestinal Pathology Report',
    orchestratorEnabled: true,
    sections: [
      SECTIONS.adminHeader('Summarise GI clinical context including primary site, prior endoscopy findings, and clinical indication.'),
      SECTIONS.specimenGross('Describe GI specimen including segment length, wall thickness, mucosal appearance, and tumour dimensions. Note relationship to resection margins and adjacent structures.'),
      SECTIONS.synopticSummary('Summarise GI synoptic data per CAP protocol. Include tumour type, grade, depth of invasion (pT), nodal status (pN), and margin status. Do not infer staging beyond what is recorded.'),
      SECTIONS.microscopic('Describe GI tumour histology including growth pattern, differentiation, and notable features such as mucinous component, tumour deposits, or perineural invasion.'),
      SECTIONS.ancillaryDiagnosis('State final GI diagnosis. Include any MSI/MMR testing results if available. Draft diagnosis per CAP/AJCC conventions.'),
      SECTIONS.signOff(),
    ],
  },

  // ── Thoracic / Pulmonary ───────────────────────────────────────────────
  'tmpl-thoracic': {
    templateId:          'tmpl-thoracic',
    name:                'Thoracic / Pulmonary Pathology Report',
    orchestratorEnabled: true,
    sections: [
      SECTIONS.adminHeader('Summarise thoracic clinical context including smoking history if stated, prior imaging findings, and surgical approach.'),
      SECTIONS.specimenGross('Describe pulmonary specimen including lobe(s), weight, pleural appearance, and tumour characteristics. Note bronchial and vascular margin status.'),
      SECTIONS.synopticSummary('Summarise thoracic synoptic data including histologic type (per WHO classification), grade, visceral pleural invasion, and nodal status.'),
      SECTIONS.microscopic('Describe lung tumour histology including predominant pattern (per IASLC/ATS/ERS classification for adenocarcinoma), stromal features, and any necrosis.'),
      SECTIONS.ancillaryDiagnosis('State final lung diagnosis. Include molecular/IHC results (PDL1, EGFR, ALK, ROS1, KRAS) where available per institutional reflex testing.'),
      SECTIONS.signOff(),
    ],
  },

  // ── Urological ─────────────────────────────────────────────────────────
  'tmpl-uro': {
    templateId:          'tmpl-uro',
    name:                'Urological Pathology Report',
    orchestratorEnabled: true,
    sections: [
      SECTIONS.adminHeader('Summarise urological clinical context including PSA level, clinical stage, and indication for procedure.'),
      SECTIONS.specimenGross('Describe urological specimen including weight, dimensions, and gross tumour characteristics. For prostatectomy, describe zonal location and extraprostatic extension.'),
      SECTIONS.synopticSummary('Summarise urological synoptic data per CAP protocol. Include histologic type, Gleason/grade group for prostate, pT/pN stage, and margin status.'),
      SECTIONS.prostateBiomarkers(),
      SECTIONS.microscopic('Describe urological tumour histology including pattern, grade, and perineural/lymphovascular invasion.'),
      SECTIONS.ancillaryDiagnosis('State final urological diagnosis per CAP/WHO/ISUP conventions.'),
      SECTIONS.signOff(),
    ],
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Look up the narrative template config for a given report template ID.
 * Falls back to the gold standard if no specific config is registered.
 */
export function getNarrativeConfigForTemplate(reportTemplateId: string): NarrativeTemplateConfig {
  return REGISTRY[reportTemplateId] ?? REGISTRY['tmpl-gold-standard'];
}

/**
 * Register a custom narrative template config at runtime.
 * Used by future admin UI to allow config-driven narrative templates.
 */
export function registerNarrativeConfig(config: NarrativeTemplateConfig): void {
  REGISTRY[config.templateId] = config;
}

export { REGISTRY as narrativeTemplateRegistry };

// ── Default export (backwards compat with existing narrativeTemplateConfig import) ──
export const narrativeTemplateConfig = REGISTRY['tmpl-gold-standard'];
