// src/services/templates/nodeCountText.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 519 (PS-494): node counts kept as free text in the CAP-derived
// templates (Breast, Colon, Colorectal, Lung, Prostate). A text question marked
// `nodeCount` takes:
//   • a whole number of 0 or more ("12");
//   • "cannot be determined" (or "cannot be assessed", "indeterminate");
//   • "at least N" (or "≥ N", ">= N"), for fragmented nodes;
// and the same phrases in French, German, Dutch and Korean.
// Anything else blocks draft save and sign-out, as a numeric count does
// (Batch 466). Pete's accepted defaults, Oct 10.
//
// Limits, read from the template:
//   • `notMoreThan` (Batch 466b) — the count can't exceed another count
//     ("positive ≤ examined"). An exact count is compared; "at least N" is
//     compared by its N (at least 13 positive of 12 examined is impossible);
//     "cannot be determined" on either side skips the check.
//   • `atLeastSumOf` — this count can't be below the sum of other counts
//     (Breast: total examined ≥ positive A + B + C; and the sentinel subset ≤
//     total examined through `notMoreThan`). Skipped when any part is "cannot
//     be determined"; "at least N" parts add their N.
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

type Answers = Record<string, string | string[] | number | undefined>;

export type NodeCount =
  | { kind: 'exact'; value: number }
  | { kind: 'atLeast'; value: number }
  | { kind: 'indeterminate' }
  | { kind: 'empty' }
  | { kind: 'invalid'; entered: string };

// The same phrases in the five UI languages, so a pathologist can type them in their own language.
const INDETERMINATE = new RegExp([
  "^(cannot|can ?not|can't) be (determined|assessed)$", '^indeterminate$', '^not determined$',
  '^ne peut (pas )?être (déterminé|évalué)$', '^indéterminable$', '^non déterminé$',
  '^nicht bestimmbar$', '^nicht beurteilbar$',
  '^niet te bepalen$', '^niet bepaalbaar$',
  '^판정 ?불가$', '^평가 ?불가$',
].join('|'), 'i');
const AT_LEAST = /^(?:at least|≥|>=|au moins|mindestens|minstens|ten minste|최소)\s*(\d+)$/i;

/** What a node-count answer says. */
export function parseNodeCount(v: Answers[string]): NodeCount {
  if (v === undefined || v === null || Array.isArray(v)) return { kind: 'empty' };
  const raw = String(v).trim().replace(/\s+/g, ' ');
  if (raw === '') return { kind: 'empty' };
  if (/^\d+$/.test(raw)) return { kind: 'exact', value: Number(raw) };
  const atLeast = AT_LEAST.exec(raw);
  if (atLeast) return { kind: 'atLeast', value: Number(atLeast[1]) };
  if (INDETERMINATE.test(raw)) return { kind: 'indeterminate' };
  return { kind: 'invalid', entered: raw };
}

export interface NodeCountField { id: string; label?: string; type: string; nodeCount?: boolean; notMoreThan?: string; atLeastSumOf?: string[] }

/** Whether a question is a free-text node count. */
export const isTextNodeCount = (f: { type: string; nodeCount?: boolean }): boolean => f.type === 'text' && f.nodeCount === true;

/** A free-text node count that isn't one of the accepted forms: what was entered, else undefined. */
export function textNodeCountProblem(field: NodeCountField, answers: Answers): string | undefined {
  if (!isTextNodeCount(field)) return undefined;
  const c = parseNodeCount(answers[field.id]);
  return c.kind === 'invalid' ? c.entered : undefined;
}

/** The number a count can be compared by (exact, or the N of "at least N"); undefined when it can't. */
const comparable = (c: NodeCount): number | undefined => (c.kind === 'exact' || c.kind === 'atLeast' ? c.value : undefined);

/** A free-text node count above the count it can't exceed: the two numbers, else undefined. */
export function textNodeCountExceeds(field: NodeCountField, answers: Answers): { value: number; limit: number } | undefined {
  if (!isTextNodeCount(field) || !field.notMoreThan) return undefined;
  const value = comparable(parseNodeCount(answers[field.id]));
  const limitCount = parseNodeCount(answers[field.notMoreThan]);
  // "at least N" as the limit only says it's N or more, so nothing can be shown to exceed it.
  if (limitCount.kind !== 'exact' || value === undefined) return undefined;
  return value > limitCount.value ? { value, limit: limitCount.value } : undefined;
}

/** A count below the sum of the counts it must cover (total examined < A + B + C positive): the two numbers. */
export function nodeCountBelowSum(field: NodeCountField, answers: Answers): { value: number; sum: number } | undefined {
  if (!field.atLeastSumOf?.length) return undefined;
  const own = parseNodeCount(answers[field.id]);
  if (own.kind !== 'exact') return undefined;
  let sum = 0;
  let any = false;
  for (const id of field.atLeastSumOf) {
    const part = parseNodeCount(answers[id]);
    if (part.kind === 'indeterminate' || part.kind === 'invalid') return undefined;
    const n = comparable(part);
    if (n !== undefined) { sum += n; any = true; }
  }
  return any && sum > own.value ? { value: own.value, sum } : undefined;
}
