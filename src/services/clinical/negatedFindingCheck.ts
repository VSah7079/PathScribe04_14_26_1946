// src/services/clinical/negatedFindingCheck.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 452 (PS-131, PS-105): a code-side negation check behind the AI's
// critical-finding detection. Until now "don't flag 'no evidence of
// carcinoma'" rested only on the prompt in detectCriticalFindings.ts. This
// module re-reads the pathologist's own narrative and drops a flag whose term
// is negated everywhere it appears, NegEx-style:
//
//   - pre-negation cues before the term ("no", "no evidence of",
//     "negative for", "without", "free of", "absence of", "ruled out"…),
//   - post-negation cues after it ("not identified", "is absent",
//     "has been ruled out"…),
//   - limited to the same sentence, and cut short by a scope terminator
//     ("but", "however", "although", "except"…),
//   - pseudo-negations that only look negative are ignored ("cannot be
//     ruled out", "cannot be excluded", "no change in", "not only").
//
// Safety posture: a missed critical finding is worse than an extra prompt,
// so a flag is dropped only when the term is FOUND in its source field and
// EVERY occurrence is negated. A term that can't be found (the model
// paraphrased it), or a discrete synoptic-rule flag, is always kept.
// Pure: no I/O, no AI call.
// ─────────────────────────────────────────────────────────────────────────────

import { narrativePlainText } from './narrativePlainText';

/** Words before the term that negate it. Longest first so "no evidence of"
 *  is matched before "no". */
const PRE_CUES = [
  'no evidence of', 'no evidence for', 'no signs of', 'no sign of', 'no features of', 'no residual',
  'no definite', 'no definitive', 'no convincing', 'no', 'not', 'without evidence of', 'without',
  'negative for', 'free of', 'absence of', 'ruled out', 'rules out', 'fails to reveal', 'failed to reveal', 'nor', 'neither',
].sort((a, b) => b.length - a.length);

/** Words straight after the term that negate it, optionally after a linking
 *  verb ("carcinoma is not identified", "AFB not seen"). A cue further away
 *  doesn't count: in "carcinoma with absent E-cadherin" or "carcinoma, ER
 *  negative" the carcinoma is present. Plain "negative" is deliberately not a
 *  cue for that reason. */
const POST_CUES = [
  'not identified', 'not seen', 'not present', 'not detected', 'not found', 'not demonstrated',
  'not observed', 'not appreciated', 'not evident', 'absent', 'ruled out', 'excluded',
];
const LINKING = ['is', 'are', 'was', 'were', 'has been', 'have been', 'is also', 'are also'];

/** Phrases that contain a cue but don't negate. Removed before cue matching. */
const PSEUDO = [
  'cannot be ruled out', 'can not be ruled out', 'cannot rule out', 'cannot be excluded',
  'can not be excluded', 'cannot exclude', 'not excluded', 'not ruled out', 'not be excluded',
  'no change in', 'no change', 'no increase in', 'not only', 'not necessarily', 'no longer',
  'without difficulty', 'gram negative', 'gram-negative',
];

/** A negation scope stops at these words, and at a comma. "and" ends it too,
 *  so "no dysplasia and invasive carcinoma present" keeps the carcinoma; the
 *  cost is that "no dysplasia and carcinoma" keeps it as well (an extra
 *  prompt, never a missed one). "or"/"nor" carry the negation on ("no
 *  carcinoma or melanoma"). */
const TERMINATORS = ['but', 'however', 'although', 'though', 'except', 'apart from', 'aside from', 'yet', 'whereas', 'which', 'with the exception of', 'and', 'while', 'consistent with', 'suspicious for', 'positive for'];

/** How far a pre-negation cue reaches, in words (NegEx uses five or six). */
const PRE_WINDOW = 6;

const words = (s: string) => s.split(/\s+/).filter(Boolean);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Lower-case, single-spaced, hyphen-preserving text for matching. */
export function normaliseForMatch(text: string): string {
  return narrativePlainText(text).toLowerCase().replace(/[‐-―]/g, '-').replace(/\s+/g, ' ').trim();
}

/** Blank out pseudo-negations (same length, so offsets stay valid). */
function maskPseudo(sentence: string): string {
  let out = sentence;
  for (const p of PSEUDO) out = out.replace(new RegExp(`\\b${escape(p)}\\b`, 'g'), m => ' '.repeat(m.length));
  return out;
}

/** The words before the term back to the nearest terminator or comma. */
function scopeBefore(before: string): string {
  const comma = before.lastIndexOf(',');
  let best = comma, len = comma >= 0 ? 1 : 0;
  for (const t of TERMINATORS) {
    const re = new RegExp(`\\b${escape(t)}\\b`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(before))) if (m.index > best) { best = m.index; len = m[0].length; }
  }
  const scoped = best >= 0 ? before.slice(best + len) : before;
  return words(scoped).slice(-PRE_WINDOW).join(' ');
}
/** True when the text right after the term opens with a post-negation cue. */
function postNegated(after: string): boolean {
  let rest = after.replace(/^[\s:-]+/, '');
  for (const l of [...LINKING].sort((a, b) => b.length - a.length)) {
    if (rest.startsWith(l + ' ')) { rest = rest.slice(l.length + 1); break; }
  }
  return POST_CUES.some(c => rest === c || new RegExp(`^${escape(c)}(?![a-z0-9])`).test(rest));
}

const hasCue = (scope: string, cues: string[]) => cues.some(c => new RegExp(`(^|\\s)${escape(c)}(\\s|$)`).test(scope));

/** Sentence boundaries: full stop, semicolon, line break, bullet. A colon
 *  doesn't end the sentence ("Margins: negative for carcinoma"). */
function sentences(text: string): string[] {
  return text.split(/(?<=[.;!?])\s+|\n+|\s+[•·]\s+/).map(s => s.trim()).filter(Boolean);
}

export interface TermOccurrence { sentence: string; negated: boolean }

/** Every occurrence of `term` in `text`, each with whether it's negated. */
export function termOccurrences(text: string, term: string): TermOccurrence[] {
  const t = normaliseForMatch(term).replace(/[.;:,]+$/, '');
  if (!t) return [];
  const re = new RegExp(`(^|[^a-z0-9])(${escape(t)})(?=[^a-z0-9]|$)`, 'g');
  const out: TermOccurrence[] = [];
  for (const raw of sentences(narrativePlainText(text))) {
    const sentence = normaliseForMatch(raw);
    const masked = maskPseudo(sentence);
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(sentence))) {
      const start = m.index + m[1].length;
      const end = start + m[2].length;
      const before = masked.slice(0, start).replace(/[:()]/g, ' ');
      const after = masked.slice(end).replace(/[()]/g, ' ');
      const negated = hasCue(scopeBefore(before), PRE_CUES) || postNegated(after);
      out.push({ sentence, negated });
      if (re.lastIndex === m.index) re.lastIndex++;
    }
  }
  return out;
}

/** True only when the term appears in `text` and every appearance is negated. */
export function isTermNegatedThroughout(text: string, term: string): boolean {
  const occ = termOccurrences(text, term);
  return occ.length > 0 && occ.every(o => o.negated);
}

export interface NarrativeFlagLike {
  term: string;
  sourceField: 'gross' | 'microscopic' | 'ancillary' | 'synoptic';
  sourceQuote: string;
}

export type NegationVerdict = 'negated' | 'present' | 'notFound';

/** Decide one flag against the narrative it came from.
 *  - 'negated': the term is in its source field and every mention is negated.
 *  - 'present': at least one un-negated mention.
 *  - 'notFound': neither the term nor its quote could be located (or it's a
 *    synoptic-rule flag), so code can't second-guess the model: keep it. */
export function negationVerdict(flag: NarrativeFlagLike, caseText: { gross: string; microscopic: string; ancillary: string }): NegationVerdict {
  if (flag.sourceField === 'synoptic') return 'notFound';
  const field = caseText[flag.sourceField] ?? '';
  const occ = termOccurrences(field, flag.term);
  if (occ.length > 0) return occ.every(o => o.negated) ? 'negated' : 'present';
  // The model paraphrased the term; fall back to its quote, if the quote is
  // really in the narrative, and test the term's last word inside it
  // ("mycobacterial bacilli" → "bacilli" in "negative for acid-fast bacilli").
  const quote = normaliseForMatch(flag.sourceQuote ?? '');
  if (!quote || !normaliseForMatch(field).includes(quote)) return 'notFound';
  const head = normaliseForMatch(flag.term).match(/[a-z0-9][a-z0-9-]*/g)?.pop() ?? '';
  const inQuote = head ? termOccurrences(quote, head) : [];
  if (inQuote.length === 0) return 'notFound';
  return inQuote.every(o => o.negated) ? 'negated' : 'present';
}

/** Split flags into the ones to show and the ones the narrative negates. */
export function partitionNegatedFindings<F extends NarrativeFlagLike>(
  flags: F[],
  caseText: { gross: string; microscopic: string; ancillary: string },
): { kept: F[]; negated: F[] } {
  const kept: F[] = [], negated: F[] = [];
  for (const f of flags) (negationVerdict(f, caseText) === 'negated' ? negated : kept).push(f);
  return { kept, negated };
}
