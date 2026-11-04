// src/services/cases/demoProstateBiopsyChecklist.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 753 (Pete, Oct 31, 2026; Video 9 steps 1 to 4): the prostate needle biopsy checklist answers of demo case
// S26-4404, moved out of mockCaseService.ts and made to agree with the core results that draw its map: six cores
// (A to F), cores A to C on the right with acinar adenocarcinoma, Gleason 3+4=7 (Grade Group 2), the most involved
// core 70% (core B, about 11 mm), D to F benign. Before this the summary said 12 cores, 4 positive and a highest
// score of 3+3, which disagreed with the map. The checklist wording is PathScribe's own (data/templates/generic/
// prostate_needle_biopsy.json). Fictional case.
// ─────────────────────────────────────────────────────────────────────────────

const coreRow = (part: number, site: string, cancer: boolean, length: string, percent?: string): Record<string, string> => {
  const key = (column: string) => `psmap_core_results__S26-4404-SP-${part}__${column}`;
  return cancer
    ? { [key('site')]: site, [key('cancer')]: 'psmap_ca_yes', [key('gleason_primary')]: 'psmap_gp_3', [key('gleason_secondary')]: 'psmap_gs_4',
        [key('grade_group')]: 'psmap_gg_2', [key('percent')]: percent ?? '', [key('length')]: length }
    : { [key('site')]: site, [key('cancer')]: 'psmap_ca_no', [key('length')]: length };
};

/** The answers of S26-4404's checklist (the summary questions, then the Core results grid that draws the map). */
export const S26_4404_BIOPSY_ANSWERS: Record<string, string | string[] | number> = {
  case_summary_note: 'Prostate, six needle biopsies: acinar adenocarcinoma, Grade Group 2, in three right-sided cores.',
  procedure: ['procedure_opt_1'],
  positive_specimen_locations: ['positive_specimen_locations_opt_1'],
  histologic_glandular: 'histologic_glandular_opt_1',
  highest_gleason_score: 'highest_gleason_score_opt_3',
  sites_with_highest_gleason: ['sites_with_highest_gleason_opt_1'],
  systematic_overall_grade: 'systematic_overall_grade_opt_2',
  intraductal_carcinoma: 'intraductal_carcinoma_opt_1',
  cribriform_glands: 'cribriform_glands_opt_1',
  treatment_effect: ['treatment_effect_opt_1'],
  total_number_of_cores: 6,
  number_of_positive_cores: 3,
  tumor_measurement_technique: ['tumor_measurement_technique_opt_1'],
  greatest_percentage_core_involvement: 'greatest_percentage_core_involvement_opt_8',
  gpc_sites: ['gpc_sites_opt_1'],
  greatest_length_core_involvement: 11,
  greatest_length_core_sites: ['greatest_length_core_sites_opt_1'],
  periprostatic_fat_invasion: 'periprostatic_fat_invasion_opt_1',
  seminal_vesicle_invasion: 'seminal_vesicle_invasion_opt_4',
  perineural_invasion: 'perineural_invasion_opt_2',
  lymphatic_vascular_invasion: 'lymphatic_vascular_invasion_opt_1',
  // Batch 461: the Core results grid (one row per part) that draws the biopsy map.
  ...coreRow(1, 'psmap_site_r_apex_lat', true, '14', '40'),
  ...coreRow(2, 'psmap_site_r_mid_lat', true, '16', '70'),
  ...coreRow(3, 'psmap_site_r_base_lat', true, '18', '30'),
  ...coreRow(4, 'psmap_site_l_apex_lat', false, '13'),
  ...coreRow(5, 'psmap_site_l_mid_lat', false, '15'),
  ...coreRow(6, 'psmap_site_l_base_lat', false, '17'),
};

const suggested = (value: unknown, source: string) => ({ value, confidence: 90, source, verification: 'unverified' as const });

/** The demo's AI suggestions for the same case (the same values; confidence is never shown on a clinical screen). */
export const S26_4404_BIOPSY_AI_SUGGESTIONS = {
  procedure: suggested(['procedure_opt_1'], 'Gross description'),
  positive_specimen_locations: suggested(['positive_specimen_locations_opt_1'], 'Microscopic description'),
  highest_gleason_score: suggested('highest_gleason_score_opt_3', 'Microscopic description'),
  sites_with_highest_gleason: suggested(['sites_with_highest_gleason_opt_1'], 'Microscopic description'),
  total_number_of_cores: suggested(6, 'Gross description'),
  number_of_positive_cores: suggested(3, 'Microscopic description'),
  greatest_percentage_core_involvement: suggested('greatest_percentage_core_involvement_opt_8', 'Microscopic description'),
  perineural_invasion: suggested('perineural_invasion_opt_2', 'Microscopic description'),
  lymphatic_vascular_invasion: suggested('lymphatic_vascular_invasion_opt_1', 'No lymphovascular invasion mentioned in the report'),
  treatment_effect: suggested(['treatment_effect_opt_1'], 'No treatment before surgery mentioned'),
};

/** The report as first signed, before the demo amendment (amend-seed-cp03): one core fewer with carcinoma and a
 *  highest score of 3+3=6. Everything else as now, so the amendment shows only what was corrected. */
export const S26_4404_BIOPSY_ANSWERS_BEFORE_AMENDMENT: Record<string, string | string[] | number> = {
  ...S26_4404_BIOPSY_ANSWERS,
  highest_gleason_score: 'highest_gleason_score_opt_2',
  systematic_overall_grade: 'systematic_overall_grade_opt_1',
  number_of_positive_cores: 2,
  greatest_percentage_core_involvement: 'greatest_percentage_core_involvement_opt_7',
};
