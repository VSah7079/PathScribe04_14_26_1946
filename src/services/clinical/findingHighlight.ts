// src/services/clinical/findingHighlight.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 452 (PS-323, the follow-up to PS-133): where a detected critical
// finding sits in the narrative, so the editor can highlight it before
// sign-out. Pure: the editor extension (components/Editor/
// findingHighlightExtension.ts) passes each paragraph's plain text here and
// draws the spans as decorations. Nothing is ever written into the saved
// HTML.
//
// Matching, in order, per finding:
//   1. the model's sourceQuote, exactly as written → the term inside it (or
//      the whole quote if the term isn't in it);
//   2. the quote ignoring case and spacing (the pathologist re-spaced it, or
//      the model changed capitals);
//   3. the term itself, whole words, ignoring case, skipping mentions the
//      narrative negates ("no evidence of carcinoma");
//   4. otherwise nothing: no highlight is better than one in the wrong place.
// As the pathologist edits, the editor re-runs this on every change, so a
// highlight follows its text and disappears once the words are gone.
// ─────────────────────────────────────────────────────────────────────────────

import type { AbnormalSeverity } from '../abnormalDetection/IAbnormalTriggerRuleService';
import { termOccurrences } from './negatedFindingCheck';

export interface FindingHighlightTarget {
  term: string;
  sourceQuote: string;
  severity: AbnormalSeverity;
}

export type FindingMatchKind = 'quote' | 'quoteLoose' | 'term';

export interface FindingSpan<T extends FindingHighlightTarget = FindingHighlightTarget> {
  from: number;
  to: number;
  finding: T;
  match: FindingMatchKind;
}

export type NarrativeField = 'gross' | 'microscopic' | 'ancillary';

/** Which narrative field a Report Draft section feeds. Same section ids
 *  useOrchestratorDraft's syncOrchSectionsToDiagnostic copies into
 *  caseData.diagnostic, which is the text detectCriticalFindings reads. */
export function narrativeFieldForSection(sectionId: string, sourcePartId?: string): NarrativeField | null {
  // PS-323: the section id is a fresh UUID each time a template is resolved, so the
  // stable part id it came from (std_body_gross and so on) is checked first.
  switch (sourcePartId) {
    case 'std_body_gross': return 'gross';
    case 'std_body_microscopic': return 'microscopic';
    case 'std_body_ancillary': return 'ancillary';
    default: break;
  }
  switch (sectionId) {
    case 'gross_description': case 'gross': return 'gross';
    case 'microscopic': case 'microscopic_description': return 'microscopic';
    case 'ancillary_studies': case 'ancillary': return 'ancillary';
    default: return null;
  }
}

/** The text of every Report Draft section that feeds one narrative field, joined. */
export function orchestratorNarrativeText(
  sections: readonly { id: string; text?: string; sourcePartId?: string }[],
  field: NarrativeField,
): string {
  return sections
    .filter(s => narrativeFieldForSection(s.id, s.sourcePartId) === field)
    .map(s => s.text ?? '')
    .filter(t => t.trim() !== '')
    .join('');
}

/** Which narrative field a row of the read-only Full Patient Report panel
 *  (services/reports/fullPatientReportRows.ts) shows. */
export function narrativeFieldForReportRow(rowId: string): NarrativeField | null {
  switch (rowId) {
    case 'grossDescription': return 'gross';
    case 'microscopicFindings': return 'microscopic';
    case 'ancillaryStudies': return 'ancillary';
    default: return null;
  }
}

/** A text cut into plain and highlighted pieces, for read-only displays. */
export function splitTextByFindings<T extends FindingHighlightTarget>(text: string, findings: readonly T[]): { text: string; finding?: T }[] {
  const out: { text: string; finding?: T }[] = [];
  let at = 0;
  for (const s of findFindingSpans(text, findings)) {
    if (s.from > at) out.push({ text: text.slice(at, s.from) });
    out.push({ text: text.slice(s.from, s.to), finding: s.finding });
    at = s.to;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

/** The findings that belong to one narrative field. */
export function findingsForField<T extends FindingHighlightTarget & { sourceField: string }>(findings: readonly T[] | undefined, field: NarrativeField | null): T[] {
  if (!field || !findings?.length) return [];
  return findings.filter(f => f.sourceField === field);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A phrase as a regex that ignores case and how much whitespace sits between words. */
const loosePattern = (phrase: string) => {
  const parts = phrase.trim().split(/\s+/).filter(Boolean).map(escape);
  return parts.length ? new RegExp(parts.join('\\s+'), 'gi') : null;
};
const wordChar = /[\p{L}\p{N}]/u;
const isWholeWord = (text: string, from: number, to: number) =>
  !(from > 0 && wordChar.test(text[from - 1])) && !(to < text.length && wordChar.test(text[to]));

/** Narrow a matched quote to the term inside it, if the term is there. */
function termWithin(text: string, qFrom: number, qTo: number, term: string): [number, number] {
  const re = loosePattern(term);
  if (!re) return [qFrom, qTo];
  const slice = text.slice(qFrom, qTo);
  let m: RegExpExecArray | null;
  while ((m = re.exec(slice))) {
    if (isWholeWord(slice, m.index, m.index + m[0].length)) return [qFrom + m.index, qFrom + m.index + m[0].length];
    if (re.lastIndex === m.index) re.lastIndex++;
  }
  return [qFrom, qTo];
}

/** The sentence around an offset (for the negation check on a term match). */
function sentenceAround(text: string, at: number): { start: number; sentence: string } {
  let start = at;
  while (start > 0 && !/[.;!?\n]/.test(text[start - 1])) start--;
  let end = at;
  while (end < text.length && !/[.;!?\n]/.test(text[end])) end++;
  return { start, sentence: text.slice(start, Math.min(text.length, end + 1)) };
}

function spansFor<T extends FindingHighlightTarget>(text: string, f: T): FindingSpan<T>[] {
  const quote = (f.sourceQuote ?? '').trim();
  if (quote) {
    const exact = text.indexOf(quote);
    if (exact >= 0) {
      const [from, to] = termWithin(text, exact, exact + quote.length, f.term);
      return [{ from, to, finding: f, match: 'quote' }];
    }
    const re = loosePattern(quote);
    const m = re?.exec(text);
    if (m) {
      const [from, to] = termWithin(text, m.index, m.index + m[0].length, f.term);
      return [{ from, to, finding: f, match: 'quoteLoose' }];
    }
  }
  const re = loosePattern(f.term ?? '');
  if (!re) return [];
  const out: FindingSpan<T>[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const from = m.index, to = m.index + m[0].length;
    if (re.lastIndex === m.index) re.lastIndex++;
    if (!isWholeWord(text, from, to)) continue;
    // Skip a mention the narrative negates. Count which mention this is
    // within its sentence and ask the negation check about that one.
    const { start, sentence } = sentenceAround(text, from);
    const before = text.slice(start, from);
    const nth = (before.match(loosePattern(f.term)!) ?? []).length;
    const occ = termOccurrences(sentence, f.term)[nth];
    if (occ?.negated) continue;
    out.push({ from, to, finding: f, match: 'term' });
  }
  return out;
}

const SEVERITY_RANK: Record<AbnormalSeverity, number> = { Malignant: 3, Critical: 2, Abnormal: 1 };

/** Every highlight span in one paragraph of plain text, sorted, with no
 *  overlaps (where two findings overlap the more severe one wins). */
export function findFindingSpans<T extends FindingHighlightTarget>(text: string, findings: readonly T[]): FindingSpan<T>[] {
  if (!text || !findings.length) return [];
  const all = findings.flatMap(f => spansFor(text, f));
  all.sort((a, b) => (SEVERITY_RANK[b.finding.severity] ?? 0) - (SEVERITY_RANK[a.finding.severity] ?? 0) || a.from - b.from);
  const kept: FindingSpan<T>[] = [];
  for (const s of all) if (!kept.some(k => s.from < k.to && k.from < s.to)) kept.push(s);
  return kept.sort((a, b) => a.from - b.from);
}
