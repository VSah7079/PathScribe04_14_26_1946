// src/services/outboundQueue/IOutboundQueueService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800): the one Outbound Queue: every outbound message in every
// queue (results, ADT, accession, LIS sync, billing, report delivery, cytology
// results, referrals, molecular orders) in one list, with hold, release and
// retry. The demo's version reads the existing queues; the API server's
// version (httpOutboundQueueService.ts) is the server's own aggregate.
// Contract: docs/architecture/OUTBOUND_QUEUE_API.md.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type {
  HoldReason, NotReportableReason, RetractReason, OutboundActionResult, OutboundBillingCounts, OutboundCounts, OutboundDeadlineCounts, ResubmitReason, OutboundQueueFilter, OutboundQueueItem, OutboundQueueSort,
} from './outboundQueueTypes';

export interface OutboundQueueView {
  /** The rows that match, sorted. */
  items: OutboundQueueItem[];
  /** How many of each state match the feed, facility and search filters (the state filter is not applied, so the counts stay put while a state is picked). */
  counts: OutboundCounts;
  /** How many open messages are overdue or due soon against their reporting deadline (same filters as `counts`). */
  deadlineCounts: OutboundDeadlineCounts;
  /** Billing items waiting for a person: parked for review, and delta charges from amended cases (same filters as `counts`). */
  billingCounts: OutboundBillingCounts;
  /** Every facility that has a message in the queue, for the facility filter. */
  facilityIds: string[];
}

export interface IOutboundQueueService {
  list(filter?: OutboundQueueFilter, sort?: OutboundQueueSort): Promise<ServiceResult<OutboundQueueView>>;
  /** Holds each message (needs interface:outbound:hold). The reason is a pick-list value; the note is optional text with no patient detail. One result per ref. */
  hold(refs: string[], reason: HoldReason, note?: string): Promise<ServiceResult<OutboundActionResult[]>>;
  /** Releases each held message back to waiting (needs interface:outbound:release). */
  release(refs: string[]): Promise<ServiceResult<OutboundActionResult[]>>;
  /**
   * Retries each failed or dead-lettered message through its own queue (needs interface:outbound:resend).
   * A message the registry rejected is fixed and resubmitted: it needs a reason, or it is refused with reasonRequired.
   */
  retry(refs: string[], reason?: ResubmitReason): Promise<ServiceResult<OutboundActionResult[]>>;
  /** Closes each rejected message as not reportable (needs interface:outbound:mark-not-reportable). Nothing more is sent for it. */
  markNotReportable(refs: string[], reason: NotReportableReason, note?: string): Promise<ServiceResult<OutboundActionResult[]>>;
  /** Cancels each queued charge (billing items only) because its case was amended or retracted. Terminal; needs interface:outbound:retract. */
  retract(refs: string[], reason: RetractReason): Promise<ServiceResult<OutboundActionResult[]>>;
  /** Releases each queued or held charge (billing items only) NOW, ahead of its schedule; records who (a user id). Needs interface:outbound:override-release. */
  overrideRelease(refs: string[]): Promise<ServiceResult<OutboundActionResult[]>>;
}
