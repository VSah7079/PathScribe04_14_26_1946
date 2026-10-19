// src/services/outboundQueue/outboundQueueView.ts
// Batch 619 (PS-800): the pure rules of the Outbound Queue screen: a message's
// state, the rows, filtering, sorting and counting, and which actions a state
// allows. No I/O.
import type { DeadlineStatus } from '../deliverySchedules/deliverySchedule';
import {
  OUTBOUND_FEEDS, OUTBOUND_STATES,
  type DeadlineFlag, type OutboundAction, type OutboundActionRefusal, type OutboundActionResult, type OutboundCounts, type OutboundDeadlineCounts, type NotReportableReason, type OutboundBillingCounts, type OutboundBillingDetail, type RetractReason, type OutboundDestination, type OutboundFeed, type OutboundFeedEntry, type OutboundHold,
  type OutboundQueueFilter, type OutboundQueueItem, type OutboundQueueSort, type OutboundState,
} from './outboundQueueTypes';

export const DESTINATION_OF: Readonly<Record<OutboundFeed, OutboundDestination>> = {
  result: 'interfaceEngine', patient_adt: 'interfaceEngine', accession: 'interfaceEngine', cytology_result: 'interfaceEngine',
  referral: 'interfaceEngine', molecular_order: 'interfaceEngine', lis_sync: 'lisPartner', billing: 'billingSystem', report_delivery: 'deliveryService', registry: 'registry',
};

export const makeRef = (feed: OutboundFeed, id: string): string => `${feed}:${id}`;

/** Splits a ref back into feed and id; null when it isn't one. */
export function parseRef(ref: string): { feed: OutboundFeed; id: string } | null {
  const at = ref.indexOf(':');
  if (at < 1) return null;
  const feed = ref.slice(0, at) as OutboundFeed;
  const id = ref.slice(at + 1);
  return (OUTBOUND_FEEDS as readonly string[]).includes(feed) && id ? { feed, id } : null;
}

/** The state shown for an entry. Closed as not reportable wins; then the registry's rejection; a hold wins over waiting and failed; a sent message is never shown held. */
export function stateOf(entry: Pick<OutboundFeedEntry, 'status' | 'acknowledgedAt' | 'maxRetriesExceeded' | 'rejection' | 'billing'>, held: boolean, closed?: 'notReportable' | 'retracted'): OutboundState {
  if (closed) return closed;
  if (entry.billing?.retraction) return 'retracted';
  if (entry.rejection) return 'rejected';
  if (entry.status === 'SENT') return entry.acknowledgedAt ? 'acknowledged' : 'sent';
  if (held) return 'held';
  if (entry.status === 'FAILED') return entry.maxRetriesExceeded ? 'deadLettered' : 'failed';
  return 'waiting';
}

/** States whose message still has to go (or be fixed), so a deadline matters. */
const OPEN_STATES: ReadonlySet<OutboundState> = new Set<OutboundState>(['waiting', 'held', 'failed', 'deadLettered', 'rejected']);

/**
 * The deadline flag shown for a message. The status itself (days from sign-out, near and overdue) is the delivery
 * schedule's own `deadlineStatus` (services/deliverySchedules); this only maps it to the queue's flag and leaves
 * messages that are no longer open unflagged. Pure.
 */
export function deadlineFlagOf(status: DeadlineStatus | undefined, state: OutboundState): { dueAt: string; flag: DeadlineFlag } | undefined {
  if (!status || status.state === 'none' || !status.dueAt) return undefined;
  const flag: DeadlineFlag = !OPEN_STATES.has(state) ? 'ok' : status.state === 'overdue' ? 'overdue' : status.state === 'near' ? 'dueSoon' : 'ok';
  return { dueAt: status.dueAt, flag };
}

export interface ItemContext {
  hold?: OutboundHold;
  accessionNumber?: string;
  facilityId?: string;
  /** The schedule's time for this message, when a delivery schedule applies. */
  scheduledFor?: string;
  /** Where the message stands against its reporting deadline: the schedule's `deadlineStatus`. */
  deadline?: DeadlineStatus;
  /** The original message an amended report's re-queue replaces. */
  amendsRef?: string;
}

export function toItem(feed: OutboundFeed, e: OutboundFeedEntry, ctx: ItemContext = {}): OutboundQueueItem {
  const hold = ctx.hold ?? (e.hold ? { ref: makeRef(feed, e.id), ...e.hold } : undefined);
  const closed = hold?.closed;
  const isHold = !!hold && !closed && !hold.override;
  const state = stateOf(e, isHold, closed);
  const deadline = deadlineFlagOf(ctx.deadline, state);
  const billing: OutboundBillingDetail | undefined = feed === 'billing' || e.billing
    ? {
      ...e.billing,
      ...(ctx.scheduledFor && !e.billing?.scheduledReleaseAt ? { scheduledReleaseAt: ctx.scheduledFor } : {}),
      ...(hold?.override ? { overriddenBy: hold.heldBy } : {}),
      ...(closed === 'retracted' && !e.billing?.retraction ? { retraction: { reasonCode: hold!.reason as RetractReason } } : {}),
    }
    : undefined;
  return {
    ref: makeRef(feed, e.id), feed, id: e.id, destination: DESTINATION_OF[feed], kind: e.kind, state,
    queuedAt: e.queuedAt, scheduledFor: ctx.scheduledFor ?? e.queuedAt, attempts: e.retryCount,
    ...(e.errorCode ? { errorCode: e.errorCode } : {}),
    ...(ctx.accessionNumber ? { accessionNumber: ctx.accessionNumber } : {}),
    ...(ctx.facilityId ? { facilityId: ctx.facilityId } : {}),
    ...(hold && state === 'held' ? { hold: { reason: hold.reason, note: hold.note, heldBy: hold.heldBy, heldAt: hold.heldAt } } : {}),
    ...(closed && hold ? { closedReason: hold.reason as NotReportableReason | RetractReason } : {}),
    ...(e.rejection ? { rejection: e.rejection } : {}),
    ...(deadline ? { deadline } : {}),
    ...(ctx.amendsRef ? { amendsRef: ctx.amendsRef } : {}),
    ...(e.transport ? { transport: e.transport } : {}),
    ...(billing ? { billing } : {}),
  };
}

export function filterItems(items: readonly OutboundQueueItem[], f: OutboundQueueFilter = {}): OutboundQueueItem[] {
  const q = f.search?.trim().toLowerCase();
  return items.filter(i =>
    (!f.feeds?.length || f.feeds.includes(i.feed)) &&
    (!f.states?.length || f.states.includes(i.state)) &&
    (!f.needsReview || !!i.billing?.needsReview) &&
    (!f.deadlines?.length || (!!i.deadline && f.deadlines.includes(i.deadline.flag))) &&
    (!f.facilityIds || (!!i.facilityId && f.facilityIds.includes(i.facilityId))) &&
    (!q || (i.accessionNumber ?? '').toLowerCase().includes(q)));
}

const STATE_ORDER: Readonly<Record<OutboundState, number>> = { rejected: 0, deadLettered: 1, failed: 2, held: 3, waiting: 4, sent: 5, acknowledged: 6, notReportable: 7, retracted: 8 };
const FLAG_ORDER: Readonly<Record<DeadlineFlag, number>> = { overdue: 0, dueSoon: 1, ok: 2 };

/** Sorted copy. Ties break on the queued time then the ref, so the order is stable. */
export function sortItems(items: readonly OutboundQueueItem[], s: OutboundQueueSort = { key: 'state', direction: 'asc' }): OutboundQueueItem[] {
  const value = (i: OutboundQueueItem): string | number =>
    s.key === 'state' ? STATE_ORDER[i.state] : s.key === 'deadline' ? (i.deadline ? FLAG_ORDER[i.deadline.flag] * 1e15 + Date.parse(i.deadline.dueAt) : 9e15) : s.key === 'attempts' ? i.attempts : s.key === 'feed' ? i.feed : i[s.key];
  const dir = s.direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const x = value(a); const y = value(b);
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return c * dir || a.queuedAt.localeCompare(b.queuedAt) || a.ref.localeCompare(b.ref);
  });
}

export function countByState(items: readonly OutboundQueueItem[]): OutboundCounts {
  const counts = Object.fromEntries(OUTBOUND_STATES.map(s => [s, 0])) as OutboundCounts;
  for (const i of items) counts[i.state] += 1;
  return counts;
}

/** The actions a state allows: hold what has not gone, release what is held, retry what failed. */
export const ACTIONS_FOR_STATE: Readonly<Record<OutboundState, readonly OutboundAction[]>> = {
  waiting: ['hold', 'retract', 'overrideRelease'], held: ['release', 'retract', 'overrideRelease'], failed: ['hold', 'retry', 'retract'], deadLettered: ['retry', 'retract'], rejected: ['retry', 'markNotReportable'], sent: [], acknowledged: [], notReportable: [], retracted: [],
};
export const allows = (state: OutboundState, action: OutboundAction): boolean => ACTIONS_FOR_STATE[state].includes(action);

/** Retracting and forcing an immediate release are billing's: no other feed has charges to cancel or a release to force. */
const BILLING_ONLY: ReadonlySet<OutboundAction> = new Set<OutboundAction>(['retract', 'overrideRelease']);
/** Whether this item can take the action: its state allows it, and billing-only actions are for billing items. */
export const itemAllows = (item: Pick<OutboundQueueItem, 'state' | 'feed'>, action: OutboundAction): boolean =>
  allows(item.state, action) && (!BILLING_ONLY.has(action) || item.feed === 'billing');

/** The facilities that appear in the items, sorted, for the filter's picker. */
export const facilitiesIn = (items: readonly OutboundQueueItem[]): string[] =>
  [...new Set(items.map(i => i.facilityId).filter((f): f is string => !!f))].sort();

/** How many messages are overdue and due soon (counts tile). */
export function countDeadlines(items: readonly OutboundQueueItem[]): OutboundDeadlineCounts {
  const counts = { dueSoon: 0, overdue: 0 };
  for (const i of items) if (i.deadline && i.deadline.flag !== 'ok') counts[i.deadline.flag] += 1;
  return counts;
}

/** The message an item's amended re-queue replaces, and the re-queues that amend it, for the "linked" display. */
export function linkedRefs(items: readonly OutboundQueueItem[], ref: string): { amends?: string; amendedBy: string[] } {
  const item = items.find(i => i.ref === ref);
  return { amends: item?.amendsRef, amendedBy: items.filter(i => i.amendsRef === ref).map(i => i.ref) };
}

/** How a bulk action went: how many changed and how many were refused for each reason. */
export interface ActionSummary { succeeded: number; refused: Partial<Record<OutboundActionRefusal, number>> }
export function summarizeResults(results: readonly OutboundActionResult[]): ActionSummary {
  const refused: ActionSummary['refused'] = {};
  let succeeded = 0;
  for (const r of results) {
    if (r.ok) succeeded += 1;
    else { const k = r.refusal ?? 'failed'; refused[k] = (refused[k] ?? 0) + 1; }
  }
  return { succeeded, refused };
}

/** The selected refs that can take the action, so the screen can say "3 of 5 can be released". */
export const refsAllowing = (items: readonly OutboundQueueItem[], selected: ReadonlySet<string>, action: OutboundAction): string[] =>
  items.filter(i => selected.has(i.ref) && itemAllows(i, action)).map(i => i.ref);

/** How many billing items wait for a person: parked for review, and delta charges from amended cases (counts tile). */
export function countBilling(items: readonly OutboundQueueItem[]): OutboundBillingCounts {
  const counts = { needsReview: 0, amendmentDelta: 0 };
  for (const i of items) {
    if (i.feed !== 'billing' || i.state === 'retracted' || i.state === 'sent' || i.state === 'acknowledged') continue;
    if (i.billing?.needsReview) counts.needsReview += 1;
    if (i.billing?.amendmentDelta) counts.amendmentDelta += 1;
  }
  return counts;
}
