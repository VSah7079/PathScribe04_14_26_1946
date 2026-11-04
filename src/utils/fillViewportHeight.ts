// src/utils/fillViewportHeight.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 395 (Pete: "use more of the window to present rows"). The height a
// panel should take to reach the bottom of the window: from its top edge to the
// window's bottom, less a small margin, never below a minimum. Pure.
// ─────────────────────────────────────────────────────────────────────────────

export const FILL_BOTTOM_MARGIN_PX = 16;
export const FILL_MIN_HEIGHT_PX = 200;

export function fillViewportHeight(topPx: number, viewportHeightPx: number, bottomMarginPx = FILL_BOTTOM_MARGIN_PX, minPx = FILL_MIN_HEIGHT_PX): number {
  return Math.max(minPx, Math.floor(viewportHeightPx - topPx - bottomMarginPx));
}
