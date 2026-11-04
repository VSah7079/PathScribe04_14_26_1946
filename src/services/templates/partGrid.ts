// src/services/templates/partGrid.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461 (Pete: "a results grid question"): a synoptic question with one
// row per part of the case (core A, B, …) and a fixed set of columns (site,
// Gleason, Grade Group, % involvement, length). Used by the PathScribe
// prostate needle-biopsy "Core results" question that drives the biopsy map.
//
// Storage: ordinary synoptic answers, one key per cell —
//   `${fieldId}__${specimenId}__${columnId}` → option id or number text.
// So nothing about answer storage, merging (PS-71), audit or AI changes.
// The question's own id holds no answer.
// ─────────────────────────────────────────────────────────────────────────────

import { nodeCountBelowSum, textNodeCountExceeds, textNodeCountProblem } from './nodeCountText';
import { mohsBlockProblems } from './mohsStages';

export interface PartGridColumn {
  id: string;
  label: string;
  type: 'dropdown' | 'numeric';
  options?: { id: string; label: string }[];
  unit?: string;
  /** Batch 465b (Pete): a count that can't exceed another column's in the same row (nodes positive ≤ nodes
   *  examined). A row breaking it stops the draft being saved and the case being signed out. */
  notMoreThan?: string;
  /** Batch 466 (Pete): a count — a whole number, 0 or more. A negative or decimal value stops the draft save and
   *  sign-out, as `notMoreThan` does. */
  wholeNumber?: boolean;
}

/** Batch 462: where a grid's rows come from. Default: the case's parts.
 *  'numbered': N rows (r1…rN) labelled "<label> 1", "<label> 2"… (a focus per row);
 *  'fixed': the template's own rows (a row per oriented margin). */
export type PartGridRowSpec =
  | { kind: 'parts' }
  | { kind: 'numbered'; count: number; label: string }
  | { kind: 'fixed'; heading: string; rows: { id: string; label: string }[] };

export interface PartGridField { id: string; label?: string; type: string; columns?: PartGridColumn[]; rows?: PartGridRowSpec }

/** Batch 465b (Pete): a numeric question whose value is a grid column's total (the neck's nodes positive and
 *  examined, from the levels grid). Calculated and read-only; with `override`, entered by hand and checked
 *  against the grid's total (a warning the person can go past). */
export interface SumOfSpec { fieldId: string; columnId: string; override?: boolean }
export interface PartGridRow { id: string; label: string; description?: string }

type Answers = Record<string, string | string[] | number | undefined>;

export const PART_GRID_SEPARATOR = '__';

export function partGridKey(fieldId: string, rowId: string, columnId: string): string {
  return `${fieldId}${PART_GRID_SEPARATOR}${rowId}${PART_GRID_SEPARATOR}${columnId}`;
}

/** Whether a stored answer key is a cell of this grid question. */
export function isPartGridKey(fieldId: string, key: string): boolean {
  return key.startsWith(`${fieldId}${PART_GRID_SEPARATOR}`);
}

/** The rows of a case: its parts (specimens), in label order. */
export function partGridRowsOf(specimens: readonly { id: string; label: string; description?: string }[] | undefined): PartGridRow[] {
  return [...(specimens ?? [])]
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
    .map(s => ({ id: s.id, label: s.label, ...(s.description ? { description: s.description } : {}) }));
}

/** A grid's rows: its own (numbered or fixed) when the template gives them, else the case's parts. */
export function partGridRowsForField(field: Pick<PartGridField, 'rows'>, parts: readonly PartGridRow[]): PartGridRow[] {
  const spec = field.rows;
  if (spec?.kind === 'numbered') return Array.from({ length: Math.max(0, Math.min(spec.count, 50)) }, (_, i) => ({ id: `r${i + 1}`, label: `${spec.label} ${i + 1}`.trim() }));
  if (spec?.kind === 'fixed') return spec.rows.map(r => ({ id: r.id, label: r.label }));
  return [...parts];
}

/** The heading over a grid's row labels: the template's for numbered or fixed rows; null = "Part" (translated by the screen). */
export function partGridRowHeading(field: Pick<PartGridField, 'rows'>): string | null {
  const spec = field.rows;
  return spec?.kind === 'numbered' ? spec.label : spec?.kind === 'fixed' ? spec.heading : null;
}

/** One row's answers by column id (empty cells left out). */
export function partGridRowValues(field: PartGridField, rowId: string, answers: Answers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of field.columns ?? []) {
    const v = answers[partGridKey(field.id, rowId, c.id)];
    if (v !== undefined && v !== '' && !Array.isArray(v)) out[c.id] = String(v);
  }
  return out;
}

/** Whether any cell of the grid is answered (for progress counts). */
export function partGridHasAnswer(field: PartGridField, answers: Answers): boolean {
  return Object.entries(answers).some(([k, v]) => isPartGridKey(field.id, k) && v !== undefined && v !== null && String(v).trim() !== '');
}

/** The grid as report text: one line per answered row, cells as their labels. */
export function partGridDisplay(field: PartGridField, rows: readonly PartGridRow[], answers: Answers): string {
  const lines: string[] = [];
  for (const row of partGridRowsForField(field, rows)) {
    const values = partGridRowValues(field, row.id, answers);
    const cells = (field.columns ?? []).filter(c => values[c.id] !== undefined).map(c => {
      const raw = values[c.id];
      const shown = c.type === 'dropdown' ? (c.options?.find(o => o.id === raw)?.label ?? raw) : `${raw}${c.unit ? ` ${c.unit}` : ''}`;
      return `${c.label}: ${shown}`;
    });
    if (cells.length) lines.push(`${row.label}${row.description ? ` (${row.description})` : ''}: ${cells.join('; ')}`);
  }
  return lines.join('\n');
}

// ── Batch 465b: counts in a grid (Pete: nodes positive ≤ nodes examined; totals from the grid) ──

const cellNumber = (v: Answers[string]) => {
  if (v === undefined || v === null || Array.isArray(v) || String(v).trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** The rows a check reads: the grid's own rows (fixed or numbered), or for a grid of the case's parts the parts
 *  given; without them, the rows its stored cells name (the id as label). A stored cell on a row the grid no
 *  longer has (a renamed fixed row, a removed part) isn't checked or counted: it can't be seen or corrected. */
function checkedRows(field: PartGridField, answers: Answers, parts?: readonly PartGridRow[]): PartGridRow[] {
  if (field.rows?.kind === 'fixed' || field.rows?.kind === 'numbered' || parts) return partGridRowsForField(field, parts ?? []);
  const ids = new Set<string>();
  const prefix = `${field.id}${PART_GRID_SEPARATOR}`;
  for (const key of Object.keys(answers)) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const i = rest.lastIndexOf(PART_GRID_SEPARATOR);
    if (i > 0) ids.add(rest.slice(0, i));
  }
  return [...ids].map(id => ({ id, label: id }));
}

/** Batch 466: a count that isn't a whole number of 0 or more ('-2', '1.5', '3x'); blank is not a problem. */
export function notWholeCount(v: Answers[string]): string | undefined {
  if (v === undefined || v === null || Array.isArray(v)) return undefined;
  const raw = String(v).trim();
  return raw !== '' && !/^\d+$/.test(raw) ? raw : undefined;
}

/** A grid row's problem: a count above the column it can't exceed (`exceeds`), or a count that isn't a whole
 *  number of 0 or more (`notWhole`, Batch 466; `entered` is what was typed, and the limit fields are empty). */
export interface PartGridCountProblem {
  kind: 'exceeds' | 'notWhole';
  rowId: string; rowLabel: string; columnId: string; columnLabel: string;
  limitColumnId: string; limitLabel: string; value: number; limit: number; entered?: string;
}

/** The rows where a count is more than the column it can't exceed (both given), or (Batch 466) a count column's
 *  value isn't a whole number of 0 or more. `parts`: the case's parts, for a grid with a row per part. */
export function partGridCountProblems(field: PartGridField, answers: Answers, parts?: readonly PartGridRow[]): PartGridCountProblem[] {
  if (field.type !== 'partGrid') return [];
  const columns = field.columns ?? [];
  const checks = columns.filter(c => c.notMoreThan && columns.some(l => l.id === c.notMoreThan));
  const whole = columns.filter(c => c.wholeNumber);
  if (!checks.length && !whole.length) return [];
  const out: PartGridCountProblem[] = [];
  for (const { id: rowId, label: rowLabel } of checkedRows(field, answers, parts)) {
    const bad = new Set<string>();
    for (const c of whole) {
      const entered = notWholeCount(answers[partGridKey(field.id, rowId, c.id)]);
      if (entered === undefined) continue;
      bad.add(c.id);
      out.push({ kind: 'notWhole', rowId, rowLabel, columnId: c.id, columnLabel: c.label, limitColumnId: '', limitLabel: '', value: Number(entered), limit: Number.NaN, entered });
    }
    for (const c of checks) {
      if (bad.has(c.id) || bad.has(c.notMoreThan!)) continue;
      const limitColumn = columns.find(l => l.id === c.notMoreThan)!;
      const value = cellNumber(answers[partGridKey(field.id, rowId, c.id)]);
      const limit = cellNumber(answers[partGridKey(field.id, rowId, limitColumn.id)]);
      if (value !== undefined && limit !== undefined && value > limit) {
        out.push({ kind: 'exceeds', rowId, rowLabel, columnId: c.id, columnLabel: c.label, limitColumnId: limitColumn.id, limitLabel: limitColumn.label, value, limit });
      }
    }
  }
  return out;
}

/** A grid column's total over its answered cells (none answered: undefined). */
export function partGridColumnTotal(field: PartGridField, columnId: string, answers: Answers, parts?: readonly PartGridRow[]): number | undefined {
  let total: number | undefined;
  for (const { id: rowId } of checkedRows(field, answers, parts)) {
    const n = cellNumber(answers[partGridKey(field.id, rowId, columnId)]);
    if (n !== undefined && n >= 0) total = (total ?? 0) + n;
  }
  return total;
}

type SumField = { id: string; label?: string; type: string; sumOf?: SumOfSpec };

/** The total a sum question takes from its grid (the grid missing or nothing entered: undefined). */
export function sumOfTotal(field: SumField, fields: readonly PartGridField[], answers: Answers, parts?: readonly PartGridRow[]): number | undefined {
  const grid = field.sumOf ? fields.find(f => f.id === field.sumOf!.fieldId && f.type === 'partGrid') : undefined;
  return grid ? partGridColumnTotal(grid, field.sumOf!.columnId, answers, parts) : undefined;
}

/** How a sum question is shown: 'calculated' (read-only, the grid's total), 'open' (its grid has no counts yet:
 *  entered by hand, e.g. totals reported without levels), 'override' (always entered by hand, checked against
 *  the grid), or null (not a sum question). */
export function sumFieldState(field: SumField, gridTotal: number | undefined): 'calculated' | 'open' | 'override' | null {
  if (!field.sumOf) return null;
  if (field.sumOf.override) return 'override';
  return gridTotal === undefined ? 'open' : 'calculated';
}

/** The calculated totals as an answer patch: each sum question (not `override`) whose grid has counts takes its
 *  column's total. A grid with no counts leaves the total as entered (totals reported without levels). Pass
 *  only the questions shown, so a hidden total isn't filled in again. */
export function computedSumPatch(fields: readonly (PartGridField & SumField)[], answers: Answers, parts?: readonly PartGridRow[]): Record<string, string> {
  const patch: Record<string, string> = {};
  for (const f of fields) {
    if (!f.sumOf || f.sumOf.override) continue;
    const total = sumOfTotal(f, fields, answers, parts);
    if (total !== undefined && String(answers[f.id] ?? '') !== String(total)) patch[f.id] = String(total);
  }
  return patch;
}

export interface SumMismatch { fieldId: string; fieldLabel: string; entered: number; gridTotal: number }

/** Totals that differ from their grid's total: a hand-entered one (`override`), or a calculated one stored
 *  out of step (e.g. filled from an AI suggestion before the levels were entered). */
export function sumMismatches(fields: readonly (PartGridField & SumField)[], answers: Answers, parts?: readonly PartGridRow[]): SumMismatch[] {
  const out: SumMismatch[] = [];
  for (const f of fields) {
    if (!f.sumOf) continue;
    const entered = cellNumber(answers[f.id]);
    const gridTotal = sumOfTotal(f, fields, answers, parts);
    if (entered !== undefined && gridTotal !== undefined && entered !== gridTotal) out.push({ fieldId: f.id, fieldLabel: f.label ?? f.id, entered, gridTotal });
  }
  return out;
}

/** Whether a grid cell takes part in a count problem (its own count, or the limit it exceeds). */
export const partGridCellHasProblem = (problems: readonly PartGridCountProblem[], rowId: string, columnId: string): boolean =>
  problems.some(p => p.rowId === rowId && (p.columnId === columnId || p.limitColumnId === columnId));

/** Whether a synoptic question counts as answered (progress, required
 *  checks): a results grid when any cell is filled, any other question when
 *  its own value is non-empty. */
export function synopticFieldAnswered(field: PartGridField, answers: Answers): boolean {
  if (field.type === 'partGrid') return partGridHasAnswer(field, answers);
  // Batch 463: a Mohs stage question counts once it has a stage.
  if (field.type === 'spatialStageCanvas') return String(answers[`${field.id}${PART_GRID_SEPARATOR}stages`] ?? '').trim() !== '';
  const v = answers[field.id];
  if (v === undefined || v === null) return false;
  return Array.isArray(v) ? v.length > 0 : String(v).trim() !== '';
}

/** Batch 463b: answered and complete. A Mohs stage question is incomplete while
 *  a positive sector has no block, or one the stage didn't cut (Pete: block
 *  traceability; mohsBlockProblems). Other questions: answered. */
/** Batch 466b (Pete: Max_Value_Ref): a numeric question that can't exceed another numeric question (nodes
 *  positive ≤ nodes examined): the two values when it does (both given), else undefined. */
export function fieldExceedsProblem(field: PartGridField & { notMoreThan?: string }, answers: Answers): { value: number; limit: number } | undefined {
  if (field.type !== 'numeric' || !field.notMoreThan) return undefined;
  const value = cellNumber(answers[field.id]);
  const limit = cellNumber(answers[field.notMoreThan]);
  return value !== undefined && limit !== undefined && value > limit ? { value, limit } : undefined;
}

/** Batch 466 (Pete): a numeric question marked `wholeNumber` (a node count) holding a negative or decimal value:
 *  what was entered, else undefined. */
export function wholeNumberFieldProblem(field: PartGridField & { wholeNumber?: boolean }, answers: Answers): string | undefined {
  return field.type === 'numeric' && field.wholeNumber ? notWholeCount(answers[field.id]) : undefined;
}

/** Batch 519 (PS-494): any count problem on a question's own value — a numeric count that isn't whole or
 *  exceeds its limit, a free-text node count that isn't a count / "cannot be determined" / "at least N" or
 *  exceeds its limit, or a total below the sum of the counts it covers (nodeCountText.ts). */
export function fieldCountProblem(field: PartGridField & { wholeNumber?: boolean; notMoreThan?: string; nodeCount?: boolean; atLeastSumOf?: string[] }, answers: Answers): boolean {
  return wholeNumberFieldProblem(field, answers) !== undefined || !!fieldExceedsProblem(field, answers)
    || textNodeCountProblem(field, answers) !== undefined || !!textNodeCountExceeds(field, answers) || !!nodeCountBelowSum(field, answers);
}

export function synopticFieldComplete(field: PartGridField & { wholeNumber?: boolean; notMoreThan?: string; nodeCount?: boolean; atLeastSumOf?: string[] }, answers: Answers): boolean {
  if (!synopticFieldAnswered(field, answers)) return false;
  if (fieldCountProblem(field, answers)) return false;
  // Batch 465b: a grid with a count above its limit (nodes positive > examined) isn't complete.
  if (field.type === 'partGrid') return partGridCountProblems(field, answers).length === 0;
  return field.type !== 'spatialStageCanvas' || mohsBlockProblems(field.id, answers).length === 0;
}

/** Batch 463b: what stops sign-out for a question: required and not complete, or,
 *  required or not, a Mohs stage question with a positive sector whose block is
 *  unassigned or not cut. */
export function synopticFieldMissing(field: PartGridField & { required?: boolean; wholeNumber?: boolean; notMoreThan?: string; nodeCount?: boolean; atLeastSumOf?: string[] }, answers: Answers): boolean {
  if (field.required && !synopticFieldComplete(field, answers)) return true;
  // Batch 466: required or not, a node count that isn't a whole number of 0 or more stops sign-out
  // (Batch 466b: or one above the question it can't exceed; Batch 519: free-text counts and sums too).
  if (fieldCountProblem(field, answers)) return true;
  // Batch 465b: required or not, a grid with a count above its limit stops sign-out.
  if (field.type === 'partGrid' && partGridCountProblems(field, answers).length > 0) return true;
  return field.type === 'spatialStageCanvas' && mohsBlockProblems(field.id, answers).length > 0;
}

/** Removes a question's answers — for a grid, every one of its cells. Used
 *  when a question is hidden by its visibility condition. */
export function clearSynopticFieldAnswers(field: PartGridField, answers: Answers): void {
  delete answers[field.id];
  if (field.type !== 'partGrid' && field.type !== 'spatialStageCanvas') return;
  for (const key of Object.keys(answers)) if (isPartGridKey(field.id, key)) delete answers[key];
}

/** The rows a grid's stored cells mention, when the case's parts aren't to
 *  hand (the row id stands in for its label). */
export function partGridRowsFromAnswers(fieldId: string, answers: Answers): PartGridRow[] {
  const ids = new Set<string>();
  for (const key of Object.keys(answers)) {
    if (!isPartGridKey(fieldId, key)) continue;
    const rest = key.slice(fieldId.length + PART_GRID_SEPARATOR.length);
    const cut = rest.lastIndexOf(PART_GRID_SEPARATOR);
    if (cut > 0) ids.add(rest.slice(0, cut));
  }
  return [...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(id => ({ id, label: id }));
}
