// src/services/cytology/recallWording.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 640 (Pete, Oct 20, 2026: "have the user configure the wording and select the jurisdiction from a dropdown"). The recall
// wording shown under a Recall needed row can be replaced per country, kind and language by an administrator of the lab, instead of
// waiting for each programme's sign-off. The built-in wording (locale files) stays the default; an empty or absent override means
// "use the built-in text". Overrides are plain text with two optional placeholders, {{type}} and {{next}}, filled in at display time.
// The register's own recommendation codes are NOT set here: the interface engine maps them.
// ─────────────────────────────────────────────────────────────────────────────
import type { RecallJurisdiction, RecallKind } from './selfCollectedRecall';

export type RecallWordingConfig = Partial<Record<RecallJurisdiction, Partial<Record<RecallKind, Partial<Record<string, string>>>>>>;

export const MAX_RECALL_WORDING_LENGTH = 1000;
const PLACEHOLDERS = ['type', 'next'] as const;
/** Only the clinician-LBC wording has a type and a next step; the repeat-collection wording is fixed text. */
export const WORDING_PLACEHOLDERS: Record<RecallKind, readonly string[]> = { clinician_lbc: PLACEHOLDERS, repeat_collection: [] };

/** The administrator's wording for this country, kind and language, or undefined to use the built-in text. */
export function resolveRecallWording(config: RecallWordingConfig | undefined, jurisdiction: RecallJurisdiction, kind: RecallKind, language: string): string | undefined {
  const byLanguage = config?.[jurisdiction]?.[kind];
  if (!byLanguage) return undefined;
  for (const key of [language, language.split('-')[0]]) {
    const text = byLanguage[key]?.trim();
    if (text) return text;
  }
  return undefined;
}

/** Fills {{type}} and {{next}} in an override. Anything else in braces is left as typed. */
export function fillRecallWording(text: string, values: { type: string; next: string }): string {
  return text.replace(/\{\{\s*(type|next)\s*\}\}/g, (_m, k: 'type' | 'next') => values[k]);
}

export type RecallWordingProblem = 'too-long' | 'unknown-placeholder';

/** Empty is fine (it means the built-in text). */
export function recallWordingProblem(text: string, kind: RecallKind): RecallWordingProblem | null {
  if (text.length > MAX_RECALL_WORDING_LENGTH) return 'too-long';
  const allowed = WORDING_PLACEHOLDERS[kind];
  for (const m of text.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)) if (!allowed.includes(m[1])) return 'unknown-placeholder';
  return null;
}

/** The wording after a person's edit: empty text removes the override, so the built-in text applies again. */
export function withRecallWording(config: RecallWordingConfig | undefined, jurisdiction: RecallJurisdiction, kind: RecallKind, language: string, text: string): RecallWordingConfig {
  const next: RecallWordingConfig = JSON.parse(JSON.stringify(config ?? {}));
  const byLanguage = { ...(next[jurisdiction]?.[kind] ?? {}) };
  if (text.trim()) byLanguage[language] = text; else delete byLanguage[language];
  next[jurisdiction] = { ...(next[jurisdiction] ?? {}), [kind]: byLanguage };
  if (!Object.keys(byLanguage).length) delete next[jurisdiction]![kind];
  if (!Object.keys(next[jurisdiction]!).length) delete next[jurisdiction];
  return next;
}
