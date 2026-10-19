// src/services/outboundQueue/scheduleBinding.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800): the Outbound Queue reads WHEN from the Delivery Schedules
// (services/deliverySchedules): the schedule that applies to a message (the
// performing facility's own, else the enterprise's, else the feed's default)
// gives its scheduled time and its reporting deadline in days from sign-out.
// ─────────────────────────────────────────────────────────────────────────────
import type { DeliveryScheduleEntry, DeliveryFeed } from '../deliverySchedules/deliverySchedule';
import type { DeadlineStatus } from '../deliverySchedules/deliverySchedule';
import { deadlineStatus, evaluateSchedule, resolveDeliverySchedule } from '../deliverySchedules/deliverySchedule';
import type { OutboundFeed } from './outboundQueueTypes';

/** The schedule feed a queue feed follows; the other queues have no schedule. */
export const SCHEDULE_FEED_OF: Readonly<Partial<Record<OutboundFeed, DeliveryFeed>>> = {
  result: 'results', patient_adt: 'adt', accession: 'accession', lis_sync: 'lis_sync', billing: 'billing_delivery',
  report_delivery: 'report_delivery', registry: 'registry',
};

/** A registry's key in the schedules: "cancer:<id>" (the demo's registries are cancer registries). */
export const registryKeyOf = (kind: string): string => `cancer:${kind}`;

export function createScheduleBinding(entries: () => Promise<DeliveryScheduleEntry[]>, now: () => string) {
  const resolve = async (feed: OutboundFeed, facilityId: string | undefined, kind: string) => {
    const scheduleFeed = SCHEDULE_FEED_OF[feed];
    if (!scheduleFeed) return undefined;
    return resolveDeliverySchedule(await entries(), scheduleFeed, facilityId, scheduleFeed === 'registry' ? registryKeyOf(kind) : null).schedule;
  };
  return {
    /** The time a message waiting on its schedule goes; undefined when it can go now or no schedule applies. */
    async scheduledFor(feed: OutboundFeed, facilityId: string | undefined, kind: string, signedOutAt: string): Promise<string | undefined> {
      const schedule = await resolve(feed, facilityId, kind);
      if (!schedule) return undefined;
      const d = evaluateSchedule(schedule, new Date(now()), { signedOut: true, signedOutAt });
      return d.canSendNow ? undefined : d.nextDueAt ?? undefined;
    },
    /** Where a message stands against its reporting deadline (the schedule's own `deadlineStatus`); undefined when no schedule applies or it has no deadline. */
    async deadline(feed: OutboundFeed, facilityId: string | undefined, kind: string, signedOutAt: string): Promise<DeadlineStatus | undefined> {
      const schedule = await resolve(feed, facilityId, kind);
      const signed = new Date(signedOutAt);
      if (!schedule || Number.isNaN(signed.getTime())) return undefined;
      return deadlineStatus(schedule, signed, new Date(now()));
    },
  };
}
