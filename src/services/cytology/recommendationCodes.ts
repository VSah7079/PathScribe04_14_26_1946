// src/services/cytology/recommendationCodes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 632 (Pete's developer specification, Oct 19, 2026). PathScribe's INTERNAL recommendation codes for a self-collected hrHPV
// recall in Australia (NCSR) and New Zealand (NCSP). They are PathScribe's own keys, not the registries' codes:
//   • never pass them raw to a registry API; the interface engine's translation/mapping layer converts them;
//   • the screen shows the descriptive text through the translation keys (cytologyWorklist.recall.codes.*), never the raw key.
// Status stays PLACEHOLDER_MAPPED until a programme confirms the mapping.
// ─────────────────────────────────────────────────────────────────────────────
export const RECOMMENDATION_CODES = [
  'AU_RECALL_CLINICIAN_LBC', 'AU_RECALL_REPEAT_COLLECTION', 'AU_REFER_COLPOSCOPY',
  'NZ_RECALL_CLINICIAN_LBC', 'NZ_RECALL_REPEAT_COLLECTION', 'NZ_REFER_COLPOSCOPY',
] as const;
export type RecallRecommendationCode = (typeof RECOMMENDATION_CODES)[number];

export type RecommendationRegistry = 'AU_NCSR' | 'NZ_NCSP';

interface CodeDefinition { displayText: string; targetRegistry: RecommendationRegistry; clinicalAction: string }

export const RECOMMENDATION_CODE_DEFINITIONS: Record<RecallRecommendationCode, CodeDefinition> = {
  AU_RECALL_CLINICIAN_LBC: { displayText: 'Recall for Clinician-Collected LBC', targetRegistry: 'AU_NCSR', clinicalAction: 'Triage cytology required (e.g., following HPV non-16/18 self-collection)' },
  AU_RECALL_REPEAT_COLLECTION: { displayText: 'Repeat Sample Collection Required (Unsatisfactory Result)', targetRegistry: 'AU_NCSR', clinicalAction: 'Unsatisfactory specimen (cell or sample inadequacy, or laboratory processing failure); repeat Cervical Screening Test' },
  AU_REFER_COLPOSCOPY: { displayText: 'Refer for Colposcopy Assessment', targetRegistry: 'AU_NCSR', clinicalAction: 'Direct specialist referral (e.g., HPV 16/18 positive or high-grade triage)' },
  NZ_RECALL_CLINICIAN_LBC: { displayText: 'Recall for Clinician-Collected Cytology', targetRegistry: 'NZ_NCSP', clinicalAction: 'Follow-up cytology sample required post-primary HPV screening' },
  NZ_RECALL_REPEAT_COLLECTION: { displayText: 'Repeat Sample Collection Required (Invalid / Unsuitable Sample)', targetRegistry: 'NZ_NCSP', clinicalAction: 'HPV swab invalid or unsuitable for analysis: repeat the HPV test as soon as practicable (an unsatisfactory cytology: repeat within 3 months)' },
  NZ_REFER_COLPOSCOPY: { displayText: 'Refer for Colposcopy Assessment', targetRegistry: 'NZ_NCSP', clinicalAction: 'Direct colposcopy referral' },
};

/** The shape handed to the interface engine for each code (its mapping layer turns it into the register's own code). */
export interface RecommendationEnvelope {
  recommendation_code: RecallRecommendationCode;
  display_text: string;
  authority: 'PATHSCRIBE_INTERNAL';
  status: 'PLACEHOLDER_MAPPED';
  target_registry: RecommendationRegistry;
}

export function recommendationEnvelope(code: RecallRecommendationCode): RecommendationEnvelope {
  const d = RECOMMENDATION_CODE_DEFINITIONS[code];
  return { recommendation_code: code, display_text: d.displayText, authority: 'PATHSCRIBE_INTERNAL', status: 'PLACEHOLDER_MAPPED', target_registry: d.targetRegistry };
}
