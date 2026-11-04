// src/services/outboundQueue/outboundQueueService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800): the Outbound Queue service's logic, built from its
// dependencies so tests need no module mocks (the app's wiring is
// mockOutboundQueueService.ts).
//
//   list     every feed's entries in one shape, with holds, accession numbers
//            and facilities added; filtered and sorted (outboundQueueView.ts)
//   hold     interface:outbound:hold      stop a waiting or failed message
//   release  interface:outbound:release   let a held message go again
//   retry    interface:outbound:resend    send a failed message through its own queue; a
//            registry-rejected one is fixed and resubmitted with a reason
//   markNotReportable  interface:outbound:mark-not-reportable   close a rejected message
//
// Each action checks its capability once for the whole selection (CLAUDE.md
// rule 7), changes each message independently (one result per ref), and writes
// one audit entry per message that changed. The audit text names the feed and
// the fixed reason only: no patient text, and not the hold note.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { DeadlineStatus } from '../deliverySchedules/deliverySchedule';
import type { IOutboundHoldStore } from './outboundHoldStore';
import type { IOutboundFeedSource } from './outboundFeedSources';
import type { IOutboundQueueService, OutboundQueueView } from './IOutboundQueueService';
import { countBilling, countByState, countDeadlines, itemAllows, facilitiesIn, filterItems, parseRef, sortItems, toItem } from './outboundQueueView';
import {
  HOLD_REASONS, NOT_REPORTABLE_REASONS, RESUBMIT_REASONS, RETRACT_REASONS,
  type HoldReason, type NotReportableReason, type ResubmitReason, type RetractReason, type OutboundAction, type OutboundActionRefusal, type OutboundActionResult, type OutboundFeed, type OutboundQueueItem,
} from './outboundQueueTypes';

export const OUTBOUND_HOLD_CAPABILITY = 'interface:outbound:hold';
export const OUTBOUND_RELEASE_CAPABILITY = 'interface:outbound:release';
export const OUTBOUND_RETRY_CAPABILITY = 'interface:outbound:resend';
export const OUTBOUND_NOT_REPORTABLE_CAPABILITY = 'interface:outbound:mark-not-reportable';
const NOTE_MAX = 200;

const REFUSAL_FOR: Readonly<Record<OutboundAction, OutboundActionRefusal>> = {
  hold: 'notHoldable', release: 'notHeld', retry: 'notRetryable', markNotReportable: 'notRejected', retract: 'notRetractable', overrideRelease: 'notReleasable',
};

export interface OutboundQueueServiceDeps {
  sources: () => Promise<readonly IOutboundFeedSource[]>;
  holds: IOutboundHoldStore;
  enforce: (capability: string) => Promise<{ allowed: boolean }>;
  audit: (entry: { event: string; detail: string; caseId: string | null; facilityId: string | null; user: string }) => Promise<unknown>;
  actor: () => string;
  /** The signed-in user's id: recorded as `overriddenBy` and `retractedBy`; the audit text never carries a name. */
  actorId: () => string;
  /** The facility a case belongs to (its ordering facility). */
  facilityOfCase: (caseId: string) => Promise<string | undefined>;
  /** The delivery schedule's time for a message, when a schedule applies (Batch 619's Delivery Schedules); absent means "when queued". */
  scheduledFor?: (feed: OutboundFeed, facilityId: string | undefined, kind: string, signedOutAt: string) => Promise<string | undefined>;
  /** Where a message stands against its reporting deadline: the delivery schedule's own `deadlineStatus`; absent means no deadline. */
  deadline?: (feed: OutboundFeed, facilityId: string | undefined, kind: string, signedOutAt: string) => Promise<DeadlineStatus | undefined>;
  now: () => string;
}

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const refuseAll = (refs: string[]): ServiceResult<OutboundActionResult[]> =>
  ok(refs.map(ref => ({ ref, ok: false, refusal: 'notPermitted' as const })));

export function createOutboundQueueService(deps: OutboundQueueServiceDeps): IOutboundQueueService {
  async function loadItems(): Promise<OutboundQueueItem[]> {
    const [sources, holds] = await Promise.all([deps.sources(), deps.holds.all()]);
    const heldBy = new Map(holds.map(h => [h.ref, h]));
    const facilityOf = new Map<string, Promise<string | undefined>>();
    const facility = (caseId: string) => facilityOf.get(caseId) ?? (facilityOf.set(caseId, deps.facilityOfCase(caseId)), facilityOf.get(caseId)!);
    const items: OutboundQueueItem[] = [];
    for (const source of sources) {
      for (const e of await source.list()) {
        const facilityId = e.caseId ? await facility(e.caseId) : undefined;
        const scheduledFor = deps.scheduledFor ? await deps.scheduledFor(source.feed, facilityId, e.kind, e.signedOutAt ?? e.queuedAt) : undefined;
        const deadline = deps.deadline ? await deps.deadline(source.feed, facilityId, e.kind, e.signedOutAt ?? e.queuedAt) : undefined;
        items.push(toItem(source.feed, e, {
          hold: heldBy.get(`${source.feed}:${e.id}`), accessionNumber: e.caseId, facilityId, scheduledFor, deadline,
          amendsRef: e.amendsId ? `${source.feed}:${e.amendsId}` : undefined,
        }));
      }
    }
    return items;
  }

  async function act(
    refs: string[], action: OutboundAction, check: () => Promise<{ allowed: boolean }>,
    apply: (item: OutboundQueueItem, source: IOutboundFeedSource) => Promise<OutboundActionRefusal | null>,
    auditText: (item: OutboundQueueItem) => { event: string; detail: string },
  ): Promise<ServiceResult<OutboundActionResult[]>> {
    if (!(await check()).allowed) return refuseAll(refs);
    const [items, sources] = await Promise.all([loadItems(), deps.sources()]);
    const results: OutboundActionResult[] = [];
    for (const ref of refs) {
      const parsed = parseRef(ref);
      const item = parsed ? items.find(i => i.ref === ref) : undefined;
      const source = parsed ? sources.find(s => s.feed === parsed.feed) : undefined;
      if (!item || !source) { results.push({ ref, ok: false, refusal: 'notFound' }); continue; }
      if (!itemAllows(item, action)) { results.push({ ref, ok: false, refusal: REFUSAL_FOR[action] }); continue; }
      const refusal = await apply(item, source);
      if (refusal) { results.push({ ref, ok: false, refusal }); continue; }
      const text = auditText(item);
      await deps.audit({ ...text, caseId: item.accessionNumber ?? null, facilityId: item.facilityId ?? null, user: deps.actor() });
      results.push({ ref, ok: true });
    }
    return ok(results);
  }

  return {
    async list(filter, sort): Promise<ServiceResult<OutboundQueueView>> {
      const all = await loadItems();
      const scoped = filterItems(all, { ...filter, states: undefined });
      return ok({
        items: sortItems(filterItems(all, filter), sort),
        counts: countByState(scoped),
        deadlineCounts: countDeadlines(scoped),
        billingCounts: countBilling(scoped),
        facilityIds: facilitiesIn(all),
      });
    },

    hold(refs, reason: HoldReason, note) {
      const safeReason: HoldReason = (HOLD_REASONS as readonly string[]).includes(reason) ? reason : 'other';
      const text = note?.trim().slice(0, NOTE_MAX) || undefined;
      return act(refs, 'hold', () => deps.enforce('interface:outbound:hold'), async (item, source) => {
        if (source.hold) return (await source.hold(item.id, safeReason, text, deps.actor())) ? null : 'notHoldable';
        await deps.holds.put({ ref: item.ref, reason: safeReason, note: text, heldBy: deps.actor(), heldAt: deps.now() });
        return null;
      }, item => ({ event: 'OUTBOUND_MESSAGE_HELD', detail: `Held a ${item.feed} message (reason: ${safeReason}).` }));
    },

    release(refs) {
      return act(refs, 'release', () => deps.enforce('interface:outbound:release'), async (item, source) => {
          if (source.release) return (await source.release(item.id)) ? null : 'notHeld';
          await deps.holds.remove(item.ref);
          return null;
        },
        item => ({ event: 'OUTBOUND_MESSAGE_RELEASED', detail: `Released a held ${item.feed} message.` }));
    },

    retry(refs, reason?: ResubmitReason) {
      const safe = reason && (RESUBMIT_REASONS as readonly string[]).includes(reason) ? reason : undefined;
      return act(refs, 'retry', () => deps.enforce('interface:outbound:resend'), async (item, source) => {
        // A rejected message goes back only with the reason it was fixed for.
        if (item.state === 'rejected' && !safe) return 'reasonRequired';
        const r = await source.retry(item.id, item.state === 'rejected' ? safe : undefined);
        if (r === 'ok' && item.state === 'rejected') await deps.holds.remove(item.ref);
        return r === 'ok' ? null : r;
      }, item => ({
        event: item.state === 'rejected' ? 'OUTBOUND_MESSAGE_RESUBMITTED' : 'OUTBOUND_MESSAGE_RETRIED',
        detail: item.state === 'rejected'
          ? `Resubmitted a ${item.feed} message the receiver rejected (${item.rejection?.errorCodes.length ?? 0} error codes; reason: ${safe}).`
          : `Retried a ${item.feed} message from the Outbound Queue (attempt ${item.attempts + 1}).`,
      }));
    },

    retract(refs, reason: RetractReason) {
      const safe: RetractReason = (RETRACT_REASONS as readonly string[]).includes(reason) ? reason : 'other';
      return act(refs, 'retract', () => deps.enforce('interface:outbound:retract'), async (item, source) => {
        if (!source.retract) return 'notRetractable';
        return (await source.retract(item.id, safe, deps.actorId())) ? null : 'notRetractable';
      }, item => ({ event: 'OUTBOUND_CHARGE_RETRACTED', detail: `Retracted a queued ${item.billing?.billingType ?? ''} ${item.feed} charge before release (reason: ${safe}).`.replace('  ', ' ') }));
    },

    overrideRelease(refs) {
      return act(refs, 'overrideRelease', () => deps.enforce('interface:outbound:override-release'), async (item, source) => {
        if (!source.release) return 'notReleasable';
        return (await source.release(item.id, { overriddenBy: deps.actorId() })) ? null : 'notReleasable';
      }, item => ({ event: 'OUTBOUND_CHARGE_RELEASE_OVERRIDDEN', detail: `Released a ${item.billing?.billingType ?? ''} ${item.feed} charge immediately, ahead of its schedule.`.replace('  ', ' ') }));
    },

    markNotReportable(refs, reason: NotReportableReason, note) {
      const safe: NotReportableReason = (NOT_REPORTABLE_REASONS as readonly string[]).includes(reason) ? reason : 'other';
      const text = note?.trim().slice(0, NOTE_MAX) || undefined;
      return act(refs, 'markNotReportable', () => deps.enforce('interface:outbound:mark-not-reportable'), async item => {
        await deps.holds.put({ ref: item.ref, closed: 'notReportable', reason: safe, note: text, heldBy: deps.actor(), heldAt: deps.now() });
        return null;
      }, item => ({ event: 'OUTBOUND_MESSAGE_NOT_REPORTABLE', detail: `Marked a rejected ${item.feed} message not reportable (reason: ${safe}).` }));
    },
  };
}
