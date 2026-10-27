// src/services/batchRegistryFeed/screeningRegistryFeed.ts
// Batch 620 part S (PS-800): the batch file programmes' submissions on the Outbound Queue screen. They wait in the cytology registry
// queue until their file is made; the screen shows them as part of the registry feed next to the cancer registry submissions, with
// the same rejected state, correction due date and amended re-queue. Their ids carry the prefix below so a retry reaches the right queue.
// Only programmes that have a batch profile are listed: the other screening registries stay on the Registry Exceptions screen.
import type { IRegistryFeedAdapter } from '../outboundQueue/registryFeedAdapter';
import { linkAmendments, registryEntryToFeedEntry } from '../outboundQueue/registryFeedAdapter';
import type { ICytologyRegistryOutboundQueueService } from '../cytology/ICytologyRegistryOutboundQueueService';
import type { CancerRegistryOutboundQueueEntry } from '@/types/case/CancerRegistryOutboundQueueEntry';
import type { OutboundFeedEntry } from '../outboundQueue/outboundQueueTypes';

export const SCREENING_ID_PREFIX = 'scr:';

type Row = CancerRegistryOutboundQueueEntry;

export function createScreeningRegistryFeedAdapter(
  queue: Pick<ICytologyRegistryOutboundQueueService, 'getAll' | 'retryDispatch'>,
  /** The screening registry ids that have a batch profile. */
  batchRegistryIds: () => Promise<ReadonlySet<string>>,
): IRegistryFeedAdapter {
  return {
    async list() {
      const [all, ids] = [await queue.getAll(), await batchRegistryIds()];
      if (all.ok !== true) return [];
      // A patient who opted out is never sent; the entry that records the exclusion is not a submission.
      const rows = all.data.filter(e => ids.has(e.registryId) && e.errorCode !== 'EXCLUDED_BY_CONSENT' && e.errorCode !== 'NOT_ELIGIBLE') as unknown as Row[];
      return linkAmendments(rows).map(({ row, amendsId }): OutboundFeedEntry => ({
        ...registryEntryToFeedEntry(row, 'sftp', amendsId ? SCREENING_ID_PREFIX + amendsId : undefined),
        id: SCREENING_ID_PREFIX + row.id, kind: `screening:${row.registryId}`,
      }));
    },
    // Back in the queue for the next file; nothing is sent from here.
    async resubmit(id) {
      if (!id.startsWith(SCREENING_ID_PREFIX)) return false;
      return (await queue.retryDispatch(id.slice(SCREENING_ID_PREFIX.length))).ok === true;
    },
  };
}

/** The cancer registry adapter and the batch programmes' adapter as the one registry feed. */
export function combineRegistryFeedAdapters(cancer: IRegistryFeedAdapter, screening: IRegistryFeedAdapter): IRegistryFeedAdapter {
  return {
    async list() { return [...(await cancer.list()), ...(await screening.list())]; },
    resubmit: (id, reason) => (id.startsWith(SCREENING_ID_PREFIX) ? screening.resubmit(id, reason) : cancer.resubmit(id, reason)),
  };
}
