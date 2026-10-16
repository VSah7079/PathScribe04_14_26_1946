// src/services/cytology/cytologyWorkloadCapRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 576 (carried from 574's review): a cytology workload cap is a whole
// number of slides from 1 to 100. CLIA 42 CFR 493.1274(d)(2): at most 100
// slides in no less than 8 hours in a 24-hour period; a medical director may
// set a lower one (e.g. 80). Checked in the enterprise, facility and staff
// settings services, so a typo (1000, or nothing) can't loosen the limit.
// ─────────────────────────────────────────────────────────────────────────────

export const CYTOLOGY_WORKLOAD_CAP_MAX = 100;
export const CYTOLOGY_WORKLOAD_CAP_OUT_OF_RANGE = 'capOutOfRange';

/** What's wrong with a cap, or null when it's a whole number from 1 to 100. */
export function cytologyWorkloadCapProblem(cap: unknown): typeof CYTOLOGY_WORKLOAD_CAP_OUT_OF_RANGE | null {
  return typeof cap === 'number' && Number.isInteger(cap) && cap >= 1 && cap <= CYTOLOGY_WORKLOAD_CAP_MAX ? null : CYTOLOGY_WORKLOAD_CAP_OUT_OF_RANGE;
}

/** Batch 578: the three places a cap is set on the Configuration screen. */
export type CytologyWorkloadCapTier = 'enterprise' | 'facility' | 'staff';

/** Batch 578: a cap that wasn't saved, said beside the field it belongs to. */
export interface CytologyWorkloadCapError {
  tier: CytologyWorkloadCapTier;
  /** capOutOfRange: not a whole number from 1 to 100; failed: anything else (refused, not saved). */
  code: typeof CYTOLOGY_WORKLOAD_CAP_OUT_OF_RANGE | 'failed';
}

/** Batch 578: what to say after saving a cap at one tier (null when it was saved). */
export function cytologyWorkloadCapError(tier: CytologyWorkloadCapTier, result: { ok: boolean; error?: string }): CytologyWorkloadCapError | null {
  if (result.ok) return null;
  return { tier, code: result.error === CYTOLOGY_WORKLOAD_CAP_OUT_OF_RANGE ? CYTOLOGY_WORKLOAD_CAP_OUT_OF_RANGE : 'failed' };
}

/**
 * Batch 578 (carried from 576): who an override can still be added for: everyone without one, in the order
 * given. The services refuse a second override for the same facility or person, so the add pickers offer
 * only these, and "+ Add Override" is unavailable when there is nobody left.
 */
export function withoutCapOverride<T extends { id: string }>(all: readonly T[], overriddenIds: Iterable<string>): T[] {
  const taken = new Set(overriddenIds);
  return all.filter(x => !taken.has(x.id));
}
