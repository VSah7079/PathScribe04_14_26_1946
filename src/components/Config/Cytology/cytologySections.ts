// src/components/Config/Cytology/cytologySections.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 431: the Cytology tab's sections, as data, so the Configuration search
// can list every one of them (constants/configSearchIndex.ts) without loading
// the screens. CytologyTab (./index.tsx) renders its sidebar from the same list.
// ─────────────────────────────────────────────────────────────────────────────

export type CytologyConfigSection =
  | 'cytology_categories' | 'cytology_qc_settings' | 'snomed_histology_severity_mapping'
  | 'cytology_nomenclature' | 'cytology_registry' | 'cytology_routing'
  | 'cytology_screening_strategy' | 'cytology_workload_cap' | 'cytology_instrumentation'
  | 'non_gyn_cytology_categories' | 'cytology_compliance_features' | 'cytology_histology_correlation';

export const SECTIONS: { id: CytologyConfigSection; emoji: string; labelKey: string }[] = [
  { id: 'cytology_categories', emoji: '🧫', labelKey: 'cytologyCategoriesSection.title' },
  { id: 'non_gyn_cytology_categories', emoji: '🧪', labelKey: 'configSearchIndex.entries.sys-non-gyn-cytology-categories.label' },
  { id: 'cytology_nomenclature', emoji: '🌐', labelKey: 'cytologyCategoriesSection.nomenclatureLabel' },
  { id: 'cytology_screening_strategy', emoji: '🔬', labelKey: 'cytologyTab.sections.screeningStrategy' },
  { id: 'cytology_routing', emoji: '↪️', labelKey: 'cytologyTab.sections.nonGynRouting' },
  { id: 'cytology_registry', emoji: '📋', labelKey: 'cytologyTab.sections.registryReporting' },
  { id: 'cytology_qc_settings', emoji: '🎯', labelKey: 'cytologyTab.sections.qcRandomSelectionRate' },
  { id: 'cytology_compliance_features', emoji: '🗺️', labelKey: 'cytologyTab.sections.countryRules' },
  { id: 'cytology_workload_cap', emoji: '📊', labelKey: 'cytologyTab.sections.dailyWorkloadCap' },
  { id: 'cytology_instrumentation', emoji: '🖥️', labelKey: 'cytologyTab.sections.assistedInstrumentation' },
  { id: 'snomed_histology_severity_mapping', emoji: '🧬', labelKey: 'cytologyTab.sections.cytoHistologicCorrelation' },
  { id: 'cytology_histology_correlation', emoji: '⏱️', labelKey: 'cytologyTab.sections.correlationWindow' },
];

