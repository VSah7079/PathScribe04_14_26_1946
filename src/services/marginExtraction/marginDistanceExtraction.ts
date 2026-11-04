// src/services/marginExtraction/marginDistanceExtraction.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 490 (Pete's rule-condition spec for margin-distance thresholds —
// "Regex / Token Extraction Layer... Normalized Shadow Attributes...
// Explicit Fallback/Review Flags"). This file is the extraction layer
// itself: a pure, synchronous parser that turns a pathologist's free-text
// margin-distance answer ("2mm", "0.5 cm", "<1mm from the inked margin",
// "cannot be assessed") into a normalized numeric distance in millimetres,
// or — when the text can't be confidently read as one — flags it instead
// of guessing.
//
// Deliberately pure (no I/O, no storage): the service layer
// (IMarginExtractionService/mockMarginExtractionService in this folder)
// is what persists a confident result as a shadow attribute or an
// unconfident one as a review-queue exception. Keeping the parsing itself
// pure makes it directly unit-testable without a mock service, per
// CLAUDE.md rule 2 (decisions belong in services/utils, tested directly).
//
// Which fields this applies to: a template field is a margin-distance
// text field when it is `type: 'text'` and its id ends in `_mm` or `_cm`
// — the exact naming convention already used throughout
// src/data/templates/generic/*.json for free-text distance answers (e.g.
// `distance_to_crm_mm`, `distance_to_closest_margin_cm`). A field that is
// already `type: 'numeric'` with a declared `unit` (the PathScribe
// anatomical-map `psmap_*` fields) is already structured data and never
// needs this layer — `isMarginDistanceTextField` excludes it on `type`
// alone.
//
// What counts as confident:
//   - An explicit unit in the text ("2mm", "0.5 cm", "<1 mm") — read
//     exactly, converted to mm (cm × 10) — UNLESS other substantive text
//     surrounds the number+unit (e.g. a sentence describing something
//     else that happens to contain a measurement), in which case it's
//     flagged rather than guessed at.
//   - A bare number with no unit in the text ("2", "<1") — read using the
//     field's own declared/implied unit (its id's _mm or _cm suffix, or
//     an explicit `fieldUnit` override).
// Anything else — no numeric token at all, or a number buried in prose
// this parser doesn't trust — is not confident, with a `reason` a review
// queue can show a human.
// ─────────────────────────────────────────────────────────────────────────────

export type MarginDistanceApprox = 'exact' | 'lessThan' | 'greaterThan';

export type MarginDistanceUnit = 'mm' | 'cm';

export type MarginExtractionFailureReason = 'empty' | 'noNumericToken' | 'surroundingText';

export interface MarginDistanceExtraction {
  rawText: string;
  /** Normalized distance in millimetres. Null when not confident. */
  valueMm: number | null;
  approx: MarginDistanceApprox | null;
  confident: boolean;
  /** Set only when confident is false. */
  reason?: MarginExtractionFailureReason;
}

interface ExtractOptions {
  /** The unit to assume for a bare number with no unit written in the text. Defaults to 'mm'. */
  fieldUnit?: MarginDistanceUnit;
}

const UNIT_PATTERN = /(<=|>=|<|>|≤|≥)?\s*(\d+(?:\.\d+)?)\s*(mm|millimet(?:er|re)s?|cm|centimet(?:er|re)s?)\b/i;
const BARE_NUMBER_PATTERN = /^\s*(<=|>=|<|>|≤|≥)?\s*(\d+(?:\.\d+)?)\s*$/;

/** Filler words tolerated around a matched number+unit without losing confidence
 *  (so "margin: 2mm" and "approximately 2 mm from the margin" both parse cleanly,
 *  but a sentence describing an unrelated measurement does not). */
const FILLER_WORDS = new Set([
  'margin', 'margins', 'approx', 'approximately', 'at', 'least', 'closest',
  'distance', 'away', 'clear', 'clearance', 'is', 'of', 'the', 'to', 'from',
  'measuring', 'measured', 'inked', 'surface', 'nearest', 'minimum', 'min',
]);

function normalizeApprox(symbol: string | undefined): MarginDistanceApprox {
  if (symbol === '<' || symbol === '<=' || symbol === '≤') return 'lessThan';
  if (symbol === '>' || symbol === '>=' || symbol === '≥') return 'greaterThan';
  return 'exact';
}

function toMm(value: number, unit: MarginDistanceUnit): number {
  return unit === 'cm' ? value * 10 : value;
}

/** True when everything outside the matched span is only filler words/punctuation. */
function remainderIsFiller(text: string, match: RegExpMatchArray): boolean {
  const remainder = text.slice(0, match.index ?? 0) + text.slice((match.index ?? 0) + match[0].length);
  const tokens = remainder
    .toLowerCase()
    .replace(/[.,;:()[\]]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return tokens.every(t => FILLER_WORDS.has(t));
}

/**
 * Parses one free-text margin-distance answer into a normalized millimetre value.
 * Pure — no storage, no side effects. See the file header for the confidence rules.
 */
export function extractMarginDistanceMm(rawText: string | undefined | null, options: ExtractOptions = {}): MarginDistanceExtraction {
  const text = (rawText ?? '').trim();
  const fieldUnit: MarginDistanceUnit = options.fieldUnit ?? 'mm';

  if (!text) {
    return { rawText: text, valueMm: null, approx: null, confident: false, reason: 'empty' };
  }

  const unitMatch = text.match(UNIT_PATTERN);
  if (unitMatch) {
    const approx = normalizeApprox(unitMatch[1]);
    const num = parseFloat(unitMatch[2]);
    const unit: MarginDistanceUnit = /cm|centimet/i.test(unitMatch[3]) ? 'cm' : 'mm';
    const valueMm = toMm(num, unit);
    if (remainderIsFiller(text, unitMatch)) {
      return { rawText: text, valueMm, approx, confident: true };
    }
    return { rawText: text, valueMm: null, approx: null, confident: false, reason: 'surroundingText' };
  }

  const bareMatch = text.match(BARE_NUMBER_PATTERN);
  if (bareMatch) {
    const approx = normalizeApprox(bareMatch[1]);
    const num = parseFloat(bareMatch[2]);
    return { rawText: text, valueMm: toMm(num, fieldUnit), approx, confident: true };
  }

  return { rawText: text, valueMm: null, approx: null, confident: false, reason: 'noNumericToken' };
}

/** A template field is a margin-distance free-text field when it's free text
 *  and its id carries the project's own `_mm`/`_cm` naming convention. */
export function isMarginDistanceTextField(field: { id: string; type: string }): boolean {
  return field.type === 'text' && /_(mm|cm)$/i.test(field.id);
}

/** The unit implied by a margin-distance text field's own id (`_cm` vs `_mm`). */
export function unitForMarginDistanceField(fieldId: string): MarginDistanceUnit {
  return /_cm$/i.test(fieldId) ? 'cm' : 'mm';
}
