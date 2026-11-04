// src/services/coding/caseCodingAdapter.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 594: reads a case's older `CaseCoding` fields (one list per system)
// into CodedEntry[], and writes entries back, so the new shape and the saved
// data agree and no existing record has to change. Entries read from old data
// have source 'legacy' because the source was not recorded then.
// ─────────────────────────────────────────────────────────────────────────────
import type { CaseCoding } from '@/types/case/Case';
import type { CodedEntry } from './codedEntry';
import { sameCode } from './codedEntry';

const FIELD_BY_SYSTEM: Readonly<Record<string, Exclude<keyof CaseCoding, 'entries'>>> = {
  ICD10: 'icd10', ICD11: 'icd11', ICDO: 'icdO', SNOMED: 'snomed', LOINC: 'loinc', CPT: 'cpt',
};

export function fromCaseCoding(coding: CaseCoding | undefined): CodedEntry[] {
  if (!coding) return [];
  const out: CodedEntry[] = [];
  for (const [system, field] of Object.entries(FIELD_BY_SYSTEM)) {
    for (const code of coding[field] ?? []) {
      if (typeof code === 'string' && code.trim()) out.push({ system, code: code.trim(), source: 'legacy' });
    }
  }
  return out;
}

export interface ToCaseCodingResult {
  coding: CaseCoding;
  /** Entries in a system the older fields have no place for (for example OPCS-4 or a later ICD revision). Not lost: keep them in the new shape. */
  unrepresented: CodedEntry[];
}

export function toCaseCoding(entries: readonly CodedEntry[]): ToCaseCodingResult {
  const coding: CaseCoding = {};
  const unrepresented: CodedEntry[] = [];
  for (const e of entries) {
    const field = FIELD_BY_SYSTEM[e.system];
    if (!field) { unrepresented.push(e); continue; }
    const list = coding[field] ?? (coding[field] = []);
    if (!list.includes(e.code)) list.push(e.code);
  }
  return { coding, unrepresented };
}

/** Add an entry unless the same code is already there; an existing entry keeps its source. */
export function addEntry(entries: readonly CodedEntry[], entry: CodedEntry): CodedEntry[] {
  return entries.some(e => sameCode(e, entry)) ? [...entries] : [...entries, entry];
}
