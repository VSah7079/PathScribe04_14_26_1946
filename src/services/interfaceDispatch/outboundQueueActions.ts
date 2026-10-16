// src/services/interfaceDispatch/outboundQueueActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 518 (PS-122): the actions on a failed or waiting outbound interface
// message, for every queue (outboundQueueAdapters.ts):
//
//   • dispatch   send a waiting message now
//   • resend     retry a failed one (records the retry, then sends)
//   • simulate   mark a waiting message failed (a testing aid, never a send)
//   • capa       raise the failure into the CAPA lifecycle
//
// Sending, resending and simulating each need interface:outbound:resend,
// checked here (before this batch anyone who could open Audit Log →
// Interfaces could resend). Raising a CAPA goes through the deficiency
// service as before.
//
// A send builds the message, posts it (dispatchInterfaceMessage) and marks
// the entry SENT only on success; otherwise FAILED with the real reason.
// Moved here from OutboundInterfaceDlqSection.tsx, which only renders now.
// Dependencies are passed in, so tests need no module mocks.
// ─────────────────────────────────────────────────────────────────────────────
import type { InterfaceDispatchResult, InterfaceTransactionType } from './dispatchInterfaceMessage';
import type { OutboundQueueAdapter, OutboundQueueEntry, OutboundQueueType } from './outboundQueueAdapters';
import { simulateInterfaceDispatchFailure } from '../hl7/simulateInterfaceDispatchFailure';

export const OUTBOUND_RESEND_CAPABILITY = 'interface:outbound:resend';

export type OutboundActionOutcome =
  | 'sent'           // the receiver accepted it
  | 'failed'         // the receiver refused it or couldn't be reached; the entry is FAILED with the reason
  | 'held'           // it can't be sent yet (a result without its report PDF); FAILED with that reason
  | 'notBuildable'   // the message couldn't be built (a referenced record is gone); FAILED
  | 'marked'         // a simulated failure was recorded
  | 'notPermitted'   // no interface:outbound:resend
  | 'notFound';      // no such entry in that queue

export interface OutboundActionDeps {
  adapter: (queue: OutboundQueueType) => Promise<OutboundQueueAdapter>;
  dispatch: (entryId: string, type: InterfaceTransactionType, payload: object) => Promise<InterfaceDispatchResult>;
  enforce: (capability: string, context?: { caseId?: string }) => Promise<{ allowed: boolean }>;
  raiseDeficiency: (input: { caseId: string; deficiencyTypeId: string; comment: string; raisedBy: string }) => Promise<unknown>;
}

async function findEntry(adapter: OutboundQueueAdapter, entryId: string): Promise<OutboundQueueEntry | undefined> {
  const all = await adapter.getAll();
  return all.ok ? all.data.find(e => e.id === entryId) : undefined;
}

/** Builds and sends one entry's message, and marks it SENT or FAILED. No permission check: callers check. */
async function send(adapter: OutboundQueueAdapter, entry: OutboundQueueEntry, deps: OutboundActionDeps): Promise<OutboundActionOutcome> {
  const type = adapter.transactionType(entry);
  const payload = type ? await adapter.buildPayload(entry) : null;
  if (!type || !payload) {
    await adapter.markFailed(entry.id, { errorCode: 'DISPATCH_REJECTED', errorMessage: 'Could not build the message for this entry: a referenced patient, case or record may no longer exist.', maxRetriesExceeded: false });
    return 'notBuildable';
  }
  if ('held' in payload) {
    await adapter.markFailed(entry.id, { errorCode: 'DISPATCH_REJECTED', errorMessage: (payload as { held: string }).held, maxRetriesExceeded: false });
    return 'held';
  }
  const result = await deps.dispatch(entry.id, type, payload);
  if (result.ok) { await adapter.markSent(entry.id); return 'sent'; }
  await adapter.markFailed(entry.id, { errorCode: result.errorCode ?? 'DISPATCH_REJECTED', errorMessage: result.error ?? 'Unknown dispatch failure.', maxRetriesExceeded: false });
  return 'failed';
}

async function permitted(deps: OutboundActionDeps, adapter: OutboundQueueAdapter, entry: OutboundQueueEntry): Promise<boolean> {
  const { allowed } = await deps.enforce('interface:outbound:resend', { caseId: adapter.subjectId(entry) });
  return allowed;
}

/** Sends a waiting message now. */
export async function dispatchOutboundEntry(queue: OutboundQueueType, entryId: string, deps: OutboundActionDeps): Promise<OutboundActionOutcome> {
  const adapter = await deps.adapter(queue);
  const entry = await findEntry(adapter, entryId);
  if (!entry) return 'notFound';
  if (!(await permitted(deps, adapter, entry))) return 'notPermitted';
  return send(adapter, entry, deps);
}

/** Retries a failed message: records the retry (the queue's own audit), then sends it. */
export async function resendOutboundEntry(queue: OutboundQueueType, entryId: string, deps: OutboundActionDeps): Promise<OutboundActionOutcome> {
  const adapter = await deps.adapter(queue);
  const entry = await findEntry(adapter, entryId);
  if (!entry) return 'notFound';
  if (!(await permitted(deps, adapter, entry))) return 'notPermitted';
  await adapter.retryDispatch(entry.id);
  return send(adapter, entry, deps);
}

/** Marks a waiting message failed, for testing the failure path. Never sends. */
export async function simulateOutboundFailure(queue: OutboundQueueType, entryId: string, kind: 'timeout' | 'unreachable' | 'rejected', deps: OutboundActionDeps): Promise<OutboundActionOutcome> {
  const adapter = await deps.adapter(queue);
  const entry = await findEntry(adapter, entryId);
  if (!entry) return 'notFound';
  if (!(await permitted(deps, adapter, entry))) return 'notPermitted';
  await adapter.markFailed(entry.id, simulateInterfaceDispatchFailure(kind));
  return 'marked';
}

/** Raises a failed message into the CAPA lifecycle (deficiency def-outbound-interface-dispatch-failure). */
export async function captureOutboundFailureAsCapa(queue: OutboundQueueType, entryId: string, raisedBy: string, deps: OutboundActionDeps): Promise<boolean> {
  const adapter = await deps.adapter(queue);
  const entry = await findEntry(adapter, entryId);
  if (!entry) return false;
  await deps.raiseDeficiency({
    caseId: adapter.subjectId(entry),
    deficiencyTypeId: 'def-outbound-interface-dispatch-failure',
    comment: adapter.capaLabel(entry),
    raisedBy,
  });
  return true;
}

/** The rows the Outbound view shows for a queue: failed and waiting, newest first. */
export interface OutboundRow {
  id: string;
  status: 'QUEUED' | 'FAILED';
  identifier: string;
  kind: string;
  queuedAt: string;
  errorCode?: OutboundQueueEntry['errorCode'];
  errorMessage?: string;
  retryCount: number;
  maxRetriesExceeded: boolean;
}

export async function outboundRows(queue: OutboundQueueType, deps: Pick<OutboundActionDeps, 'adapter'>): Promise<{ failed: OutboundRow[]; queued: OutboundRow[] }> {
  const adapter = await deps.adapter(queue);
  const all = await adapter.getAll();
  const entries = all.ok ? all.data : [];
  const row = (e: OutboundQueueEntry): OutboundRow => ({
    id: e.id, status: e.status as 'QUEUED' | 'FAILED', identifier: adapter.identifier(e), kind: adapter.kind(e),
    queuedAt: e.queuedAt, errorCode: e.errorCode, errorMessage: e.errorMessage, retryCount: e.retryCount, maxRetriesExceeded: e.maxRetriesExceeded,
  });
  const newestFirst = (a: OutboundQueueEntry, b: OutboundQueueEntry) => b.queuedAt.localeCompare(a.queuedAt);
  return {
    failed: entries.filter(e => e.status === 'FAILED').sort(newestFirst).map(row),
    queued: entries.filter(e => e.status === 'QUEUED').sort(newestFirst).map(row),
  };
}
