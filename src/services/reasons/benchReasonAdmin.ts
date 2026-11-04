// src/services/reasons/benchReasonAdmin.ts
// Batch 736: the rules of Configuration → System → Bench Reasons. A wording is required and must differ from the
// category's other active reasons; a new reason goes last; moving one swaps its place with its neighbour. Pure.
import type { ReasonDictionaryEntry } from '@/types/reasons/ReasonDictionaryEntry';
import { BENCH_REASON_SEEDS, activeBenchReasons } from './benchReasons';

export type BenchWordingProblem = 'required' | 'duplicate';

const norm = (s: string) => s.trim().toLocaleLowerCase();

/** Why a wording can't be saved for `id` (undefined for a new reason), or null. */
export function benchWordingProblem(wording: string, id: string | undefined, entries: readonly ReasonDictionaryEntry[], shownLabel: (e: ReasonDictionaryEntry) => string): BenchWordingProblem | null {
  if (!wording.trim()) return 'required';
  const clash = entries.some(e => e.id !== id && e.status === 'Active' && (norm(e.name) === norm(wording) || norm(shownLabel(e)) === norm(wording)));
  return clash ? 'duplicate' : null;
}

/** The order for a new reason: after the last. */
export function nextSortOrder(entries: readonly ReasonDictionaryEntry[]): number {
  return entries.reduce((m, e) => Math.max(m, e.sortOrder ?? 0), 0) + 1;
}

/** The sortOrder changes that move `id` one place up (-1) or down (+1) among the active reasons; none at the ends. */
export function moveBenchReason(entries: readonly ReasonDictionaryEntry[], id: string, delta: -1 | 1): { id: string; sortOrder: number }[] {
  const list = activeBenchReasons(entries);
  const i = list.findIndex(e => e.id === id);
  const j = i + delta;
  if (i === -1 || j < 0 || j >= list.length) return [];
  // Renumber 1..n with the two swapped, and return only what changed.
  const order = list.map(e => e.id);
  [order[i], order[j]] = [order[j], order[i]];
  return order.map((eid, k) => ({ id: eid, sortOrder: k + 1 })).filter(c => list.find(e => e.id === c.id)?.sortOrder !== c.sortOrder);
}

/** The shipped wording of a default reason, to put back (undefined for a lab's own reason). */
export function defaultWordingOf(id: string): string | undefined {
  return BENCH_REASON_SEEDS.find(s => s.id === id)?.name;
}
