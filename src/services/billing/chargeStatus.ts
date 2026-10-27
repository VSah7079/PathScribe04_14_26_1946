// src/services/billing/chargeStatus.ts
// Batch 672: kept apart from the mock so server-backed code can use it.
import type { ServiceChargeRecord } from '@/types/billing/ServiceChargeRecord';

/** Real, per direct guidance's own established migration posture -
 *  the one, real place every consumer (export gating, UI display)
 *  should read a charge's effective approval status from, rather than
 *  checking approvalStatus directly and risking treating undefined
 *  (every charge created before this feature existed, or any created
 *  since without opting into the new workflow) as DRAFT - which would
 *  incorrectly imply an already-resolved, historical charge now needs
 *  retroactive approval. Undefined is treated as the safe,
 *  already-cleared legacy default (EXPORTED), never as DRAFT. */
export function getEffectiveChargeStatus(charge: ServiceChargeRecord): NonNullable<ServiceChargeRecord['approvalStatus']> {
  return charge.approvalStatus ?? 'EXPORTED';
}
