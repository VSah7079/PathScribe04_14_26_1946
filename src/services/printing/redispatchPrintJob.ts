// src/services/printing/redispatchPrintJob.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-279 §2.2.3 ("Retry a failed print job... Redirect a
// print job to an alternate printer/route") — the real re-send
// orchestration for an already-queued job, reusing
// attemptPrintDelivery.ts (the same real Mode 1/2/3 branching
// dispatchPrintJob.ts's own original, first-dispatch call uses) rather
// than a second, duplicated implementation.
//
// Real, honest scope, per PrintJob.pdfBase64's own doc comment: a
// Retry/Redirect resends EXACTLY the bytes persisted at the job's
// original dispatch — never a live re-render of the current report
// content. A job enqueued before this real persistence existed (or
// one whose original dispatch never reached the point of having a
// real, successfully-rendered PDF at all) has no real pdfBase64 to
// resend; this fails that honestly (PRINT_REJECTED) rather than
// silently no-op'ing or fabricating empty bytes.
//
// Real, per §2.2.3's own "Redirect" — `job.redirectedToDestination`
// (set by IPrintQueueService.redirectPrintJob, an explicit, real admin
// action) always wins over `job.resolvedDestination` (the original,
// first-dispatch resolution) when both are present, for a
// DIRECT_NETWORK_PRINT job. A Retry with no real redirect ever set
// simply resends to the exact same, original real target — the same,
// honest "reprint what was actually queued" semantic any physical
// print queue already has.
// ─────────────────────────────────────────────────────────────────────────────

import { mockPrintQueueService, PRINT_JOB_NOT_PERMITTED } from './mockPrintQueueService';
import { attemptPrintDelivery } from './attemptPrintDelivery';

/** A Retry or Redirect's result. 'refused': the person lacks the permission (Batch 515, PS-283). */
export interface RedispatchPrintJobResult {
  outcome: 'dispatched' | 'failed' | 'refused';
  jobId: string;
  /** Batch 553: set when a Redirect itself was refused (the job wasn't redirected), e.g. PRINT_JOB_WRONG_SITE. */
  redirectError?: string;
}
import type { PrintDestination } from '@/types/printRouting/PrintDestination';

// Batch 515 (PS-283): a Retry is a person's action on the Print Queue, so it
// needs print:job:retry. A bulk retry checks once.
const permitRetry = async (): Promise<boolean> => {
  const { authorizationService } = await import('../authorization/defaultAuthorizationService');
  return (await authorizationService.enforce('print:job:retry')).allowed;
};

export async function redispatchPrintJob(jobId: string): Promise<RedispatchPrintJobResult> {
  if (!(await permitRetry())) return { outcome: 'refused', jobId };
  return redispatchPermitted(jobId);
}

/** Batch 521 (PS-281): the system's own automatic retry of a failed release print job (on the lab's
 *  retry schedule, deliveryRetries.ts). No person acts, so no person's permission applies; a person's
 *  Retry from the Print Queue still needs print:job:retry. */
export function retryPrintJobAutomatically(jobId: string): Promise<RedispatchPrintJobResult> {
  return redispatchPermitted(jobId);
}

async function redispatchPermitted(jobId: string): Promise<RedispatchPrintJobResult> {
  const jobRes = await mockPrintQueueService.getById(jobId);
  if (!jobRes.ok) {
    return { outcome: 'failed', jobId };
  }
  const job = jobRes.data;

  // Batch 538: a job of a stored release document keeps only the document's id; the bytes are read
  // back from the store, checked against their SHA-256 (a mismatch is not printed).
  let pdfBase64 = job.pdfBase64;
  if (!pdfBase64 && job.reportDocumentId) {
    const [{ documentPdf }, { reportDocumentService }] = await Promise.all([
      import('../reportDocuments/reportDocumentService'), import('../reportDocuments/reportDocumentInstance'),
    ]);
    const doc = await documentPdf(job.reportDocumentId, reportDocumentService)();
    if (!doc.pdfBase64) {
      // Batch 556: the server not answering (or this person not allowed) is not a lasting fault: keep the job retryable.
      const passing = doc.documentError === 'unavailable' || doc.documentError === 'notPermitted';
      await mockPrintQueueService.markFailed(jobId, { errorCode: 'PRINT_REJECTED', errorMessage: `The release's report document can't be printed: ${doc.generationError}.`, maxRetriesExceeded: !passing });
      return { outcome: 'failed', jobId };
    }
    pdfBase64 = doc.pdfBase64;
  }

  if (!pdfBase64) {
    await mockPrintQueueService.markFailed(jobId, {
      errorCode: 'PRINT_REJECTED',
      errorMessage: 'No persisted PDF available to retry — this job predates PS-279’s pdfBase64 persistence, or its original dispatch never reached a successfully-rendered PDF.',
      maxRetriesExceeded: true,
    });
    return { outcome: 'failed', jobId };
  }

  // Real, per the source spec's own Use Case 2 — a real Retry/Redirect
  // is itself a real, new dispatch attempt: it moves the job back to
  // QUEUED and bumps retryCount, same as the DLQ's own established
  // retryDispatch convention, BEFORE attempting delivery, so a job
  // that fails again lands honestly on FAILED with an incremented
  // count rather than silently staying on whatever real status it
  // was in before this call.
  await mockPrintQueueService.retryDispatch(jobId);

  const destination = job.redirectedToDestination ?? job.resolvedDestination;

  return attemptPrintDelivery({
    jobId,
    caseId: job.caseId,
    reportType: job.reportType,
    priority: job.priority,
    mode: job.mode,
    pdfBase64,
    printerName: job.printerName,
    paperSize: job.paperSize,
    destination,
    presentation: { paperSource: job.paperSource, duplexMode: job.duplexMode },
  });
}

/** Real, per PS-279 §2.2.3's own "bulk... operations" — real,
 *  sequential (never Promise.all'd), same real reasoning
 *  IPrintQueueService's own bulk methods already document: a real,
 *  large selection never opens dozens of concurrent socket/HTTP
 *  connections to potentially the same real printer at once. */
export async function redispatchManyPrintJobs(jobIds: string[]): Promise<RedispatchPrintJobResult[]> {
  if (!(await permitRetry())) return jobIds.map(jobId => ({ outcome: 'refused' as const, jobId }));
  const results: RedispatchPrintJobResult[] = [];
  for (const jobId of jobIds) {
    results.push(await redispatchPermitted(jobId));
  }
  return results;
}

/** Real, per PS-279 §2.2.3's own "redirect" operation — the real,
 *  one-action composition an admin dashboard actually needs: record
 *  the real, explicit override destination, THEN immediately attempt
 *  real delivery to it, rather than leaving the admin to separately
 *  invoke redirect and then a second, separate Retry. Real, deliberate
 *  split kept underneath, still: IPrintQueueService.redirectPrintJob
 *  itself only ever records the override (see its own doc comment for
 *  why) — this function is the one, real place the two real steps are
 *  composed, so PrintQueueDashboardSection.tsx's own UI code never has
 *  to sequence them itself. */
export async function redirectAndRedispatchPrintJob(
  jobId: string,
  destination: PrintDestination,
  redirectedBy: string,
): Promise<RedispatchPrintJobResult> {
  // Batch 515: needs print:job:redirect (checked by the queue service) and print:job:retry.
  if (!(await permitRetry())) return { outcome: 'refused', jobId };
  const redirectRes = await mockPrintQueueService.redirectPrintJob(jobId, destination, redirectedBy);
  if (!redirectRes.ok) {
    const error = (redirectRes as { ok: false; error: string }).error;
    return error === PRINT_JOB_NOT_PERMITTED ? { outcome: 'refused', jobId } : { outcome: 'failed', jobId, redirectError: error };
  }
  return redispatchPermitted(jobId);
}

/** Real, per PS-279 §2.2.3 — the real, bulk variant of the composition
 *  above, sequential for the same real reason every other bulk
 *  operation here is. */
export async function redirectAndRedispatchManyPrintJobs(
  jobIds: string[],
  destination: PrintDestination,
  redirectedBy: string,
): Promise<RedispatchPrintJobResult[]> {
  const results: RedispatchPrintJobResult[] = [];
  for (const jobId of jobIds) {
    results.push(await redirectAndRedispatchPrintJob(jobId, destination, redirectedBy));
  }
  return results;
}
