// src/services/coding/caseCodingEntries.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 607 (#138): keeps a case's full-fidelity entries (release, source, AI detail) in step with the codes the
// Add Code window saves. Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { CaseCoding } from '@/types/case/Case';
import type { CodedEntry } from './codedEntry';
import { toCaseCoding } from './caseCodingAdapter';

/** The entries to keep after a save. `active` is the full set now on the case. An entry already on the case keeps its recorded source, release and AI detail. */
export function reconcileEntries(previous: readonly CodedEntry[], active: readonly CodedEntry[]): CodedEntry[] {
  const out: CodedEntry[] = [];
  for (const a of active) {
    const old = previous.find(p => p.system === a.system && p.code.trim() === a.code.trim());
    const next = old ?? a;
    if (!out.some(o => o.system === next.system && o.code.trim() === next.code.trim() && (o.release ?? '') === (next.release ?? ''))) out.push(next);
  }
  return out;
}

/** The case's coding with `entries` set and the older lists written from them (plus any list not touched by this save left as it was). */
export function withEntries(coding: CaseCoding | undefined, entries: readonly CodedEntry[]): CaseCoding {
  const { coding: lists } = toCaseCoding(entries);
  return { ...(coding ?? {}), ...lists, entries: [...entries] };
}
