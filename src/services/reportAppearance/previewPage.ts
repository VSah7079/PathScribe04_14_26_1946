// src/services/reportAppearance/previewPage.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 612: the report preview of a template in points is drawn at the paper's
// real width and side margins, with text in CSS points (1 pt = 1.333 px at 96
// dpi), so a 10 pt line wraps on screen where it will wrap on paper. These are
// the custom properties the preview page reads (pathscribe.css, .rp-page). The
// side margin is never below the 0.5 inch (12.7 mm) the printer needs, the same
// rule the PDF renderer applies (functions/report_layout.py). Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { RenderPageSetup } from './pageSetup';

export const MIN_PRINT_MARGIN_MM = 12.7;

export function previewPageVars(setup: Pick<RenderPageSetup, 'widthMm' | 'margins'>): Record<string, string> {
  const left = Math.max(MIN_PRINT_MARGIN_MM, setup.margins.left);
  const right = Math.max(MIN_PRINT_MARGIN_MM, setup.margins.right);
  return {
    '--rp-page-w': `${setup.widthMm}mm`,
    '--rp-pad-l': `${left}mm`,
    '--rp-pad-r': `${right}mm`,
  };
}
