// src/services/autopsy/resolveAutopsyWorklistBadges.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 477 (PS-261 follow-up, Module 5) — Pete's own scoping call,
// given the Worklist's existing Autopsy branch tab + grouping
// (autopsyGrouping.ts, added well before this week's PS-261 work, per
// Pete's own earlier "there are so few, can we just group the
// records?"): a "dedicated autopsy worklist" means adding real
// autopsy-specific state to the rows already shown there, not a
// second, separate screen. This is the real, pure badge-resolution
// function WorklistTable.tsx renders — same split as
// resolveWorklistDpBadges.ts, which this file's own shape deliberately
// mirrors: decision logic here, display/i18n in the component.
//
// Every badge is a label KEY, never resolved text — the component
// resolves it with t() at render time, so this stays a plain,
// testable function with no i18n dependency of its own.
//
// Deliberately conservative about what counts as "SLA state": there
// is no real deadline-vs-now calculation anywhere in this module yet
// (resolveAutopsyTatSlaMatrix.ts's own header comment already flags
// the real elapsed-time/ancillary-hold-adjusted deadline calculation
// as "a later phase," not built). Fabricating an "on track"/"overdue"
// verdict here without that real calculation would be dishonest, so
// this only ever surfaces the jurisdiction's real, static TAT/SLA
// target (via formatAutopsyTatSlaSummary.ts, already built and
// already shown — unformatted — on the report page) as an
// informational hint, never a computed breach.
// ─────────────────────────────────────────────────────────────────────────────

import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';
import { resolveAutopsyTatSlaMatrix } from './resolveAutopsyTatSlaMatrix';
import { formatAutopsyTatSlaSummary } from './formatAutopsyTatSlaSummary';

export type AutopsyWorklistBadgeKind = 'caseAuthority' | 'ancillaryHold' | 'padSigned' | 'fadSigned';

export interface AutopsyWorklistBadge {
  kind: AutopsyWorklistBadgeKind;
  /** i18n key for the badge's own visible text — resolved by the
   *  component with t(), never here. */
  labelKey: string;
}

/**
 * Real, always-present-for-an-autopsy-case badges: who the case
 * proceeds under (reuses the same label keys the Search page's own
 * autopsy-authority filter already uses — `autopsyIntake.caseAuthority.*`
 * — never a second, parallel label), whether an ancillary hold is
 * currently active (`searchPage.holdType.autopsyAncillary`), and
 * whether PAD/FAD has been signed (`searchPage.autopsyReport.*`) —
 * same, not-mutually-exclusive "pad"/"fad" stage definition
 * `caseSearchMatching.ts`'s own autopsy-report filter already uses
 * (a case can show both once FAD is signed), reused rather than
 * reinvented.
 */
export function resolveAutopsyWorklistBadges(autopsy: AutopsyCaseDetails): AutopsyWorklistBadge[] {
  const badges: AutopsyWorklistBadge[] = [
    { kind: 'caseAuthority', labelKey: `autopsyIntake.caseAuthority.${autopsy.caseAuthority}` },
  ];
  if (autopsy.ancillaryHold?.active) {
    badges.push({ kind: 'ancillaryHold', labelKey: 'searchPage.holdType.autopsyAncillary' });
  }
  if (autopsy.padSnapshot) badges.push({ kind: 'padSigned', labelKey: 'searchPage.autopsyReport.pad' });
  if (autopsy.fadSnapshot) badges.push({ kind: 'fadSigned', labelKey: 'searchPage.autopsyReport.fad' });
  return badges;
}

/**
 * The jurisdiction's real, static PAD/FAD turnaround target, as a
 * tooltip hint — not a computed deadline, see this file's own header.
 * Reuses formatAutopsyTatSlaSummary.ts verbatim, including its
 * existing, disclosed, hardcoded-English gap (already shown the same
 * way, untranslated, on the report page) — not a new gap introduced
 * here, and not fixed in this batch either.
 */
export function resolveAutopsySlaHint(autopsy: AutopsyCaseDetails): string {
  return formatAutopsyTatSlaSummary(resolveAutopsyTatSlaMatrix(autopsy.jurisdiction));
}
