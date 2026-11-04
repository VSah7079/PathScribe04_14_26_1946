// api/webhooks/engine/_lib/upsertEngraverStatus.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, deliberately different shape from applyEngineCaseUpdate.ts:
// engraver status is CURRENT STATE (one real, live document per real
// device, upserted), not an append-only event log the way a case
// mutation or a pending notification is. A real Engine may report
// status on a fast interval or a real change-triggered basis — this
// function's own job is making sure a real, out-of-order redelivery
// (a delayed retry arriving after a newer, real status already
// landed) can never silently overwrite newer state with older state.
//
// Real, deliberate choice: staleness is judged by the EVENT's own
// timestamp field, not by write-arrival order (Firestore's own
// timestamp), since a real Engine's retries can arrive in any order
// relative to a newer, real status change that happened to send
// cleanly on the first try.
// ─────────────────────────────────────────────────────────────────────────────

import { getAdminFirestore } from './firebaseAdmin';
import type { EngraverStatus, SupplyWarning } from '../../../../src/types/events/EngraverStatusEventPayload';

const COLLECTION_NAME = 'engraver_devices';

export interface UpsertEngraverStatusInput {
  deviceId: string;
  deviceName?: string;
  locationLabel?: string;
  organisationId: string;
  siteId?: string;
  status: EngraverStatus;
  supplyWarnings?: SupplyWarning[];
  warnings?: string[];
  diagnosticsUrl?: string;
  sourceSystem: string;
  timestamp: string;
}

export type UpsertEngraverStatusOutcome = 'applied' | 'stale-ignored' | 'already-processed';

/** The same collection idempotency.ts claims in (Batch 549, F10). */
const PROCESSED_MESSAGES = 'processed_messages';

/**
 * Batch 549 (F10): with `claim`, the engine's messageId is claimed in the same
 * transaction as the status, so a crash can't leave a claim with no status.
 * A messageId already claimed changes nothing ('already-processed').
 */
export async function upsertEngraverStatus(
  input: UpsertEngraverStatusInput,
  claim?: { messageId: string; eventType: string },
): Promise<UpsertEngraverStatusOutcome> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION_NAME).doc(input.deviceId);
  const claimRef = claim ? db.collection(PROCESSED_MESSAGES).doc(claim.messageId) : null;

  return db.runTransaction(async (tx): Promise<UpsertEngraverStatusOutcome> => {
    if (claimRef && (await tx.get(claimRef)).exists) return 'already-processed';
    const snap = await tx.get(ref);
    if (claimRef && claim) tx.create(claimRef, { eventType: claim.eventType, claimedAt: new Date().toISOString() });
    const currentTimestamp: string | undefined = snap.exists ? snap.data()?.lastReportedAt : undefined;

    // Real, deliberate staleness guard — an older, real event arriving
    // after a newer one already landed is dropped, not applied. A
    // genuinely equal timestamp (a real, exact redelivery) is treated
    // as stale too — nothing new to apply either way.
    if (currentTimestamp && input.timestamp <= currentTimestamp) {
      return 'stale-ignored';
    }

    tx.set(ref, {
      deviceId: input.deviceId,
      deviceName: input.deviceName ?? null,
      locationLabel: input.locationLabel ?? null,
      organisationId: input.organisationId,
      siteId: input.siteId ?? null,
      status: input.status,
      supplyWarnings: input.supplyWarnings ?? [],
      warnings: input.warnings ?? [],
      diagnosticsUrl: input.diagnosticsUrl ?? null,
      sourceSystem: input.sourceSystem,
      lastReportedAt: input.timestamp,
    }, { merge: true });

    return 'applied';
  });
}
