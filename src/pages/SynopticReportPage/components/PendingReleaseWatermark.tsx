// src/pages/SynopticReportPage/components/PendingReleaseWatermark.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real feature, per direct specification: Post-Sign-Out Release Buffer,
// Phase 3 (spec §13a — "Any PDF preview, browser view, or internal
// display renders a non-removable diagonal background watermark").
//
// Deliberately a background-image BUILDER, not a separately-positioned
// overlay element. A real, genuine bug found and fixed while building
// this: a `position: absolute; inset: 0` overlay, placed as an early
// child of a *scrollable* container, sizes against the container's own
// `height: 100%` (the visible viewport) — not its taller, scrolled
// content height — so it would cover only the initial view and scroll
// out of sight, leaving the rest of a long report genuinely
// unwatermarked. A CSS background-image on the scrollable element
// itself, with backgroundAttachment: 'local', scrolls WITH the content
// and tiles across the real, full scrollable height automatically, no
// JS measurement needed — the correct fix, not a cosmetic one.
//
// "Non-removable" here means it can't be selected/right-click-deleted
// through normal browser interaction (it's a background image, not a
// DOM node at all) — a genuine UI deterrent, not a cryptographic
// guarantee; a determined user with dev tools could still strip it,
// same honest limitation any browser-side watermark has.
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a real, ready-to-use CSS background-image url(...) value —
 *  compose into a scrollable container's own `style.backgroundImage`
 *  (with `backgroundRepeat: 'repeat'` and `backgroundAttachment: 'local'`)
 *  rather than rendering a separate, absolutely-positioned overlay. */
export function buildWatermarkBackgroundImage(text: string): string {
  const safeText = text || 'PENDING FINAL RELEASE — DO NOT DISTRIBUTE';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='560' height='320'>
    <text x='280' y='160' font-size='18' font-family='sans-serif' font-weight='700'
      fill='rgba(239,68,68,0.16)' text-anchor='middle' transform='rotate(-30 280 160)'>${safeText}</text>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

