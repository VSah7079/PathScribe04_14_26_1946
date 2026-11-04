// src/services/cytology/cytologyWorkloadSummary.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 574 (Pete, Oct 15, 2026: "show the number of reviews and remaining
// reviews so the Cytotech can easily track their limit"): the person's own
// workload over the rolling 24 hours the limit is checked over, before they
// reach it, not only once a save is refused.
//
//   - Slides counted: the weighted slide units (SCU) the limit counts
//     (resolveCytologyScuWeight: a manual GYN slide 1, an imager-assisted
//     pass 0.5, a manual rescreen 1.5); reviews: those that count (weight > 0).
//   - The limit grows with hours screened (cap × hours ÷ 8, never above the
//     cap: resolveCytologyWorkloadCapacity), so two figures are left:
//       left now      = the limit at the hours screened so far − used
//       left in a day = the full cap − used (a full 8-hour day)
//     Worked out from the exact hours, like the save's own check
//     (saveCytologyReview.ts), with the review open now included, and
//     rounded DOWN to the half slide, so the counter never shows room the
//     check would refuse. "Left now" isn't shown before any time is recorded.
//   - Status: approaching (85% of the limit so far), at the limit (the next
//     review wouldn't fit: less than its weight left, a manual slide when the
//     mode isn't known), over the limit (an escalation already over it).
//   - Same inputs as the check: the lab's workload-cap feature (off: no
//     summary), the effective cap, the ledger for the last 24 hours. On the
//     screening page the case's facility decides; on the worklist, with no
//     case, the lab's jurisdiction decides whether it shows, and the cap is
//     the person's own if set, else the strictest of the enterprise's and the
//     facilities' (so the worklist never shows more room than a case would).
// ─────────────────────────────────────────────────────────────────────────────
import type { CytologyWorkspaceDeps } from './cytologyWorkspacePorts';
import type { Jurisdiction } from '@/types/systemConfig';
import { resolveCytologyComplianceFeatures } from './cytologyComplianceFeatures';
import { resolveEffectiveCytologyWorkloadCap } from './resolveEffectiveCytologyWorkloadCap';
import { CLIA_WORKLOAD_FULL_PERIOD_HOURS, CYTOLOGY_WORKLOAD_SOFT_BRAKE_THRESHOLD_PERCENT, resolveCytologyWorkloadCapacity } from './resolveCytologyWorkloadCapacity';

const DAY_MS = 24 * 60 * 60 * 1000;
/** A manual GYN slide: what the next review is taken to weigh when its mode isn't known (the worklist). */
export const DEFAULT_NEXT_REVIEW_WEIGHT = 1;

export type CytologyWorkloadStatus = 'ok' | 'approaching' | 'atLimit' | 'over';

export interface CytologyWorkloadSummary {
  /** Reviews in the last 24 hours that count toward the limit (weight above 0). */
  reviews: number;
  /** Slide units counted (SCU). */
  slidesCounted: number;
  /** Active screening hours in the last 24 hours (shown to one decimal). */
  hours: number;
  /** The person's cap for a full 8-hour day. */
  cap: number;
  /** The limit at the hours screened so far, or null before any time is recorded. */
  limitNow: number | null;
  /** Slide units that still fit now, rounded down to the half slide; null before any time is recorded. */
  leftNow: number | null;
  /** Left in a full 8-hour day (the cap − used), rounded down to the half slide. */
  leftFullDay: number;
  /** True once 8 hours are screened: "left now" is then the full day's figure, shown once. */
  fullPeriodReached: boolean;
  status: CytologyWorkloadStatus;
  /** Used, and the limit so far, as shares of the full-day cap (0–100), for the bar and its marker. */
  percentOfCap: number;
  limitPercentOfCap: number;
}

const downToHalf = (n: number) => Math.max(0, Math.floor(n * 2 + 1e-9) / 2);
const oneDecimal = (n: number) => Math.round(n * 10) / 10;
const pct = (part: number, cap: number) => (cap > 0 ? Math.min(100, Math.max(0, Math.round((part / cap) * 100))) : 0);

export function resolveCytologyWorkloadSummary(
  entries: readonly { scuWeight: number; activeDurationSeconds: number }[],
  cap: number,
  extraSeconds = 0,
  nextReviewWeight = DEFAULT_NEXT_REVIEW_WEIGHT,
): CytologyWorkloadSummary {
  const used = entries.reduce((s, e) => s + (e.scuWeight || 0), 0);
  const exactHours = (entries.reduce((s, e) => s + (e.activeDurationSeconds || 0), 0) + Math.max(0, extraSeconds)) / 3600;
  const limit = resolveCytologyWorkloadCapacity(used, exactHours, cap).maxAllowedScu;
  const started = exactHours > 0;
  const room = limit - used;
  const status: CytologyWorkloadStatus =
    !started && used === 0 ? 'ok'
    : used > limit ? 'over'
    : room < Math.max(nextReviewWeight, 0.5) ? 'atLimit'
    : (limit > 0 && (used / limit) * 100 >= CYTOLOGY_WORKLOAD_SOFT_BRAKE_THRESHOLD_PERCENT) ? 'approaching'
    : 'ok';
  return {
    reviews: entries.filter(e => e.scuWeight > 0).length,
    slidesCounted: oneDecimal(used),
    hours: oneDecimal(exactHours),
    cap,
    limitNow: started ? Math.floor(limit * 10) / 10 : null,
    leftNow: started ? downToHalf(room) : null,
    leftFullDay: downToHalf(cap - used),
    fullPeriodReached: exactHours >= CLIA_WORKLOAD_FULL_PERIOD_HOURS,
    status,
    percentOfCap: pct(used, cap),
    limitPercentOfCap: pct(limit, cap),
  };
}

/**
 * Whether to show the counter: once something counts toward the limit in the last 24 hours. A pathologist's
 * reviews weigh nothing (the limit is the cytotechnologist's), so they never see an empty "0 of 100".
 */
export function showCytologyWorkloadCounter(summary: CytologyWorkloadSummary | null): summary is CytologyWorkloadSummary {
  return !!summary && summary.slidesCounted > 0;
}

export type CytologyWorkloadSummaryDeps = Pick<CytologyWorkspaceDeps, 'now' | 'getComplianceSettings' | 'getFacilityJurisdiction' | 'getWorkloadCaps' | 'getLedgerInWindow'> & {
  /** Every facility's cap override (the worklist, with no case open). */
  getAllFacilityWorkloadCaps?: () => Promise<{ dailySlideCap?: number }[] | null>;
};

export interface CytologyWorkloadScope {
  /** The open case's facility (the screening page). */
  facilityId?: string;
  /** With no case open (the worklist): the lab's jurisdiction, which decides whether the feature is on. */
  jurisdiction?: string;
}

/**
 * The signed-in person's summary, or null when the workload cap is off for them or the inputs can't be read.
 * No facility and no jurisdiction: off (never assume a US lab). `extraSeconds`: the review open now, not yet in
 * the ledger. `nextReviewWeight`: the chosen review mode's weight, when known.
 */
export async function loadCytologyWorkloadSummary(
  userId: string, scope: CytologyWorkloadScope, deps: CytologyWorkloadSummaryDeps, extraSeconds = 0, nextReviewWeight = DEFAULT_NEXT_REVIEW_WEIGHT,
): Promise<CytologyWorkloadSummary | null> {
  const now = deps.now();
  const { facilityId } = scope;
  const [compliance, facilityJurisdiction] = await Promise.all([
    deps.getComplianceSettings(facilityId), facilityId ? deps.getFacilityJurisdiction(facilityId) : Promise.resolve(undefined),
  ]);
  const jurisdiction = facilityJurisdiction ?? scope.jurisdiction;
  if (!jurisdiction) return null;
  if (!resolveCytologyComplianceFeatures(jurisdiction as Jurisdiction, compliance.enterprise, compliance.facility).workloadCap) return null;
  const [caps, ledger, facilityCaps] = await Promise.all([
    deps.getWorkloadCaps(facilityId, userId),
    deps.getLedgerInWindow(userId, new Date(now.getTime() - DAY_MS).toISOString(), now.toISOString()),
    !facilityId && deps.getAllFacilityWorkloadCaps ? deps.getAllFacilityWorkloadCaps() : Promise.resolve(null),
  ]);
  if (!caps || !ledger.ok) return null;
  let cap = resolveEffectiveCytologyWorkloadCap(caps.enterprise, caps.facility, caps.staff).dailySlideCap;
  // No case open: the person's own cap if they have one (it wins everywhere), else the strictest facility's.
  if (!facilityId && caps.staff?.overrides?.dailySlideCap == null && facilityCaps) {
    for (const f of facilityCaps) if (typeof f.dailySlideCap === 'number' && f.dailySlideCap < cap) cap = f.dailySlideCap;
  }
  return resolveCytologyWorkloadSummary(ledger.data, cap, extraSeconds, nextReviewWeight);
}
