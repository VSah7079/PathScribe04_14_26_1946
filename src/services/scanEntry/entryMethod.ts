// src/services/scanEntry/entryMethod.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 759 (Patient Verification, Outside Case Tracking and Audit Logging spec, §2.2, Pete, Nov 2, 2026): was an id
// scanned by a barcode scanner, or typed (or pasted, or dictated) by hand? A keyboard-wedge scanner types like a
// keyboard but fast and evenly; a person types slowly, pauses and corrects. Pure.
//
// The rule: an entry is a scan when every character came as a key press (nothing pasted, nothing deleted, the touch
// keyboard not opened), there were at least MIN_SCAN_LENGTH of them, and the keys came at scanner speed: half of the
// gaps at most SCAN_GAP_MS and none longer than MAX_SCAN_GAP_MS (a busy screen can delay one key event).
// Anything else is a manual entry.
// ─────────────────────────────────────────────────────────────────────────────

export type EntryMethod = 'scan' | 'manual';

/** The same speed rule as contexts/ScannerProvider.tsx (a scanner sends a key every 5 to 20 ms; a person over 100). */
export const SCAN_GAP_MS = 50;
export const MAX_SCAN_GAP_MS = 200;
export const MIN_SCAN_LENGTH = 5;

export interface EntryTrace {
  /** When each character key came (event timestamps, ms). */
  keyTimes: readonly number[];
  pasted?: boolean;
  /** A character was deleted (Backspace, Delete) or the text was edited another way. */
  edited?: boolean;
  /** The touch keyboard was opened on purpose, or the text came by dictation. */
  byHand?: boolean;
}

export function entryMethodOf(trace: EntryTrace): EntryMethod {
  if (trace.pasted || trace.edited || trace.byHand) return 'manual';
  const times = trace.keyTimes;
  if (times.length < MIN_SCAN_LENGTH) return 'manual';
  const gaps = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  return median <= SCAN_GAP_MS && gaps[gaps.length - 1] <= MAX_SCAN_GAP_MS ? 'scan' : 'manual';
}

/** Follows one entry field from empty to submit. */
export interface EntryTracker {
  key(key: string, at: number): void;
  paste(): void;
  /** The field's text changed; a change that is not the next typed character counts as editing. */
  change(previous: string, next: string): void;
  byHand(): void;
  method(): EntryMethod;
  reset(): void;
}

export function createEntryTracker(): EntryTracker {
  let trace: { keyTimes: number[]; pasted: boolean; edited: boolean; byHand: boolean } = { keyTimes: [], pasted: false, edited: false, byHand: false };
  return {
    key(key, at) {
      if (key === 'Backspace' || key === 'Delete') { trace.edited = true; return; }
      if (key.length === 1) trace.keyTimes.push(at);
    },
    paste() { trace.pasted = true; },
    change(previous, next) {
      if (next === '') { trace = { keyTimes: [], pasted: false, edited: false, byHand: trace.byHand }; return; }
      // Typing adds one character at the end; anything else (a cut, a paste, an edit in the middle) is by hand.
      if (!(next.length === previous.length + 1 && next.toUpperCase().startsWith(previous.toUpperCase()))) trace.edited = true;
    },
    byHand() { trace.byHand = true; },
    method() { return entryMethodOf(trace); },
    reset() { trace = { keyTimes: [], pasted: false, edited: false, byHand: false }; },
  };
}
