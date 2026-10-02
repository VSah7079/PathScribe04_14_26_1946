// src/services/referral/referralTransitRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 432: where a referral batch is, set by hand from the batch screen.
// The status only moves forward: dispatched → in transit → delivered. "Result
// received" is set only when the result arrives (recordResult), never by hand.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReferralTransitStatus } from './IReferralTrackingService';

const ORDER: readonly ReferralTransitStatus[] = ['dispatched', 'in_transit', 'delivered', 'result_received'];
const MANUAL: readonly ReferralTransitStatus[] = ['in_transit', 'delivered'];

/** The statuses a person may set next, from the current one (pure). */
export function nextManualTransitStatuses(current: ReferralTransitStatus): ReferralTransitStatus[] {
  const at = ORDER.indexOf(current);
  return MANUAL.filter(s => ORDER.indexOf(s) > at);
}

/** Why a manual change isn't allowed, or null when it is (pure). */
export function manualTransitRefusal(current: ReferralTransitStatus, next: ReferralTransitStatus): string | null {
  if (!MANUAL.includes(next)) return 'RESULT_ONLY_BY_RESULT';
  if (ORDER.indexOf(next) <= ORDER.indexOf(current)) return 'TRANSIT_BACKWARDS';
  return null;
}
