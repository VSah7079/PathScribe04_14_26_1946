// src/services/templates/narrativeAuthoring.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 519 (PS-273): editing a cytology protocol's narrative settings in the
// Synoptic Editor — each answer's narrative phrase, each question's narrative
// sentence and clinical tier, and the protocol's reporting standard. These
// drive the Cytology narrative (services/cytology/compileCytologySynopticNarrative.ts)
// and its translation checks; surgical protocols don't use them, so the
// editor shows them for a Non-GYN cytology protocol, or for any protocol that
// already has a narrative sentence. Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { SynopticClinicalTier } from '@/components/Config/Protocols/SynopticEditor';

export const SYNOPTIC_CLINICAL_TIERS: readonly SynopticClinicalTier[] = ['tier_1_diagnostic_category', 'tier_2_descriptive'];

/** Whether the editor shows the narrative settings for this protocol. */
export function authorsNarrative(template: { category: string; sections: readonly { fields: readonly { narrativeSentenceTemplate?: string }[] }[] }): boolean {
  return template.category.startsWith('CYTOLOGY_NONGYN')
    || template.sections.some(s => s.fields.some(f => f.narrativeSentenceTemplate !== undefined));
}

/** A narrative text as stored: blank means none (the property is removed, so the answer or question adds nothing). */
export const narrativeText = (v: string): string | undefined => (v.trim() === '' ? undefined : v);

/** A question's narrative sentence that names no `{value}`: the answer would never appear in the narrative. */
export function narrativeSentenceMissesValue(field: { narrativeSentenceTemplate?: string }): boolean {
  const s = field.narrativeSentenceTemplate;
  return !!s && !s.includes('{value}');
}

/** A question's narrative sentence as the lab wrote it. The sentence's translation key (PathScribe's wording in
 *  each language) is dropped with it: the key's text would otherwise win over the lab's wording, so an edit
 *  would never show. The lab's sentence is then used in every language (the clinical phrases inside it still
 *  go through the Managed Pathology Lexicon). */
export const withNarrativeSentence = (text: string): { narrativeSentenceTemplate?: string; narrativeSentenceTemplateKey?: undefined } =>
  ({ narrativeSentenceTemplate: narrativeText(text), narrativeSentenceTemplateKey: undefined });
