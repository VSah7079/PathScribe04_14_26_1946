// src/services/scanEntry/lastEntry.ts
// Batch 759 (spec §2.2 and §3, "Manual Keyboard Entry: uninterrupted case access; displays multi-identifier
// confirmation view"): the last id entered at this screen and how (scanned or typed), held in memory for this tab
// only, so the screen that opens the item can show the identifiers to check against the container. Nothing is stored.
import type { EntryMethod } from './entryMethod';

export interface LastEntry { value: string; method: EntryMethod; at: number }

let last: LastEntry | null = null;
const listeners = new Set<() => void>();

export function noteEntry(value: string, method: EntryMethod, at: number = Date.now()): void {
  last = { value: value.trim(), method, at };
  listeners.forEach(l => l());
}
export function lastEntry(): LastEntry | null { return last; }
export function subscribeToEntries(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Whether the last entry was typed and named this case (its accession, its internal id, or one of its blocks or
 *  slides, whose ids start with the accession). Pure. */
export function typedEntryNamesCase(entry: LastEntry | null, ids: readonly (string | undefined)[]): boolean {
  if (!entry || entry.method !== 'manual' || !entry.value) return false;
  const value = entry.value.toUpperCase();
  return ids.some(id => !!id && (value === id.toUpperCase() || value.startsWith(`${id.toUpperCase()}-`)));
}
