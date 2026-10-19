// src/services/outboundQueue/outboundFeedSources.ts
// Batch 619 (PS-800): one source per feed. A source lists its queue's entries
// in the common shape and retries one entry through the queue's own service.
// Hold and release are not here: they are the overlay (outboundHoldStore.ts).
import type { OutboundActionDeps } from '../interfaceDispatch/outboundQueueActions';
import { resendOutboundEntry } from '../interfaceDispatch/outboundQueueActions';
import { OUTBOUND_QUEUE_TYPES, type OutboundQueueType } from '../interfaceDispatch/outboundQueueAdapters';
import type { IBillingFeedAdapter } from './billingFeedAdapter';
import type { IRegistryFeedAdapter } from './registryFeedAdapter';
import type { OutboundActionRefusal, OutboundErrorCode, HoldReason, OutboundFeed, OutboundFeedEntry, ResubmitReason, RetractReason } from './outboundQueueTypes';

export interface IOutboundFeedSource {
  feed: OutboundFeed;
  list(): Promise<OutboundFeedEntry[]>;
  /** Retries one entry through its own queue's service. */
  retry(id: string, reason?: ResubmitReason): Promise<'ok' | OutboundActionRefusal>;
  /**
   * A feed that keeps its own hold, release and retraction supplies these (billing does); for the others the queue keeps
   * them as an overlay (outboundHoldStore.ts). Each answers false when the message is gone or can't take the action.
   */
  hold?(id: string, reason: HoldReason, note: string | undefined, heldBy: string): Promise<boolean>;
  release?(id: string, options?: { overriddenBy?: string }): Promise<boolean>;
  retract?(id: string, reason: RetractReason, retractedBy: string): Promise<boolean>;
}

/** The feeds whose entries name a case (the others name a patient, a batch or a barcode, which are not shown). */
export const CASE_FEEDS: ReadonlySet<OutboundFeed> = new Set<OutboundFeed>(['result', 'lis_sync', 'accession', 'cytology_result', 'report_delivery', 'billing', 'registry']);

export function createInterfaceFeedSource(queue: OutboundQueueType, deps: OutboundActionDeps): IOutboundFeedSource {
  return {
    feed: queue,
    async list() {
      const adapter = await deps.adapter(queue);
      const all = await adapter.getAll();
      if (!all.ok) return [];
      return all.data.map(e => ({
        id: e.id, status: e.status, queuedAt: e.queuedAt, errorCode: e.errorCode as OutboundErrorCode | undefined,
        retryCount: e.retryCount, maxRetriesExceeded: e.maxRetriesExceeded, kind: adapter.kind(e),
        ...(CASE_FEEDS.has(queue) ? { caseId: adapter.subjectId(e) } : {}),
      }));
    },
    async retry(id) {
      const outcome = await resendOutboundEntry(queue, id, deps);
      if (outcome === 'sent') return 'ok';
      if (outcome === 'notPermitted') return 'notPermitted';
      if (outcome === 'notFound') return 'notFound';
      return 'failed';
    },
  };
}

export function createBillingFeedSource(adapter: IBillingFeedAdapter): IOutboundFeedSource {
  return {
    feed: 'billing', list: () => adapter.listBillingItems(),
    async retry(id) { return (await adapter.retry(id)) ? 'ok' : 'notRetryable'; },
    hold: (id, reason, note, heldBy) => adapter.hold(id, reason, note, heldBy),
    release: (id, options) => adapter.release(id, options),
    retract: (id, reason, by) => adapter.retract(id, reason, by),
  };
}

export function createRegistryFeedSource(adapter: IRegistryFeedAdapter): IOutboundFeedSource {
  return { feed: 'registry', list: () => adapter.list(), async retry(id, reason) { return (await adapter.resubmit(id, reason)) ? 'ok' : 'notRetryable'; } };
}

/** The ten sources: the eight interface queues, the billing charges and the registry submissions. */
export function createFeedSources(deps: OutboundActionDeps, billing: IBillingFeedAdapter, registry: IRegistryFeedAdapter): IOutboundFeedSource[] {
  return [...OUTBOUND_QUEUE_TYPES.map(q => createInterfaceFeedSource(q, deps)), createBillingFeedSource(billing), createRegistryFeedSource(registry)];
}
