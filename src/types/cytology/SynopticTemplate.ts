// src/types/cytology/SynopticTemplate.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 519 (PS-273): Cytology's synoptic templates are on the shared
// Synoptic Library model (EditorTemplate / EditorSection / EditorField /
// FieldOption, components/Config/Protocols/SynopticEditor.tsx). There is one
// template model, not two. These names stay as aliases so the Cytology code
// reads as before.
//
// What Cytology brought to the shared model (all optional, all kept when a
// template is edited in the Synoptic Library):
//   • FieldOption.narrativePhrase — the phrase an answer adds to the compiled
//     narrative (Layer B, compileCytologySynopticNarrative.ts). Separate from
//     the picklist label and from lexiconTermKey (the Managed Pathology
//     Lexicon term, Layer C). Absent: the answer adds nothing — a deliberate
//     authoring decision (e.g. "Not specified"), never treated as empty text.
//   • EditorField.narrativeSentenceTemplate (+ …Key) — the sentence a question
//     adds, `{value}` being the selected answers' phrases joined with ", ", or
//     a free-text answer itself. Absent: no sentence (opt-in per question).
//   • EditorField.clinicalTier — 'tier_1_diagnostic_category' (its options
//     carry lexicon terms; triggers unvalidated-term tracking and the
//     sign-out audit) or 'tier_2_descriptive'. Checked by
//     resolveSynopticTemplateClinicalTierConsistency.ts.
//   • labelKey / titleKey — translation-key migration seams, unused today;
//     resolveSynopticFieldLabel.ts decides which wins.
//   • EditorTemplate.standard — the reporting system cited (Bethesda, Milan,
//     Paris, Papanicolaou Society; "none universally adopted" for lymph node).
//
// The five JSONs in data/templates/Cytology/ were transformed to the shared
// shape (each section gained `collapsed: false`, each free-text question
// `options: []`); no content changed.
// ─────────────────────────────────────────────────────────────────────────────

export type {
  FieldOption as SynopticFieldOption,
  EditorField as SynopticField,
  EditorSection as SynopticSection,
  EditorTemplate as SynopticTemplate,
  SynopticClinicalTier,
} from '@/components/Config/Protocols/SynopticEditor';

/** The question types the Cytology templates use (a subset of the shared FieldType). */
export type SynopticFieldType = 'text' | 'longtext' | 'numeric' | 'dropdown' | 'checkboxes';
