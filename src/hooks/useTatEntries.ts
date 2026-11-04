// src/hooks/useTatEntries.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610: the turnaround targets from TAT configuration, for screens that
// show a verdict against them (the autopsy worklist chip and report badge).
// One shared read: a worklist with fifty autopsy rows must not ask for the
// targets fifty times. The copy is kept for 30 seconds so an admin's change
// shows up without reloading, and a failed read gives an empty list, which
// makes the callers fall back to the jurisdiction figures rather than hide the
// verdict.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { tatTargetService } from '@/services';
import type { TATEntry } from '@/types/quality/TatConfigEntry';

const TTL_MS = 30_000;
let cache: { at: number; entries: Promise<TATEntry[]> } | null = null;

function load(): Promise<TATEntry[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.entries;
  const entries = tatTargetService.getAll().then(r => (r.ok ? r.data : []), () => []);
  cache = { at: now, entries };
  return entries;
}

/** Forget the shared copy (tests, and after an admin saves a target). */
export function resetTatEntriesCache(): void { cache = null; }

export function useTatEntries(): TATEntry[] | undefined {
  const [entries, setEntries] = useState<TATEntry[] | undefined>(undefined);
  useEffect(() => {
    let live = true;
    load().then(e => { if (live) setEntries(e); });
    return () => { live = false; };
  }, []);
  return entries;
}
