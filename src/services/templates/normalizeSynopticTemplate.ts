// src/services/templates/normalizeSynopticTemplate.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 519 (PS-273): fills the shared template model's required properties
// on content written in the older, looser Cytology shape (no `collapsed` on a
// section; no `required`, `snomed`, `icd` or `options` on a question; no
// `snomed` / `icd` on an answer). Nothing else changes: every other property,
// Cytology's narrative ones included, is kept as it is.
//
// Used for any Cytology template the Cytology screens read (bundled or from
// the Synoptic Library), so content saved before the migration, or imported
// from an older export, still works. Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { EditorTemplate, EditorSection, EditorField, FieldOption } from '@/components/Config/Protocols/SynopticEditor';

type Loose<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type LooseFieldOption = Loose<FieldOption, 'snomed' | 'icd'>;
export type LooseField = Loose<Omit<EditorField, 'options'>, 'required' | 'snomed' | 'icd'> & { options?: LooseFieldOption[] };
export type LooseSection = Loose<Omit<EditorSection, 'fields'>, 'collapsed'> & { fields: LooseField[] };
export type LooseTemplate = Omit<EditorTemplate, 'sections'> & { sections: LooseSection[] };

const option = (o: LooseFieldOption): FieldOption => ({ ...o, snomed: o.snomed ?? '', icd: o.icd ?? '' });

const field = (f: LooseField): EditorField => ({
  ...f, required: f.required ?? false, snomed: f.snomed ?? '', icd: f.icd ?? '', options: (f.options ?? []).map(option),
});

const section = (s: LooseSection): EditorSection => ({ ...s, collapsed: s.collapsed ?? false, fields: s.fields.map(field) });

/** The template in the shared model's shape. */
export function normalizeSynopticTemplate(t: LooseTemplate): EditorTemplate {
  return { ...t, sections: (t.sections ?? []).map(section) };
}
