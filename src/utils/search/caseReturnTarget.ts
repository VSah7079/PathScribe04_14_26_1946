// src/utils/search/caseReturnTarget.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-101 review (Oct 15, 2026): where the case report goes back to, and what
// its breadcrumb calls that place (pure).
//
// The report already went back to Search for a case opened from a search
// result (SynopticReportPage guard() remaps /worklist → /search), but the
// breadcrumb and the compact header's back button always read "Worklist".
// Both now name the screen the case was opened from. Where it came from is
// recorded by SearchPage / the worklist before they open a case
// (searchSession.ts setCaseOpenedFrom / getCaseOpenedFrom, this tab only).
// ─────────────────────────────────────────────────────────────────────────────

import type { CaseOpenedFrom } from './searchSession';

export interface CaseReturnTarget {
  /** Where Back and the breadcrumb go. */
  path: '/search' | '/worklist';
  /** The breadcrumb label (locale key). */
  labelKey: 'headerBar.breadcrumb.search' | 'headerBar.breadcrumb.worklist';
  /** The compact header's back-button tooltip (locale key). */
  tooltipKey: 'headerBar.nav.backToSearchTooltip' | 'headerBar.nav.backToWorklistTooltip';
}

export function caseReturnTarget(openedFrom: CaseOpenedFrom): CaseReturnTarget {
  return openedFrom === 'search'
    ? { path: '/search', labelKey: 'headerBar.breadcrumb.search', tooltipKey: 'headerBar.nav.backToSearchTooltip' }
    : { path: '/worklist', labelKey: 'headerBar.breadcrumb.worklist', tooltipKey: 'headerBar.nav.backToWorklistTooltip' };
}
