// src/services/outboundQueue/billingFeedAdapter.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800): the billing charges as a feed of the Outbound Queue
// screen, and the interface a billing implementation plugs in through (Pete,
// Oct 19: billing release runs through this queue). A billing fork supplies a
// version of IBillingFeedAdapter and the queue does not change: it lists the
// charges in the common shape and asks the adapter to hold, release, retry or
// retract one. The adapter owns the charge's own state (billing holds, the
// release, the retraction and their audit trail on the billing side); the queue
// shows it and audits the person's action.
//
// What a billing item carries (OutboundBillingDetail, all optional): billingType
// (TC, 26, Global), scheduledReleaseAt (the delivery schedule's time, from
// evaluateSchedule), overriddenBy (a user id, when staff forced an immediate
// release), needsReview (an unmapped CPT code, a missing technical-component
// facility, or an amendment delta) and amendmentDelta (a delta charge from an
// amended case, always routed to review), and a retraction reason code.
// The adapter reports these; the queue never works them out.
//
// The demo's adapter reads the existing charge queue
// (billing/IOutboundChargeQueueService.ts) and keeps hold, override and
// retraction in the hold store (outboundHoldStore.ts), because the charge queue
// has no such states of its own. Error text is never carried; only fixed codes.
// ─────────────────────────────────────────────────────────────────────────────
import type { IOutboundChargeQueueService } from '../billing/IOutboundChargeQueueService';
import type { IOutboundHoldStore } from './outboundHoldStore';
import type { HoldReason, OutboundFeedEntry, RetractReason } from './outboundQueueTypes';

export interface IBillingFeedAdapter {
  /** Every charge in the common shape, with its billing detail. */
  listBillingItems(): Promise<OutboundFeedEntry[]>;
  /** Stops the charge going out until it is released. False when it is gone or already went. */
  hold(id: string, reason: HoldReason, note: string | undefined, heldBy: string): Promise<boolean>;
  /** Lets a held charge go again; with `overriddenBy` (a user id) it is released NOW, ahead of its schedule. */
  release(id: string, options?: { overriddenBy?: string }): Promise<boolean>;
  /** Moves a failed charge back to waiting. False when the charge is gone or can't be retried. */
  retry(id: string): Promise<boolean>;
  /** Cancels a charge that has not been released because its case was amended or retracted. Terminal. */
  retract(id: string, reason: RetractReason, retractedBy: string): Promise<boolean>;
}

/** The charge types the demo's charge queue carries. */
const TYPES = new Set(['TC', '26', 'Global']);

export function createMockBillingFeedAdapter(
  charges: Pick<IOutboundChargeQueueService, 'getAll' | 'retryDispatch'>,
  store: IOutboundHoldStore,
  now: () => string = () => new Date().toISOString(),
): IBillingFeedAdapter {
  const exists = async (id: string) => { const all = await charges.getAll(); return all.ok ? all.data.find(c => c.id === id) : undefined; };
  return {
    async listBillingItems() {
      const all = await charges.getAll();
      if (!all.ok) return [];
      return all.data.map(c => ({
        id: c.id, status: c.status, queuedAt: c.queuedAt, lastAttemptAt: c.lastAttemptAt, errorCode: c.errorCode,
        retryCount: c.retryCount, maxRetriesExceeded: c.maxRetriesExceeded, caseId: c.caseId, kind: c.billingType,
        billing: {
          ...(TYPES.has(c.billingType) ? { billingType: c.billingType } : {}),
          // A charge that failed for missing coding data waits for a person.
          ...(c.errorCode === 'MISSING_ICD10' || c.errorCode === 'MISSING_PROVIDER_NPI' ? { needsReview: 'unmappedCpt' as const } : {}),
        },
      }));
    },
    async hold(id, reason, note, heldBy) {
      const c = await exists(id);
      if (!c || c.status === 'SENT') return false;
      await store.put({ ref: `billing:${id}`, reason, note, heldBy, heldAt: now() });
      return true;
    },
    async release(id, options) {
      const c = await exists(id);
      if (!c || c.status === 'SENT') return false;
      await store.remove(`billing:${id}`);
      // An override is recorded by user id; the charge then goes on the next sweep without waiting for its schedule.
      if (options?.overriddenBy) await store.put({ ref: `billing:${id}`, override: true, reason: 'other', heldBy: options.overriddenBy, heldAt: now() });
      return true;
    },
    async retry(id) { return (await charges.retryDispatch(id)).ok; },
    async retract(id, reason, retractedBy) {
      const c = await exists(id);
      if (!c || c.status === 'SENT') return false;
      await store.put({ ref: `billing:${id}`, closed: 'retracted', reason, heldBy: retractedBy, heldAt: now() });
      return true;
    },
  };
}
