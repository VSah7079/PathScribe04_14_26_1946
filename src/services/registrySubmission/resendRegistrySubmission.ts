// src/services/registrySubmission/resendRegistrySubmission.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 421 (Registry Engine SRS v2.1, FR-008.5, FR-008.7). The worklist's
// "Re-validate and resend". Needs registry:submission:resend.
//
// The submission is rebuilt from today's data (the case, the signed-out
// result, the patient's identifiers and consent, the lab's code mappings), then:
//
//   still held        nothing is queued; the hold reasons come back.
//   excluded / gone   the patient has since opted out, or the registry or the
//                     result no longer applies: nothing is sent.
//   same content      as the entry already holds (its fingerprint):
//                       rejected by the registry → refused ('unchanged'):
//                         sending what it rejected again won't help; fix the
//                         data first;
//                       otherwise (held, undelivered, unanswered) → resent as
//                         the same submission: same id, isDuplicateRetry, so a
//                         registry that did get it can drop the copy.
//   changed content   a new version (the next number, linked to the same
//                     master id): NEW if the registry holds no accepted
//                     version, otherwise CORRECTION / AMENDMENT.
// ─────────────────────────────────────────────────────────────────────────────

import type { RegistrySubmissionHeader } from './registrySubmissionHeader';
import type { RegistryQueueEntryForWorklist, RegistryQueueName } from './registryExceptions';

type Result<T> = { ok: true; data: T } | { ok: false; error?: string };

/** A rebuild of the entry's submission from today's data. */
export type RegistryRebuild =
  | { status: 'ready'; body: object; contentHash: string }
  | { status: 'held'; message: string }
  | { status: 'notApplicable'; reason: string };

export interface ResendQueuePort {
  get: (id: string) => Promise<RegistryQueueEntryForWorklist | undefined>;
  retryDispatch: (id: string) => Promise<Result<{ id: string; submission?: RegistrySubmissionHeader }>>;
  markSent: (id: string) => Promise<unknown>;
  markFailed: (id: string, failure: { errorCode: any; errorMessage: string; maxRetriesExceeded: boolean }) => Promise<unknown>;
}

export interface ResendDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  queues: Record<RegistryQueueName, ResendQueuePort>;
  /** Rebuild the entry's submission from today's data (per queue: screening or cancer). */
  rebuild: (queue: RegistryQueueName, entry: RegistryQueueEntryForWorklist) => Promise<RegistryRebuild>;
  /** Submit a new version through the normal path; returns the new entry's outcome. */
  submitNewVersion: (queue: RegistryQueueName, entry: RegistryQueueEntryForWorklist) => Promise<{ outcome: string; queueId?: string; submission?: RegistrySubmissionHeader }>;
  dispatch: (queue: RegistryQueueName, entryId: string, payload: object) => Promise<{ ok: boolean; errorCode?: string; error?: string }>;
  logAudit: (event: any) => unknown;
}

export interface ResendOutcome {
  outcome: 'notPermitted' | 'notFound' | 'noHeader' | 'stillHeld' | 'notApplicable' | 'unchanged' | 'resent' | 'resendFailed' | 'newVersion';
  message?: string;
  submission?: RegistrySubmissionHeader;
  newEntryId?: string;
}

export async function resendRegistrySubmission(
  input: { queue: RegistryQueueName; entryId: string; /** Batch 638: set only by the CSMS eligibility answer. */ eligibilityVerified?: boolean },
  user: { id: string; name: string },
  deps: ResendDeps,
): Promise<ResendOutcome> {
  // eligibilityVerified: the caller (verifyCsmsEligibility) has already enforced cytology:csms-eligibility:verify for this case.
  if (!input.eligibilityVerified) {
    const decision = await deps.enforce('registry:submission:resend', { queueEntryId: input.entryId });
    if (!decision.allowed) return { outcome: 'notPermitted' };
  }
  const q = deps.queues[input.queue];
  const entry = await q.get(input.entryId);
  if (!entry) return { outcome: 'notFound' };
  if (!entry.submission) return { outcome: 'noHeader' };
  // Batch 638: a message waiting for the CSMS eligibility answer is released by that answer alone, never by a resend.
  if (entry.errorCode === 'AWAITING_ELIGIBILITY' && !input.eligibilityVerified) return { outcome: 'stillHeld', message: 'Waiting for the CSMS eligibility check. Record the answer on the case first.' };
  const actor = user.name || user.id;
  const audit = (event: string, detail: string) => deps.logAudit({ type: 'user', event, detail: `${entry.registryId} queue entry ${entry.id} (v${entry.submission!.submissionVersion}): ${detail}`, user: actor, caseId: entry.caseId, confidence: null });

  const rebuilt = await deps.rebuild(input.queue, entry);
  if (rebuilt.status === 'held') { audit('Registry resend still held', rebuilt.message); return { outcome: 'stillHeld', message: rebuilt.message }; }
  if (rebuilt.status === 'notApplicable') { audit('Registry resend not applicable', rebuilt.reason); return { outcome: 'notApplicable', message: rebuilt.reason }; }

  if (rebuilt.contentHash === (entry as any).contentHash) {
    if (entry.registryStatus === 'rejectedRecoverable' || entry.registryStatus === 'rejectedFatal') {
      audit('Registry resend refused', 'nothing has changed since the registry rejected it; fix the data first.');
      return { outcome: 'unchanged' };
    }
    const retried = await q.retryDispatch(entry.id);
    const retriedHeader = retried.ok ? retried.data.submission : undefined;
  if (!retriedHeader) return { outcome: 'resendFailed', message: retried.ok ? 'No header.' : (retried as { error?: string }).error };
    const sent = await deps.dispatch(input.queue, entry.id, { ...rebuilt.body, submission: retriedHeader });
    if (!sent.ok) {
      await q.markFailed(entry.id, { errorCode: sent.errorCode ?? 'DISPATCH_REJECTED', errorMessage: sent.error ?? 'Unknown dispatch failure.', maxRetriesExceeded: false });
      audit('Registry resend failed', `${sent.errorCode ?? 'DISPATCH_REJECTED'}: ${sent.error ?? ''}`.trim());
      return { outcome: 'resendFailed', message: sent.error, submission: retriedHeader };
    }
    await q.markSent(entry.id);
    audit('Registry submission resent', `same content, same id ${retriedHeader.submissionGuid}, marked as a duplicate retry.`);
    return { outcome: 'resent', submission: retriedHeader };
  }

  const next = await deps.submitNewVersion(input.queue, entry);
  audit('Registry submission resent as a new version', `content changed; new version ${next.submission?.submissionVersion ?? '?'} ${next.submission?.messageType ?? ''}, outcome ${next.outcome}.`.replace(/ +,/g, ','));
  return { outcome: 'newVersion', submission: next.submission, newEntryId: next.queueId, message: next.outcome };
}

/**
 * Batch 424: "Resend all" on the worklist (the bulk catch-up for results held for want of a go-live
 * approval). Each row goes through resendRegistrySubmission, so each is permission-checked,
 * re-validated and audited on its own.
 */
export async function resendAllRegistrySubmissions(
  rows: { queue: RegistryQueueName; entryId: string }[],
  user: { id: string; name: string },
  deps: ResendDeps,
): Promise<{ resent: number; notResent: number; notPermitted: boolean }> {
  let resent = 0;
  let notPermitted = false;
  for (const row of rows) {
    const r = await resendRegistrySubmission(row, user, deps);
    if (r.outcome === 'resent' || r.outcome === 'newVersion') resent++;
    if (r.outcome === 'notPermitted') { notPermitted = true; break; }
  }
  return { resent, notResent: rows.length - resent, notPermitted };
}
