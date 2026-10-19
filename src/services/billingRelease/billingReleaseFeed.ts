// src/services/billingRelease/billingReleaseFeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800): plugs the billing release rules into the Outbound Queue's billing feed
// (outboundQueue/billingFeedAdapter.ts) without changing the queue. It wraps any IBillingFeedAdapter:
//
//   listBillingItems  adds, to each charge still waiting, what the rules say: scheduledReleaseAt,
//                     needsReview (unmapped CPT, missing technical facility, amendment delta) and
//                     amendmentDelta; a charge the rules do not yet release is shown as held by the
//                     rule (reason billingReview, held by 'system') until its time, until a person
//                     reviews it, or until a person releases it.
//   release           with `overriddenBy` the charge goes now, ahead of the rules; recorded by user id.
//   hold / retry / retract   pass straight through.
//
// Everything is injected, so the wrapper is tested without the app. Facts come from the case and ledger
// (billingReleaseFacts.ts for the demo; the API server supplies them in production).
// ─────────────────────────────────────────────────────────────────────────────
import type { IBillingFeedAdapter } from '../outboundQueue/billingFeedAdapter';
import type { IOutboundHoldStore } from '../outboundQueue/outboundHoldStore';
import type { OutboundFeedEntry } from '../outboundQueue/outboundQueueTypes';
import { decideRelease, planAmendment, type BillingChargeFacts, type BillingReleaseRule } from './billingRelease';
import type { RetractReason } from '../outboundQueue/outboundQueueTypes';

export interface BillingReleaseFeedDeps {
  rules: () => Promise<BillingReleaseRule[]>;
  /** What the rules need to know about a charge; undefined when it can't be worked out (the charge then follows the built-in default). */
  facts: (entry: OutboundFeedEntry) => Promise<BillingChargeFacts | undefined>;
  holds: IOutboundHoldStore;
  now: () => string;
}

/** The system's own hold: a rule has not released the charge yet. */
export const RULE_HELD_BY = 'system';

export function withBillingRelease(inner: IBillingFeedAdapter, deps: BillingReleaseFeedDeps): IBillingFeedAdapter {
  return {
    ...inner,
    async listBillingItems() {
      const [items, rules, holds] = await Promise.all([inner.listBillingItems(), deps.rules(), deps.holds.all()]);
      const overrides = new Map(holds.filter(h => h.override).map(h => [h.ref, h.heldBy]));
      const now = new Date(deps.now());
      const out: OutboundFeedEntry[] = [];
      for (const item of items) {
        if (item.status !== 'QUEUED') { out.push(item); continue; }
        const facts = await deps.facts(item);
        const type = item.billing?.billingType;
        if (!facts || !type) { out.push(item); continue; }
        const d = decideRelease(rules, facts, now);
        const overriddenBy = overrides.get(`billing:${item.id}`);
        const billing = {
          ...item.billing,
          ...(d.scheduledReleaseAt ? { scheduledReleaseAt: d.scheduledReleaseAt } : {}),
          ...(d.needsReview ? { needsReview: d.needsReview } : {}),
          ...(facts.amendmentDelta ? { amendmentDelta: true } : {}),
          ...(overriddenBy ? { overriddenBy } : {}),
        };
        const ruleHeld = !overriddenBy && !item.hold && d.state !== 'due';
        out.push({ ...item, billing, ...(ruleHeld ? { hold: { reason: 'billingReview' as const, heldBy: RULE_HELD_BY, heldAt: item.queuedAt } } : {}) });
      }
      return out;
    },
  };
}

export interface AmendmentOutcome { retracted: string[]; alreadySent: string[] }

/**
 * A case was amended or retracted: its charges that have not gone are cancelled (retracted, with the reason), and the ones that
 * already went are named so the credit flow corrects them. A delta charge for the amendment is queued by that flow and arrives
 * in review (amendmentDelta).
 */
export async function retractQueuedCharges(adapter: IBillingFeedAdapter, caseId: string, reason: RetractReason, retractedBy: string): Promise<AmendmentOutcome> {
  const plan = planAmendment(caseId, await adapter.listBillingItems());
  const retracted: string[] = [];
  for (const id of plan.retract) if (await adapter.retract(id, reason, retractedBy)) retracted.push(id);
  return { retracted, alreadySent: plan.alreadySent };
}
