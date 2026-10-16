// src/services/printing/printJobFailureReason.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 549 (PS-539, open since Batch 546, finding F3): the Print Queue shows
// a failed job's reason in the user's language when the code alone says what
// happened. The job keeps its plain-English errorMessage for the record and
// for codes whose message carries detail from the printer (shown as stored).
// Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { PrintJob } from '@/types/printing/PrintJob';

/** Codes whose reason is fixed, with the locale key that says it. */
const FIXED_REASON_KEYS: Partial<Record<NonNullable<PrintJob['errorCode']>, string>> = {
  NEEDS_SITE_AGENT: 'printQueueDashboard.failure.needsSiteAgent',
};

/** The locale key for a failed job's reason, or null to show its stored message. */
export function printJobFailureReasonKey(job: Pick<PrintJob, 'errorCode'>): string | null {
  return (job.errorCode && FIXED_REASON_KEYS[job.errorCode]) || null;
}

/**
 * Batch 552 (SITE_AGENT_API.md §5, "Sent is not printed"): the status a job
 * shows. A PRINTED job the site agent could only send (Raw 9100, LPR) shows
 * "Sent to printer"; every other status shows as it is. Pure.
 */
export function printJobStatusKey(job: Pick<PrintJob, 'status' | 'confirmation'>): string {
  if (job.status === 'PRINTED' && job.confirmation === 'sent') return 'printQueueDashboard.status.SENT_TO_PRINTER';
  return `printQueueDashboard.status.${job.status}`;
}

/** Batch 553: how many Redirect results weren't redirected (refused, or the redirect itself refused); a print that then failed still counts as redirected. */
export function redirectNotDone(results: readonly { outcome: string; redirectError?: string }[]): number {
  return results.filter(r => r.outcome === 'refused' || !!r.redirectError).length;
}
