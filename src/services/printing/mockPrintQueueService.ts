// src/services/printing/mockPrintQueueService.ts
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import type { IPrintQueueService, BulkPrintJobResult } from './IPrintQueueService';
import type { PrintJob } from '@/types/printing/PrintJob';
import { auditService } from '../auditlog/auditServiceInstance';
import { printDestinationAuditText, printDestinationProblem, redirectSiteAllowed } from '../printRouting/printDestinationRules';

/** Real, per PS-279 §2.2.3 — the one, real place this app decides
 *  which real statuses a hold/cancel action may act on, reused by
 *  both the singular and bulk variants below so the rule is never
 *  duplicated. */
const HOLDABLE_STATUSES: PrintJob['status'][] = ['QUEUED', 'PRINTING', 'FAILED'];
const CANCELLABLE_STATUSES: PrintJob['status'][] = ['QUEUED', 'PRINTING', 'FAILED', 'HOLD'];

const KEY = 'print_queue_v1';

const load    = (): PrintJob[] => storageGet<PrintJob[]>(KEY, []);
const persist = (data: PrintJob[]) => storageSet(KEY, data);

const delay = () => new Promise(r => setTimeout(r, 80));
const ok  = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });

const printQueueServiceUnchecked: IPrintQueueService = {
  async getAll() {
    await delay();
    return ok(load());
  },

  async getByCaseId(caseId) {
    await delay();
    return ok(load().filter(e => e.caseId === caseId));
  },

  async getById(id) {
    await delay();
    const found = load().find(e => e.id === id);
    return found ? ok(found) : err(`Print job ${id} not found`);
  },

  async enqueue(entry) {
    await delay();
    const newEntry: PrintJob = {
      ...entry,
      id: crypto.randomUUID(),
      status: 'QUEUED',
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      maxRetriesExceeded: false,
    };
    persist([...load(), newEntry]);
    return ok(newEntry);
  },

  async getFailed() {
    await delay();
    return ok(load().filter(e => e.status === 'FAILED'));
  },

  async markFailed(id, failure) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Print job ${id} not found`);
    const prior = all[idx];
    const updated: PrintJob = {
      ...prior,
      status: 'FAILED',
      errorCode: failure.errorCode,
      errorMessage: failure.errorMessage,
      maxRetriesExceeded: failure.maxRetriesExceeded,
      lastAttemptAt: new Date().toISOString(),
    };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    // Real, per the source spec's own Use Case 2 ("the LIS Print
    // Spooler holds the job, alerts the LIS administrator") — same
    // real, permanent audit posture as
    // mockOutboundResultQueueService.ts's own markFailed: the moment
    // a print job genuinely fails, not only if it's later retried.
    auditService.logEvent({
      type: 'system',
      event: 'Print job failed',
      detail: `Print job ${id} (${prior.reportType}, ${prior.mode}) failed: ${failure.errorCode} — ${failure.errorMessage}`,
      user: 'system',
      caseId: prior.caseId,
      confidence: null,
    });
    return ok(updated);
  },

  async retryDispatch(id) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Print job ${id} not found`);
    const prior = all[idx];
    const updated: PrintJob = {
      ...prior,
      status: 'QUEUED',
      errorCode: undefined,
      errorMessage: undefined,
      maxRetriesExceeded: false,
      retryCount: prior.retryCount + 1,
      lastAttemptAt: new Date().toISOString(),
    };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    auditService.logEvent({
      type: 'user',
      event: 'Print job re-queued',
      detail: `Print job ${id} (${prior.reportType}, ${prior.mode}) re-queued (attempt ${updated.retryCount}), was: ${prior.errorCode ?? 'unknown error'} — ${prior.errorMessage ?? 'no further detail recorded'}`,
      user: 'system',
      caseId: prior.caseId,
      confidence: null,
    });
    return ok(updated);
  },

  async markPrinted(id, options) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Print job ${id} not found`);
    const prior = all[idx];
    const updated: PrintJob = {
      ...prior,
      status: 'PRINTED',
      simulated: options?.simulated,
      errorCode: undefined,
      errorMessage: undefined,
      lastAttemptAt: new Date().toISOString(),
    };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    auditService.logEvent({
      type: 'system',
      event: 'Print job completed',
      detail: `Print job ${id} (${prior.reportType}, ${prior.mode}) genuinely printed.`,
      user: 'system',
      caseId: prior.caseId,
      confidence: null,
    });
    return ok(updated);
  },

  async persistRenderedPdf(id, pdfBase64, document) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Print job ${id} not found`);
    // Batch 538: a stored release document is kept once, in the document store; the job names it.
    const updated: PrintJob = {
      ...all[idx], ...(document?.id ? {} : { pdfBase64 }),
      ...(document?.id ? { reportDocumentId: document.id } : {}),
      ...(document?.sha256 ? { pdfSha256: document.sha256 } : {}),
    };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    // Real, per IPrintQueueService.persistRenderedPdf's own doc
    // comment — deliberately NOT audit-logged; this is a data-only
    // enrichment step of the one real dispatch attempt that already
    // gets its own real audit record via markPrinted/markFailed.
    return ok(updated);
  },

  async holdPrintJob(id, heldBy, holdReason) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Print job ${id} not found`);
    const prior = all[idx];
    if (!HOLDABLE_STATUSES.includes(prior.status)) {
      return err(`Print job ${id} cannot be held from its current status (${prior.status}).`);
    }
    const updated: PrintJob = {
      ...prior,
      status: 'HOLD',
      statusBeforeHold: prior.status,
      heldBy,
      heldAt: new Date().toISOString(),
      holdReason,
    };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    auditService.logEvent({
      type: 'user',
      event: 'Print job held',
      detail: `Print job ${id} (${prior.reportType}, ${prior.mode}) held by ${heldBy} from status ${prior.status}${holdReason ? ` — ${holdReason}` : ''}.`,
      user: heldBy,
      caseId: prior.caseId,
      confidence: null,
    });
    return ok(updated);
  },

  async releaseHold(id, releasedBy) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Print job ${id} not found`);
    const prior = all[idx];
    if (prior.status !== 'HOLD') {
      return err(`Print job ${id} is not currently on HOLD (status: ${prior.status}).`);
    }
    const updated: PrintJob = {
      ...prior,
      status: prior.statusBeforeHold ?? 'QUEUED',
      statusBeforeHold: undefined,
      heldBy: undefined,
      heldAt: undefined,
      holdReason: undefined,
      releasedBy,
      releasedAt: new Date().toISOString(),
    };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    auditService.logEvent({
      type: 'user',
      event: 'Print job hold released',
      detail: `Print job ${id} (${prior.reportType}, ${prior.mode}) released by ${releasedBy}, restored to status ${updated.status}.`,
      user: releasedBy,
      caseId: prior.caseId,
      confidence: null,
    });
    return ok(updated);
  },

  async cancelPrintJob(id, cancelledBy, cancelReason) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Print job ${id} not found`);
    const prior = all[idx];
    if (!CANCELLABLE_STATUSES.includes(prior.status)) {
      return err(`Print job ${id} cannot be cancelled from its current status (${prior.status}).`);
    }
    const updated: PrintJob = {
      ...prior,
      status: 'CANCELLED',
      cancelledBy,
      cancelledAt: new Date().toISOString(),
      cancelReason,
    };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    auditService.logEvent({
      type: 'user',
      event: 'Print job cancelled',
      detail: `Print job ${id} (${prior.reportType}, ${prior.mode}) cancelled by ${cancelledBy} from status ${prior.status}${cancelReason ? ` — ${cancelReason}` : ''}.`,
      user: cancelledBy,
      caseId: prior.caseId,
      confidence: null,
    });
    return ok(updated);
  },

  async redirectPrintJob(id, destination, redirectedBy) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Print job ${id} not found`);
    const prior = all[idx];
    // Batch 553: a destination that can't be used, or another lab's agent printer, is refused.
    if (printDestinationProblem(destination)) return err(PRINT_JOB_BAD_DESTINATION);
    if (!redirectSiteAllowed(prior, destination)) return err(PRINT_JOB_WRONG_SITE);
    const updated: PrintJob = {
      ...prior,
      redirectedToDestination: destination,
      redirectedBy,
      redirectedAt: new Date().toISOString(),
    };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    auditService.logEvent({
      type: 'user',
      event: 'Print job redirected',
      detail: `Print job ${id} (${prior.reportType}, ${prior.mode}) redirected by ${redirectedBy} to ${printDestinationAuditText(destination)}.`,
      user: redirectedBy,
      caseId: prior.caseId,
      confidence: null,
    });
    return ok(updated);
  },

  async holdMany(ids, heldBy, holdReason) {
    return runBulk(ids, id => printQueueServiceUnchecked.holdPrintJob(id, heldBy, holdReason));
  },

  async releaseHoldMany(ids, releasedBy) {
    return runBulk(ids, id => printQueueServiceUnchecked.releaseHold(id, releasedBy));
  },

  async cancelMany(ids, cancelledBy, cancelReason) {
    return runBulk(ids, id => printQueueServiceUnchecked.cancelPrintJob(id, cancelledBy, cancelReason));
  },

  async tagBatch(jobIds, batchId) {
    return runBulk(jobIds, async id => {
      await delay();
      const all = load();
      const idx = all.findIndex(e => e.id === id);
      if (idx === -1) return err(`Print job ${id} not found`);
      const updated: PrintJob = { ...all[idx], batchId };
      const next = [...all];
      next[idx] = updated;
      persist(next);
      return ok(updated);
    });
  },
};

/** Real, per IPrintQueueService's own bulk-methods doc comment —
 *  sequential, never Promise.all'd; one, real, shared loop every bulk
 *  method above reuses rather than each hand-rolling its own. */
async function runBulk(ids: string[], action: (id: string) => Promise<ServiceResult<PrintJob>>): Promise<ServiceResult<BulkPrintJobResult>> {
  const succeededIds: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const id of ids) {
    const res = await action(id);
    if (res.ok) succeededIds.push(id);
    // Real, deliberate cast — this project's own tsconfig.json has
    // strictNullChecks disabled, under which TypeScript cannot
    // reliably narrow a discriminated union to its `ok: false`
    // branch. Same real, established workaround dispatchZplLabel.ts's
    // own identical situation already uses (see attemptPrintDelivery.ts).
    else failed.push({ id, error: (res as { ok: false; error: string }).error });
  }
  return ok({ succeededIds, failed });
}


// ── Permissions (Batch 515, PS-283) ─────────────────────────────────────────
// Holding, releasing, cancelling and redirecting a print job are people's
// actions on the Print Queue dashboard, so each checks its capability here, in
// the service (CLAUDE.md rule 7). Before, anyone who could open Audit Log →
// Interfaces could do all of them. A bulk action checks once for the whole
// selection. Queueing, marking printed/failed and the dispatch bookkeeping are
// the system's own steps and are not checked. Retry is checked in
// redispatchPrintJob.ts.
import { PRINT_JOB_NOT_PERMITTED } from './printJobCodes';
export { PRINT_JOB_NOT_PERMITTED };
/** Batch 553: Redirect to a destination with a problem (printDestinationRules.ts). */
export const PRINT_JOB_BAD_DESTINATION = 'PRINT_JOB_BAD_DESTINATION';
/** Batch 553: Redirect to an agent printer on another site than the job's performing lab. */
export const PRINT_JOB_WRONG_SITE = 'PRINT_JOB_WRONG_SITE';

const enforce = async (capability: string) => {
  const { authorizationService } = await import('../authorization/defaultAuthorizationService');
  return authorizationService.enforce(capability);
};
const permitHold = async () => (await enforce('print:job:hold')).allowed;
const permitCancel = async () => (await enforce('print:job:cancel')).allowed;
const permitRedirect = async () => (await enforce('print:job:redirect')).allowed;
const refusedBulk = (ids: string[]): ServiceResult<BulkPrintJobResult> => ok({
  succeededIds: [], failed: ids.map(id => ({ id, error: PRINT_JOB_NOT_PERMITTED })),
});

export const mockPrintQueueService: IPrintQueueService = {
  ...printQueueServiceUnchecked,
  async holdPrintJob(id, heldBy, holdReason) {
    return (await permitHold()) ? printQueueServiceUnchecked.holdPrintJob(id, heldBy, holdReason) : err(PRINT_JOB_NOT_PERMITTED);
  },
  async releaseHold(id, releasedBy) {
    return (await permitHold()) ? printQueueServiceUnchecked.releaseHold(id, releasedBy) : err(PRINT_JOB_NOT_PERMITTED);
  },
  async cancelPrintJob(id, cancelledBy, cancelReason) {
    return (await permitCancel()) ? printQueueServiceUnchecked.cancelPrintJob(id, cancelledBy, cancelReason) : err(PRINT_JOB_NOT_PERMITTED);
  },
  async redirectPrintJob(id, destination, redirectedBy) {
    return (await permitRedirect()) ? printQueueServiceUnchecked.redirectPrintJob(id, destination, redirectedBy) : err(PRINT_JOB_NOT_PERMITTED);
  },
  async holdMany(ids, heldBy, holdReason) {
    return (await permitHold()) ? printQueueServiceUnchecked.holdMany(ids, heldBy, holdReason) : refusedBulk(ids);
  },
  async releaseHoldMany(ids, releasedBy) {
    return (await permitHold()) ? printQueueServiceUnchecked.releaseHoldMany(ids, releasedBy) : refusedBulk(ids);
  },
  async cancelMany(ids, cancelledBy, cancelReason) {
    return (await permitCancel()) ? printQueueServiceUnchecked.cancelMany(ids, cancelledBy, cancelReason) : refusedBulk(ids);
  },
};
