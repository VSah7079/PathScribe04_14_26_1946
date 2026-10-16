// src/services/cytology/resolveCytologyWorkloadCapacity.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own CLIA 42 CFR § 493.1274 workload
// specification — the real, core prorated-cap math:
//   user_max_capacity = (user_assigned_cap * active_hours) / 8.0
//   exceeded if (user_scu_today + scu_weight) > user_max_capacity
//
// Real, deliberate design: `candidateScu` is the PROSPECTIVE total —
// the real caller's own already-completed SCU sum for the rolling
// window PLUS the new review's own weight, summed before calling this
// function — not something this function sums itself, since the real
// caller (the actual save flow) is the one that knows both real
// numbers. `activeScreeningHours` must likewise include the current,
// in-progress review's own real, locally-accumulated active seconds,
// not just prior completed reviews — otherwise a real, first review
// of the day would show activeScreeningHours === 0, making
// maxAllowedScu 0 and blocking even a single real review before any
// work could ever be recorded.
//
// Batch 572 (correction): the hours are counted up to 8. The limit is
// prorated below an 8-hour period but never rises above the assigned cap
// (42 CFR 493.1274(d)(2): at most 100 slides in no less than 8 hours, in a
// 24-hour period), so 10 hours screened still allows the cap, not 125%.
// Before this, more hours (now including a signed-off figure) raised the
// limit without bound.
//
// Real, exact boundary per direct guidance's own stated formula: a
// STRICT greater-than — landing exactly on the cap is real, allowed
// usage, not a violation.
// ─────────────────────────────────────────────────────────────────────────────

export const CYTOLOGY_WORKLOAD_SOFT_BRAKE_THRESHOLD_PERCENT = 85;
/** The period the full cap covers; fewer hours prorate it, more never raise it. */
export const CLIA_WORKLOAD_FULL_PERIOD_HOURS = 8;

export interface CytologyWorkloadCapacityStatus {
  maxAllowedScu: number;
  candidateScu: number;
  utilizationPercent: number;
  status: 'ok' | 'approaching' | 'exceeded';
}

export function resolveCytologyWorkloadCapacity(
  candidateScu: number,
  activeScreeningHours: number,
  userAssignedCap: number,
): CytologyWorkloadCapacityStatus {
  const maxAllowedScu = (userAssignedCap * Math.min(Math.max(activeScreeningHours, 0), CLIA_WORKLOAD_FULL_PERIOD_HOURS)) / CLIA_WORKLOAD_FULL_PERIOD_HOURS;
  const utilizationPercent = maxAllowedScu > 0 ? (candidateScu / maxAllowedScu) * 100 : (candidateScu > 0 ? 100 : 0);
  const status: CytologyWorkloadCapacityStatus['status'] =
    candidateScu > maxAllowedScu ? 'exceeded'
    : utilizationPercent >= CYTOLOGY_WORKLOAD_SOFT_BRAKE_THRESHOLD_PERCENT ? 'approaching'
    : 'ok';
  return { maxAllowedScu, candidateScu, utilizationPercent, status };
}
