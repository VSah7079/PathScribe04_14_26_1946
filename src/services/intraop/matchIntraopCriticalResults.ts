// src/services/intraop/matchIntraopCriticalResults.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 399. Which critical-result dictionary entries a session's frozen
// results match, as a suggestion the pathologist confirms or overrides (Pete:
// "There is going to have to be a human involved in this Decision").
//
// A specimen matches an active entry when its preliminary category is one of
// the entry's categories, or its frozen diagnosis contains one of the entry's
// terms as a whole word or phrase, unless negated (below). This is a
// safety net, not language understanding; the pathologist's tick is what
// counts.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { IntraopCriticalResultEntry } from '@/types/intraop/IntraopCriticalResult';
import type { FrozenCategory } from '@/types/intraop/IntraoperativeEntry';

export interface CriticalMatchSpecimen {
  id: string;
  frozenSectionDiagnosis?: string;
  frozenCategory?: FrozenCategory;
}

export interface CriticalResultMatch {
  entryId: string;
  name: string;
  specimenIds: string[];
}

// Negation and uncertainty (Pete's edge cases, Batch 399).
//   - The text is cut into clauses at full stops, semicolons, line breaks, commas and the
//     words "but", "though", "although", "however", "except", "whereas", so a
//     negation in one part never cancels a finding in another:
//     "negative for lymphovascular invasion, carcinoma present" flags.
//   - A negation cue up to four words before the term negates it:
//     "no definitive evidence of malignancy", "negative for carcinoma".
//   - A negation after the term, in the same clause, negates it:
//     "carcinoma is not identified", "malignancy: absent" (a colon joins a
//     finding to its value, so it doesn't end the clause).
//   - Uncertainty always keeps the flag, whatever else the clause says:
//     "carcinoma cannot be entirely ruled out", "cannot exclude malignancy",
//     "suspicious for carcinoma", "possible lymphoma" (but "not suspicious for
//     malignancy" is a negation).
// When in doubt it flags; the pathologist unticks.

const CLAUSE_BREAK = /[.;\n,]|\b(?:but|though|although|however|except|whereas)\b/i;
const NEGATION_BEFORE = /\b(?:no|not|negative|without|free|absent|absence|nor)\b(?:\s+\S+){0,4}\s*$/i;
const NEGATION_AFTER = /^\s*(?:\S+\s+){0,3}?(?:is\s+|are\s+|was\s+|were\s+)?(?:not\s+(?:seen|identified|present|detected|found|demonstrated)|absent|negative)\b/i;
const UNCERTAINTY = /\b(?:cannot|can\s+not|can't|could\s+not)\s+(?:be\s+)?(?:(?:entirely|completely|fully|definitely)\s+)?(?:rule[ds]?\s+out|ruled\s+out|exclude[ds]?|excluded)\b|\bnot\s+(?:be\s+)?(?:excluded|ruled\s+out)\b|(?<!\bnot\s)(?<!\bno\s)\b(?:suspicious|possible|probable|equivocal|indeterminate)\b/i;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The clause of `text` around the match at [start, end): from the last clause break before it to the next one after it. */
function clauseAround(text: string, start: number, end: number): { before: string; after: string; whole: string } {
  const head = text.slice(0, start);
  let from = 0;
  const breaks = new RegExp(CLAUSE_BREAK.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = breaks.exec(head)) !== null) from = m.index + m[0].length;
  const tail = text.slice(end);
  const next = tail.search(CLAUSE_BREAK);
  const to = next === -1 ? text.length : end + next;
  return { before: text.slice(from, start), after: text.slice(end, to), whole: text.slice(from, to) };
}

/** Whether `text` mentions `term` (whole words, any case) at least once as present or uncertain, not negated. */
export function mentionsUnnegated(text: string, term: string): boolean {
  const t = term.trim();
  if (!text || !t) return false;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escape(t)}(?![\\p{L}\\p{N}])`, 'giu');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const { before, after, whole } = clauseAround(text, m.index, m.index + m[0].length);
    if (UNCERTAINTY.test(whole)) return true;
    if (NEGATION_BEFORE.test(before) || NEGATION_AFTER.test(after)) continue;
    return true;
  }
  return false;
}

export function matchIntraopCriticalResults(
  specimens: readonly CriticalMatchSpecimen[],
  entries: readonly IntraopCriticalResultEntry[],
): CriticalResultMatch[] {
  const out: CriticalResultMatch[] = [];
  for (const e of entries) {
    if (e.status !== 'Active') continue;
    const hits = specimens.filter(sp =>
      (!!sp.frozenCategory && e.frozenCategories.includes(sp.frozenCategory))
      || e.matchTerms.some(term => mentionsUnnegated(sp.frozenSectionDiagnosis ?? '', term)));
    if (hits.length) out.push({ entryId: e.id, name: e.name, specimenIds: hits.map(h => h.id) });
  }
  return out;
}

/** The dictionary editor's terms box: one term per line or comma, trimmed, no blanks or repeats (any case). Pure. */
export function parseMatchTerms(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\n,]/)) {
    const term = raw.trim();
    if (term && !out.some(o => o.toLowerCase() === term.toLowerCase())) out.push(term);
  }
  return out;
}
