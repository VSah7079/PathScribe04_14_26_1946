// src/services/cosd/cosdFeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 620 (part C, PS-800): the UK COSD correction loop on the Outbound Queue.
// A rejected UK submission is already "rejected" on the queue screen (registryFeedAdapter.ts), with the registry's fixed error
// codes. This wraps the registry feed so that, for the UK COSD registry only, the correction due date is the destination's
// working-day window counted from the rejection (5 working days unless the destination says otherwise), and the destination's
// transport is shown. Resubmitting a correction is the queue's own retry with a reason, and an amended report's linked re-queue is
// the queue's own; both pass through untouched. Every other registry is returned as it was. Pure apart from the lookups it is given.
// ─────────────────────────────────────────────────────────────────────────────
import type { IRegistryFeedAdapter } from '../outboundQueue/registryFeedAdapter';
import type { OutboundFeedEntry } from '../outboundQueue/outboundQueueTypes';
import { IMMEDIATE_SCHEDULE, deadlineStatus, type DeadlineStatus } from '../deliverySchedules/deliverySchedule';
import { resolveCosdDestination, type CosdDestination } from './cosdDestination';
import { addWorkingDays, calendarDaysBetween } from './workingDays';

/** The registry id of the UK cancer registry feed (cancerRegistryDefinitions.ts). */
export const COSD_REGISTRY_ID = 'cosd_uk';

export interface CosdFeedDeps {
  destinations: () => Promise<CosdDestination[]>;
  /** The performing facility of a case (the destination is chosen by where the work was done). */
  facilityOfCase: (caseId: string) => Promise<string | undefined>;
}

/**
 * Where a rejected submission stands against its correction due date, read through the delivery schedule's own
 * `deadlineStatus` (a deadline of that many calendar days from the rejection). Pure.
 */
export function correctionStatus(rejectedAt: Date, dueAt: Date, now: Date): DeadlineStatus {
  return deadlineStatus({ ...IMMEDIATE_SCHEDULE, reportingDeadlineDays: calendarDaysBetween(rejectedAt, dueAt) }, rejectedAt, now);
}

export function withCosdCorrection(inner: IRegistryFeedAdapter, deps: CosdFeedDeps): IRegistryFeedAdapter {
  return {
    resubmit: inner.resubmit,
    async list() {
      const entries = await inner.list();
      if (!entries.some(e => e.kind === COSD_REGISTRY_ID)) return entries;
      const stored = await deps.destinations();
      const out: OutboundFeedEntry[] = [];
      for (const e of entries) {
        if (e.kind !== COSD_REGISTRY_ID) { out.push(e); continue; }
        const facilityId = e.caseId ? await deps.facilityOfCase(e.caseId) : undefined;
        const dest = resolveCosdDestination(stored, facilityId);
        const rejectedAt = e.rejection?.rejectedAt ? new Date(e.rejection.rejectedAt) : undefined;
        const due = rejectedAt && !Number.isNaN(rejectedAt.getTime()) ? addWorkingDays(rejectedAt, dest.correctionWorkingDays, dest.nonWorkingDates).toISOString() : undefined;
        out.push({ ...e, transport: dest.transport, ...(e.rejection && due ? { rejection: { ...e.rejection, correctionDueAt: due } } : {}) });
      }
      return out;
    },
  };
}
