// src/services/coding/codedEntry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 594: one shape for any diagnosis or procedure code, in any coding
// system and release (ICD-10-CM, ICD-10-CA, ICD-11, ICD-O-3, SNOMED CT, ...).
// A new system or revision is a new `system` value in data, not a new field on
// a case. The case's older fields (`CaseCoding.icd10`, `.icd11`, ...) are read
// into and written back from this shape by caseCodingAdapter.ts, so nothing
// already saved changes. Pure types; no browser storage, no UI.
// ─────────────────────────────────────────────────────────────────────────────

/** Ids match the system pills in the Add Code window (pages/Synoptic/Codes/AddCodeModal.tsx). */
export const KNOWN_CODE_SYSTEMS = ['SNOMED', 'ICD10', 'ICD11', 'LOINC', 'ICDO', 'CPT', 'OPCS4'] as const;
export type KnownCodeSystem = typeof KNOWN_CODE_SYSTEMS[number];
/** Any system id. Known ids are listed above; a future one (a later revision) is accepted as data. */
export type CodeSystemId = string;

/**
 * Where a code came from:
 * - typed: the pathologist searched for it and picked it
 * - map: suggested from an official map between systems, then confirmed
 * - ai: suggested by the AI, then confirmed
 * - rule: suggested by the rule-based fallback (AI not allowed), then confirmed
 * - legacy: saved before sources were recorded; the source is not known
 */
export type CodeSource = 'typed' | 'map' | 'ai' | 'rule' | 'legacy';

export interface CodedEntryAiDetail {
  /** The model that made the suggestion, as the AI settings name it. */
  model: string;
  /** 0 to 1. */
  confidence: number;
}

export interface CodedEntry {
  system: CodeSystemId;
  /** The edition or release the code belongs to (for example "ICD-10-CM 2026"); unknown on legacy entries. */
  release?: string;
  /** The code exactly as entered. An ICD-11 cluster such as "2C25.Y&XH0P4" is one value, never split. */
  code: string;
  display?: string;
  source: CodeSource;
  /** Present when source is 'ai'. */
  ai?: CodedEntryAiDetail;
  /** Present when source is 'map': the code in the other system this was mapped from. */
  mappedFrom?: { system: CodeSystemId; code: string };
  /** The pathologist changed a suggestion before confirming it. */
  changedFromSuggestion?: boolean;
}

/** The same code in the same system and release (cluster text compared as written, trimmed). */
export function sameCode(a: CodedEntry, b: CodedEntry): boolean {
  return a.system === b.system && a.code.trim() === b.code.trim() && (a.release ?? '') === (b.release ?? '');
}
