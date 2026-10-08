// src/services/material/slideLevels.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 460: a slide's level ("L3") is the one printed on its label: the end
// of its displayId, fixed when the slide was ordered. Before, every scan
// resolver and location update worked the level out from the slide's
// position in the list, so after Microtomy reordered the slides (batch mode)
// or deleted an unprinted one, scanning a printed slide found a different
// slide, and a new slide could reuse a level (and barcode) already printed.
//
// • slideLevelOf: the stored level; a slide with no level in its displayId
//   (older data) falls back to its position, as before.
// • stainIndexAtLevel / stainAtLevel: the slide a scanned level means.
// • nextSlideLevelNumber: one past the highest level ever used on the block,
//   so a removed slide's level is never given out again.
// ─────────────────────────────────────────────────────────────────────────────

type SlideLike = { displayId?: string };

const LEVEL_AT_END = /-L(\d+)$/i;

/** The slide's level as printed ("L3"); its position when the displayId has none. */
export function slideLevelOf(stain: SlideLike, index: number): string {
  const m = stain.displayId ? LEVEL_AT_END.exec(stain.displayId) : null;
  return m ? `L${Number(m[1])}` : `L${index + 1}`;
}

/** The index of the slide whose level is `level` ("L3", any case), or -1. */
export function stainIndexAtLevel(stains: readonly SlideLike[] | undefined, level: string): number {
  const wanted = `L${Number(String(level).replace(/^L/i, ''))}`;
  return (stains ?? []).findIndex((s, i) => slideLevelOf(s, i) === wanted);
}

export function stainAtLevel<T extends SlideLike>(stains: readonly T[] | undefined, level: string): T | undefined {
  const i = stainIndexAtLevel(stains, level);
  return i === -1 ? undefined : (stains as T[])[i];
}

/** One past the highest level on the list (never reuses a removed slide's level). */
export function nextSlideLevelNumber(stains: readonly SlideLike[] | undefined): number {
  return (stains ?? []).reduce((max, s, i) => Math.max(max, Number(slideLevelOf(s, i).slice(1))), 0) + 1;
}

/** Whether the slide at `index` is the one at `level` ("L3", any case). */
export function isSlideAtLevel(stain: SlideLike, index: number, level: string): boolean {
  return slideLevelOf(stain, index) === `L${Number(String(level).replace(/^L/i, ''))}`;
}
