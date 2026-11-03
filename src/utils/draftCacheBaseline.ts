// src/utils/draftCacheBaseline.ts
// Batch 756 (found recording Video 1): opening a report and leaving without changing anything still wrote a browser
// draft (the autosave ran on every reload of the case data). When the benches later changed the case (a block
// embedded, an add-on ordered, a slide cut), that stale copy no longer matched, so the next visit showed "Unsaved Draft
// Found: 1 specimen with edited content" although no one had edited anything. The first settled state of a page is the
// baseline; a draft is written only once the state differs from it. Pure.

export interface DraftBaseline { key: string; json: string }

/** What the autosave does with the state it is about to save: remember it as the baseline (the first settled state of
 *  this page), skip it (unchanged since then, or nothing loaded yet), or save it. */
export function draftAutosaveDecision(baseline: DraftBaseline | null, key: string, json: string | null): 'baseline' | 'skip' | 'save' {
  if (json === null || json === 'null') return 'skip';
  if (!baseline || baseline.key !== key) return 'baseline';
  return json === baseline.json ? 'skip' : 'save';
}

/** The state as text for the comparison; null when it can't be written out. */
export function draftStateJson(state: unknown): string | null {
  try { return state === undefined ? null : JSON.stringify(state); } catch { return null; }
}
