// src/services/outboundQueue/registryFeedAdapter.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800, Pete Oct 19): the registry submissions as a feed of the
// Outbound Queue screen. A central registry answers a submission with an
// acknowledgement; one that carries validation errors comes back as
// "rejected" and waits here for a coder or pathologist to fix and resubmit it
// (or to mark it not reportable). The acknowledgement updates the entry's
// status (registryStatus), which is what makes it "rejected" or
// "acknowledged" on the screen: the engine/server reports, PathScribe records.
//
// Only the registry's fixed error CODES are carried to the screen. The
// registry's message text and locations can quote patient data and stay in
// the submission record (Registry Exceptions screen).
// The correction due date comes from the registry; the demo's registries give
// none, so the demo allows CORRECTION_DAYS from the acknowledgement. The
// transport kind (REST + mTLS, SFTP, portal upload) is a destination label only.
// ─────────────────────────────────────────────────────────────────────────────
import type { ICancerRegistryOutboundQueueService } from '../cancerRegistry/ICancerRegistryOutboundQueueService';
import type { CancerRegistryOutboundQueueEntry } from '@/types/case/CancerRegistryOutboundQueueEntry';
import type { OutboundErrorCode, OutboundFeedEntry, OutboundTransport, ResubmitReason } from './outboundQueueTypes';

export interface IRegistryFeedAdapter {
  list(): Promise<OutboundFeedEntry[]>;
  /** Puts a rejected (or failed) submission back to waiting, with the reason it is resubmitted. False when it is gone or can't be. */
  resubmit(id: string, reason?: ResubmitReason): Promise<boolean>;
}

export const CORRECTION_DAYS = 14;
const DAY_MS = 86_400_000;

type Row = CancerRegistryOutboundQueueEntry;

/** The registry entry in the common shape. Pure. */
export function registryEntryToFeedEntry(e: Row, defaultTransport: OutboundTransport = 'restMtls', amendsId?: string): OutboundFeedEntry {
  const transport: OutboundTransport = e.transport ?? defaultTransport;
  const acks = e.acknowledgements ?? [];
  const last = acks[acks.length - 1];
  const rejected = e.registryStatus === 'rejectedRecoverable' || e.registryStatus === 'rejectedFatal';
  const accepted = e.registryStatus === 'accepted' || e.registryStatus === 'acceptedWithWarnings';
  const codes = [...new Set((last?.findings ?? []).filter(f => f.severity === 'FATAL' || f.severity === 'CRITICAL_REJECT').map(f => f.code ?? 'UNCODED'))].sort();
  return {
    id: e.id, status: e.status, queuedAt: e.queuedAt, lastAttemptAt: e.lastAttemptAt,
    errorCode: e.errorCode === 'DISPATCH_TIMEOUT' || e.errorCode === 'DISPATCH_UNREACHABLE' || e.errorCode === 'DISPATCH_REJECTED' ? (e.errorCode as OutboundErrorCode) : undefined,
    retryCount: e.retryCount, maxRetriesExceeded: e.maxRetriesExceeded, caseId: e.caseId, kind: e.registryId,
    // The demo's queue holds no sign-out time; the submission is queued at sign-out, so that stands in.
    signedOutAt: e.queuedAt, transport,
    ...(amendsId ? { amendsId } : {}),
    // Batch 620 (part E): the US ePath state profile parked it for a person (fixed codes only).
    ...(e.errorCode === 'HOLD_EPATH_PROFILE' ? { registryReview: { codes: e.reviewCodes ?? [] } } : {}),
    ...(accepted && last ? { acknowledgedAt: last.receivedAt } : {}),
    ...(rejected ? { rejection: { errorCodes: codes, fatal: e.registryStatus === 'rejectedFatal', rejectedAt: last?.receivedAt ?? e.queuedAt, correctionDueAt: new Date(Date.parse(last?.receivedAt ?? e.queuedAt) + CORRECTION_DAYS * DAY_MS).toISOString() } } : {}),
  };
}

/**
 * An amended report is queued again for the same case and registry: the later submission is a new item that amends the
 * one before it. The server names the link itself (OUTBOUND_QUEUE_API.md); the demo derives it from the order they were queued. Pure.
 */
export function linkAmendments(rows: readonly Row[]): { row: Row; amendsId?: string }[] {
  const previous = new Map<string, Row>();
  return [...rows].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt) || a.id.localeCompare(b.id)).map(row => {
    const key = `${row.caseId}|${row.registryId}`;
    const before = previous.get(key);
    previous.set(key, row);
    return before ? { row, amendsId: before.id } : { row };
  });
}

export function createMockRegistryFeedAdapter(queue: Pick<ICancerRegistryOutboundQueueService, 'getAll' | 'retryDispatch' | 'setRegistryStatus'>): IRegistryFeedAdapter {
  return {
    async list() {
      const all = await queue.getAll();
      return all.ok ? linkAmendments(all.data).map(e => registryEntryToFeedEntry(e.row, 'restMtls', e.amendsId)) : [];
    },
    async resubmit(id) {
      const r = await queue.retryDispatch(id);
      if (!r.ok) return false;
      return (await queue.setRegistryStatus(id, 'awaitingAck')).ok;
    },
  };
}
