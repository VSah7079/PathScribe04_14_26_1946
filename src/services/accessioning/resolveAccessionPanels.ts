// src/services/accessioning/resolveAccessionPanels.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 721 (Pete, Oct 29, 2026: "Change the Accession app, 2-column layout").
// Decides which panels the Accession screen shows.
//
// Narrow windows keep the three tabs, one panel at a time (Case & Patient,
// Specimens, and Outside Patient Data for an Outside/Contract case).
//
// Wide windows (at least ACCESSION_TWO_COLUMN_MIN_WIDTH_PX) show two columns at
// once: Case & Patient on the left, and on the right the Specimens, or the
// Outside Patient Data when that is the tab chosen. The step buttons ("Next:
// Specimens" and "Back") have nothing to step to, so they are hidden.
//
// The decision lives here so it can be tested without a screen; the page only
// renders what this returns (CLAUDE.md rule 2).
// ─────────────────────────────────────────────────────────────────────────────

export type AccessionTab = 'case' | 'specimens' | 'outside_patient';

/** Window width, in CSS pixels, from which the two-column layout applies. The page adds the
 *  `.ps-accession-columns` classes (pathscribe.css) only at or above this width. */
export const ACCESSION_TWO_COLUMN_MIN_WIDTH_PX = 1480;

export const ACCESSION_TWO_COLUMN_QUERY = `(min-width: ${ACCESSION_TWO_COLUMN_MIN_WIDTH_PX}px)`;

export interface AccessionPanels {
  showCase: boolean;
  showSpecimens: boolean;
  showOutside: boolean;
  /** The "Next: Specimens" and "Back" buttons only make sense when one panel shows at a time. */
  showStepButtons: boolean;
}

export function resolveAccessionPanels(tab: AccessionTab, twoColumn: boolean): AccessionPanels {
  if (!twoColumn) {
    return {
      showCase: tab === 'case',
      showSpecimens: tab === 'specimens',
      showOutside: tab === 'outside_patient',
      showStepButtons: true,
    };
  }
  const outside = tab === 'outside_patient';
  return { showCase: true, showSpecimens: !outside, showOutside: outside, showStepButtons: false };
}

/** Which tab buttons look selected. In two columns the Case & Patient button is always the left
 *  column's heading, and the right column's selected button is Specimens unless Outside is chosen. */
export function isAccessionTabActive(button: AccessionTab, tab: AccessionTab, twoColumn: boolean): boolean {
  if (!twoColumn) return button === tab;
  if (button === 'case') return true;
  return button === (tab === 'outside_patient' ? 'outside_patient' : 'specimens');
}
