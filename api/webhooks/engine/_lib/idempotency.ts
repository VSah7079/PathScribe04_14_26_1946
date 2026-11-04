// api/webhooks/engine/_lib/idempotency.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own decision: messageId as the Firestore
// document ID in a dedicated `processed_messages` collection, written
// via create() (fails on conflict) rather than set() (silently
// overwrites) — the real fix for the three existing process*Event
// functions' own in-memory `Set<string>`, which correctly enforced
// "redelivery is a no-op" for a single long-lived browser tab, but
// gives no real guarantee across separate serverless invocations,
// which do not share memory and may cold-start with an empty Set on
// every single request.
//
// Real, honest scope: this file only owns the "have we seen this
// messageId before" question. It does not decide what counts as a
// duplicate beyond messageId equality, and it does not retry or queue
// anything — a caller that gets `alreadyProcessed: true` back should
// just return 200 immediately, matching how a redelivered webhook is
// conventionally expected to behave (the sender sees success and stops
// retrying, exactly as if this were the first delivery).
// ─────────────────────────────────────────────────────────────────────────────

import { getAdminFirestore } from './firebaseAdmin';

const COLLECTION = 'processed_messages';

export interface IdempotencyResult {
  /** True if this exact messageId was already recorded — the caller
   *  should skip real processing and return success immediately. */
  alreadyProcessed: boolean;
}

/**
 * Atomically claims a messageId for processing. Real semantics: two
 * concurrent requests with the same messageId can both reach this
 * function, but Firestore's own create() guarantees only one of them
 * ever succeeds — the other gets a real ALREADY_EXISTS error, which
 * this function turns into `alreadyProcessed: true` rather than
 * letting the raw Firestore error bubble up as a real 500.
 *
 * Real, deliberate ordering: call this BEFORE doing any real
 * processing (writing the actual event, showing a notification,
 * mutating case data) — claiming the messageId first, then processing,
 * means a crash mid-processing after a successful claim could still
 * theoretically drop an event. That's a real, accepted tradeoff over
 * the alternative (claim after processing), which would let a
 * redelivered event double-process every time the first attempt's
 * response was lost in transit before the Engine saw it — a webhook
 * redelivery is the far more common real failure mode than a mid-
 * request server crash, so this optimizes for the case that will
 * actually happen.
 *
 * @param eventType  A short, real event-type tag ('cassette-dispatch-
 *                    outcome', 'block-exception', 'material-location')
 *                    stored alongside the claim for real observability
 *                    — messageId alone is opaque to a human reading
 *                    the collection directly in the Firestore console.
 */
export async function claimMessageId(messageId: string, eventType: string): Promise<IdempotencyResult> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(messageId);

  try {
    await ref.create({
      eventType,
      claimedAt: new Date().toISOString(),
    });
    return { alreadyProcessed: false };
  } catch (err: any) {
    // Real, specific Firestore error code for "document already
    // exists" — code 6 (ALREADY_EXISTS) per the Admin SDK's own gRPC
    // status mapping. Any other error is a real, unexpected failure
    // (permissions, network, malformed project config) and should NOT
    // be swallowed as "already processed" — that would silently drop
    // real events on the floor whenever Firestore itself is unhealthy.
    if (err?.code === 6 || err?.code === 'already-exists') {
      return { alreadyProcessed: true };
    }
    throw err;
  }
}

// Batch 545 (finding F10): the two engine webhooks that change a case
// (block-exception, material-location) no longer claim here first: they
// claim inside the case update's own transaction (applyEngineCaseUpdate.ts),
// so a 404 or a crash leaves no claim.
//
// Batch 549 (F10, the remaining two, open since Batch 545): the other two
// webhooks don't claim first any more either. cassette-dispatch-outcome
// writes its record with createWithClaim below, and engraver-status claims
// inside upsertEngraverStatus's transaction. A crash between the claim and
// the write can no longer lose the event: both are written together or
// neither is. claimMessageId stays for callers that have nothing to write.

/**
 * Writes one new document and claims `messageId`, in one transaction (Batch
 * 549). A messageId already claimed, or a record already there, writes
 * nothing new and returns `alreadyProcessed: true`, so a redelivery is
 * answered as before.
 */
export async function createWithClaim(
  messageId: string, eventType: string, collection: string, docId: string, data: Record<string, unknown>,
): Promise<IdempotencyResult> {
  const db = getAdminFirestore();
  const claimRef = db.collection(COLLECTION).doc(messageId);
  const ref = db.collection(collection).doc(docId);
  return db.runTransaction(async (tx: any): Promise<IdempotencyResult> => {
    if ((await tx.get(claimRef)).exists) return { alreadyProcessed: true };
    // A record already written under this id with no claim (written before the
    // claim existed, or after processed_messages was cleaned up) is the same
    // message: claim it and answer "already processed", rather than failing
    // on create() and leaving the engine retrying for ever.
    if ((await tx.get(ref)).exists) {
      tx.create(claimRef, { eventType, claimedAt: new Date().toISOString() });
      return { alreadyProcessed: true };
    }
    tx.create(ref, data);
    tx.create(claimRef, { eventType, claimedAt: new Date().toISOString() });
    return { alreadyProcessed: false };
  });
}
