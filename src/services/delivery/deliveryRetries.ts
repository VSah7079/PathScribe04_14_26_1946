// src/services/delivery/deliveryRetries.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 521 (PS-281): what happens after an automatic delivery fails.
//
//   §3.2.1 Retry with backoff. A failed print job, e-fax or file drop is
//          retried after each of the lab's delays in turn (default 1, 5 and
//          15 minutes). The retries are made by a scheduled sweep
//          (runDeliveryRetrySweep), one short attempt each, never a wait
//          inside a call.
//   §3.2.2 Dead-letter and fallback. When the last retry fails, the delivery
//          is dead-lettered:
//            - it stays in its queue, marked "retries exhausted";
//            - it is listed in the delivery exception queue;
//            - Admin and Lab Director get a message (Pete's default);
//            - for a primary channel, the release's fallback channels are
//              sent, once per release.
//          A delivery fixed by hand meanwhile (resent from the Outbound view
//          or the Print Queue) is seen as delivered and not retried.
//   §3.2.3 Confirmation. A fax the gateway accepted is only "submitted"; the
//          provider's transmission report confirms it (TRANSMITTED) or fails
//          it (TRANSMISSION_FAILED). A failed transmission counts as a
//          failure, and is retried and dead-lettered the same way. Print
//          confirmations were already built (network print status, PS-54).
//
// Decisions here; the services are passed in (deliveryRetryDeps.ts).
// ─────────────────────────────────────────────────────────────────────────────
import type { DeliveryChannel } from '@/types/delivery/DeliveryRule';
import type { DeliveryReleaseContext, DeliveryRetryRecord } from '@/types/delivery/DeliveryRetryRecord';
import type { IDeliveryRetryService } from './IDeliveryRetryService';
import type { ReportDeliveryStatusEvent } from '../liveUpdates/liveUpdateContract';
import { nextAttemptAt, retryDue } from './deliveryRetryPolicy';
import type { ChannelRole } from './deliveryPlan';

export interface DeliveryRetryDeps {
  records: IDeliveryRetryService;
  /** The lab's retry delays, in minutes. */
  retryDelays(): Promise<number[]>;
  now(): Date;
  /** One more attempt; true when it went (a print dispatched, a fax or file drop accepted). */
  retry(kind: DeliveryRetryRecord['kind'], entryId: string): Promise<{ ok: boolean; error?: string }>;
  /** Whether the entry has been delivered meanwhile (resent by hand), so no retry is needed. */
  alreadyDelivered(kind: DeliveryRetryRecord['kind'], entryId: string): Promise<boolean>;
  /** Marks the queue entry "retries exhausted", with the last error. */
  markExhausted(kind: DeliveryRetryRecord['kind'], entryId: string, error: string): Promise<void>;
  /** Tells Admin and Lab Director about a dead-lettered delivery. */
  notify(record: DeliveryRetryRecord): Promise<void>;
  /** Sends the release on its fallback channels. */
  sendFallback(release: DeliveryReleaseContext, channels: DeliveryChannel[]): Promise<void>;
}

export const releaseKeyOf = (r: Pick<DeliveryReleaseContext, 'caseId' | 'reportType' | 'releasedAt'>) => `${r.caseId}|${r.reportType}|${r.releasedAt}`;

export interface ScheduleRetryInput {
  kind: DeliveryRetryRecord['kind'];
  entryId: string;
  channel: DeliveryChannel;
  role: ChannelRole;
  release: DeliveryReleaseContext;
  /** The release's fallback channels (used only when this is a primary channel). */
  fallbackChannels: DeliveryChannel[];
  error?: string;
  /** Batch 546 (F3): false when retrying can't help: straight to the exception queue and the fallback. */
  retriable?: boolean;
}

/** After a first failure: the next retry, or (no retries set) straight to the exception queue. */
export async function scheduleDeliveryRetry(input: ScheduleRetryInput, deps: DeliveryRetryDeps): Promise<DeliveryRetryRecord | null> {
  const delays = await deps.retryDelays();
  const now = deps.now();
  const next = input.retriable === false ? null : nextAttemptAt(1, delays, now);
  const created = await deps.records.create({
    kind: input.kind, entryId: input.entryId, channel: input.channel, role: input.role,
    releaseKey: releaseKeyOf(input.release), release: input.release,
    fallbackChannels: input.role === 'primary' ? input.fallbackChannels : [],
    failures: 1, status: 'scheduled', ...(next ? { nextAttemptAt: next } : {}), ...(input.error ? { lastError: input.error } : {}),
  });
  if (!created.ok) return null;
  return next ? created.data : deadLetter(created.data, deps);
}

/** Retries exhausted: mark the entry, tell Admin and Lab Director, and send the release's fallback (once per release). */
async function deadLetter(record: DeliveryRetryRecord, deps: DeliveryRetryDeps): Promise<DeliveryRetryRecord> {
  const at = deps.now().toISOString();
  await deps.markExhausted(record.kind, record.entryId, record.lastError ?? 'retries exhausted');
  let fallbackSentAt: string | undefined;
  if (record.fallbackChannels.length) {
    const all = await deps.records.getAll();
    const alreadySent = all.ok && all.data.some(r => r.releaseKey === record.releaseKey && r.fallbackSentAt);
    if (!alreadySent) {
      await deps.sendFallback(record.release, record.fallbackChannels).catch(() => undefined);
      fallbackSentAt = at;
    }
  }
  const updated = await deps.records.update(record.id, { status: 'dead_lettered', nextAttemptAt: undefined, deadLetteredAt: at, ...(fallbackSentAt ? { fallbackSentAt } : {}) });
  const final = updated.ok ? updated.data : { ...record, status: 'dead_lettered' as const, deadLetteredAt: at };
  await deps.notify(final).catch(() => undefined);
  return final;
}

/** One more failure on a record: the next retry, or dead-letter. */
async function recordFailure(record: DeliveryRetryRecord, error: string, deps: DeliveryRetryDeps): Promise<DeliveryRetryRecord> {
  const failures = record.failures + 1;
  const next = nextAttemptAt(failures, await deps.retryDelays(), deps.now());
  const updated = await deps.records.update(record.id, { failures, lastError: error, nextAttemptAt: next ?? undefined });
  const current = updated.ok ? updated.data : { ...record, failures, lastError: error };
  return next ? current : deadLetter(current, deps);
}

export interface RetrySweepResult { attempted: number; delivered: number; deadLettered: number }

let sweepInFlight: Promise<RetrySweepResult> | null = null;

/** Makes the retries that are due. Two overlapping sweeps (two windows, a slow attempt) never both run. */
export function runDeliveryRetrySweep(deps: DeliveryRetryDeps): Promise<RetrySweepResult> {
  if (!sweepInFlight) sweepInFlight = sweep(deps).finally(() => { sweepInFlight = null; });
  return sweepInFlight;
}

async function sweep(deps: DeliveryRetryDeps): Promise<RetrySweepResult> {
  const result: RetrySweepResult = { attempted: 0, delivered: 0, deadLettered: 0 };
  const all = await deps.records.getAll();
  if (!all.ok) return result;
  const now = deps.now();
  // A dead-lettered delivery resent by hand since leaves the exception queue.
  for (const record of all.data.filter(r => r.status === 'dead_lettered')) {
    if (await deps.alreadyDelivered(record.kind, record.entryId)) {
      await deps.records.update(record.id, { status: 'delivered', deliveredAt: now.toISOString() });
    }
  }
  for (const record of all.data.filter(r => r.status === 'scheduled' && retryDue(r.nextAttemptAt, now))) {
    if (await deps.alreadyDelivered(record.kind, record.entryId)) {
      await deps.records.update(record.id, { status: 'delivered', nextAttemptAt: undefined, deliveredAt: now.toISOString() });
      result.delivered++;
      continue;
    }
    result.attempted++;
    const attempt = await deps.retry(record.kind, record.entryId).catch(e => ({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    if (attempt.ok) {
      await deps.records.update(record.id, { status: 'delivered', nextAttemptAt: undefined, deliveredAt: deps.now().toISOString() });
      result.delivered++;
    } else {
      const after = await recordFailure(record, attempt.error ?? 'retry failed', deps);
      if (after.status === 'dead_lettered') result.deadLettered++;
    }
  }
  return result;
}

/** A fax provider's transmission report. TRANSMITTED confirms the delivery; TRANSMISSION_FAILED is a
 *  failure (retried, then dead-lettered). Returns what was done, or 'unknown' for an entry this lab
 *  didn't send. */
export async function applyReportDeliveryStatus(
  event: Pick<ReportDeliveryStatusEvent, 'queueEntryId' | 'status' | 'detail' | 'occurredAt'>,
  deps: DeliveryRetryDeps & {
    /** The entry's release, for a fax that went through first time (no record yet). */
    releaseOf(entryId: string): Promise<{ release: DeliveryReleaseContext; channel: DeliveryChannel; role: ChannelRole; fallbackChannels: DeliveryChannel[] } | null>;
    markTransmissionFailed(entryId: string, detail: string): Promise<void>;
  },
): Promise<'confirmed' | 'failed' | 'unknown'> {
  const all = await deps.records.getAll();
  const existing = all.ok ? [...all.data].reverse().find(r => r.kind === 'report_delivery' && r.entryId === event.queueEntryId) : undefined;
  const transmission = { status: event.status, ...(event.detail ? { detail: event.detail } : {}), at: event.occurredAt };
  if (event.status === 'TRANSMITTED') {
    if (existing) await deps.records.update(existing.id, { transmission, status: 'delivered', nextAttemptAt: undefined, deliveredAt: event.occurredAt });
    else {
      const ctx = await deps.releaseOf(event.queueEntryId);
      if (!ctx) return 'unknown';
      await deps.records.create({
        kind: 'report_delivery', entryId: event.queueEntryId, channel: ctx.channel, role: ctx.role, releaseKey: releaseKeyOf(ctx.release), release: ctx.release,
        fallbackChannels: [], failures: 0, status: 'delivered', deliveredAt: event.occurredAt, transmission,
      });
    }
    return 'confirmed';
  }
  const reason = `Fax transmission failed${event.detail ? `: ${event.detail}` : ''}`;
  await deps.markTransmissionFailed(event.queueEntryId, reason);
  if (existing) {
    await deps.records.update(existing.id, { transmission, status: 'scheduled' });
    await recordFailure({ ...existing, transmission, status: 'scheduled' }, reason, deps);
    return 'failed';
  }
  const ctx = await deps.releaseOf(event.queueEntryId);
  if (!ctx) return 'unknown';
  const scheduled = await scheduleDeliveryRetry({ kind: 'report_delivery', entryId: event.queueEntryId, ...ctx, error: reason }, deps);
  if (scheduled) await deps.records.update(scheduled.id, { transmission });
  return 'failed';
}

/** The exception queue: dead-lettered deliveries not delivered since, newest first. */
export function deliveryExceptions(records: readonly DeliveryRetryRecord[]): DeliveryRetryRecord[] {
  return records.filter(r => r.status === 'dead_lettered').sort((a, b) => (b.deadLetteredAt ?? '').localeCompare(a.deadLetteredAt ?? ''));
}

/** The roles told about a dead-lettered delivery (Pete's default, Oct 10). */
export const DELIVERY_EXCEPTION_ROLES = ['Admin', 'Lab Director'] as const;

/** Who is told: active staff holding an exception role, once each. */
export function deliveryExceptionRecipients<U extends { id: string; roles?: readonly string[]; status?: string }>(users: readonly U[]): U[] {
  return users.filter(u => (u.status ?? 'Active') === 'Active' && (u.roles ?? []).some(r => (DELIVERY_EXCEPTION_ROLES as readonly string[]).includes(r)))
    .filter((u, i, all) => all.findIndex(x => x.id === u.id) === i);
}
