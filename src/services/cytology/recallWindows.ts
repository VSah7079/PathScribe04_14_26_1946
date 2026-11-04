// src/services/cytology/recallWindows.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 632 (Pete, Oct 19, 2026: "the target windows should be configurable"). How soon a self-collected hrHPV recall should be
// done, in weeks from the result. Kept in the cytology screening strategy settings (enterprise level), so it needs the same
// permission as the rest of that section (config:cytology-screening-strategy:manage). A window of null means "as soon as
// practicable", with no fixed period: that is New Zealand's wording for repeating an invalid HPV swab, so it is the NZ default.
// The defaults are only a starting point: since Batch 640 each laboratory's administrator sets its own windows per country.
// ─────────────────────────────────────────────────────────────────────────────
export interface WeeksWindow { min: number; max: number }

export interface RecallWindows {
  urgent: WeeksWindow | null;
  routine: WeeksWindow | null;
  repeatAU: WeeksWindow | null;
  repeatNZ: WeeksWindow | null;
}

/** Saved shape: any window may be absent (use the default). */
export type RecallWindowsConfig = Partial<RecallWindows>;

export const DEFAULT_RECALL_WINDOWS: RecallWindows = {
  urgent: { min: 2, max: 4 },
  routine: { min: 6, max: 12 },
  repeatAU: { min: 6, max: 12 },
  repeatNZ: null,
};

export const MAX_RECALL_WEEKS = 52;

export type RecallWindowKey = keyof RecallWindows;
export const RECALL_WINDOW_KEYS: readonly RecallWindowKey[] = ['urgent', 'routine', 'repeatAU', 'repeatNZ'];

/** The windows in force: a saved window (including an explicit null) wins over the default. */
export function resolveRecallWindows(saved: RecallWindowsConfig | undefined): RecallWindows {
  const out = { ...DEFAULT_RECALL_WINDOWS };
  for (const k of RECALL_WINDOW_KEYS) if (saved && k in saved && saved[k] !== undefined) out[k] = saved[k] as WeeksWindow | null;
  return out;
}

export type RecallWindowProblem = 'not-whole-weeks' | 'out-of-range' | 'min-after-max';

/** A window is whole weeks from 1 to MAX_RECALL_WEEKS, and the first number is not after the second. null is always allowed. */
export function recallWindowProblem(w: WeeksWindow | null): RecallWindowProblem | null {
  if (w === null) return null;
  if (!Number.isInteger(w.min) || !Number.isInteger(w.max)) return 'not-whole-weeks';
  if (w.min < 1 || w.max < 1 || w.min > MAX_RECALL_WEEKS || w.max > MAX_RECALL_WEEKS) return 'out-of-range';
  if (w.min > w.max) return 'min-after-max';
  return null;
}

/** The first problem across all four windows, or null. */
export function recallWindowsProblem(windows: RecallWindows): { key: RecallWindowKey; problem: RecallWindowProblem } | null {
  for (const key of RECALL_WINDOW_KEYS) {
    const problem = recallWindowProblem(windows[key]);
    if (problem) return { key, problem };
  }
  return null;
}

/** What a person typed into the From and To boxes: both empty is "as soon as practicable" (null); one empty is not allowed. */
export function parseWindowInput(from: string, to: string): { window: WeeksWindow | null; problem: RecallWindowProblem | 'incomplete' | null } {
  const a = from.trim(), b = to.trim();
  if (a === '' && b === '') return { window: null, problem: null };
  if (a === '' || b === '') return { window: null, problem: 'incomplete' };
  const w = { min: Number(a), max: Number(b) };
  return { window: w, problem: recallWindowProblem(w) };
}

// ── Batch 640 (Pete, Oct 20, 2026): each country keeps its own windows, chosen from a dropdown in the settings card ──────────────
/** Windows saved per country. A country with none saved uses the shared set from Batch 632 (if any), then the defaults. */
export type RecallWindowsByJurisdiction = Partial<Record<'AU' | 'NZ', RecallWindowsConfig>>;

/** The windows in force for one country: its own saved window, else the shared one saved before Batch 640, else the default. */
export function resolveRecallWindowsFor(
  jurisdiction: 'AU' | 'NZ', byJurisdiction: RecallWindowsByJurisdiction | undefined, shared: RecallWindowsConfig | undefined,
): RecallWindows {
  return resolveRecallWindows({ ...shared, ...byJurisdiction?.[jurisdiction] });
}
