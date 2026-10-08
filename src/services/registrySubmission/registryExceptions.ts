// src/services/registrySubmission/registryExceptions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 421 (Registry Engine SRS v2.1, FR-008.6, FR-008.7). What the Registry
// Exceptions worklist shows: every registry submission, cytology or cancer,
// that needs a person. Pure.
//
//   held               never sent: identifier or codes not ready (Batch 414/417), or
//                      a cancer report missing its registry's mandatory data (Batch 425)
//   attestationRequired  never sent: a live register with no current go-live
//                      approval (Batch 423; its own kind since Batch 424, "Held:
//                      attestation required"); resent in the catch-up when
//                      go-live is approved, or with "Resend all"
//   deliveryFailed     the interface engine couldn't be reached and retries
//                      stopped (72 hours, Batch 420)
//   rejectedRecoverable / rejectedFatal   the registry said no (Batch 420)
//   ackOverdue         sent, and 72 hours of silence
//   conflict           accepted, then a different answer came in
//   revisedPostAcceptance  Batch 425: the registry revised data it had accepted
//                      (REGISTRY_RESPONSE_UPDATED); until someone marks it reviewed
//
// Only the latest version of each result shows: an older version that a
// newer one replaced is done with. Consent exclusions never show (they are
// never resent), nor anything accepted, waiting, or still being retried.
// ─────────────────────────────────────────────────────────────────────────────

import type { RegistryAcknowledgement, RegistryFinding, RegistryLifecycleStatus, RegistryRevision } from './registryAcknowledgement';
import type { RegistrySubmissionHeader } from './registrySubmissionHeader';

export type RegistryExceptionKind = 'held' | 'attestationRequired' | 'deliveryFailed' | 'rejectedRecoverable' | 'rejectedFatal' | 'ackOverdue' | 'conflict' | 'revisedPostAcceptance';
export type RegistryQueueName = 'cytology' | 'cancer';

export interface RegistryQueueEntryForWorklist {
  id: string;
  caseId: string;
  registryId: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  queuedAt: string;
  lastAttemptAt?: string;
  errorCode?: string;
  errorMessage?: string;
  maxRetriesExceeded: boolean;
  registryStatus?: RegistryLifecycleStatus;
  submission?: RegistrySubmissionHeader;
  acknowledgements?: RegistryAcknowledgement[];
  /** Batch 425 */
  registryRevisions?: RegistryRevision[];
  signOutRecordId?: string;
}

export interface RegistryExceptionRow {
  queue: RegistryQueueName;
  entryId: string;
  caseId: string;
  registryId: string;
  kind: RegistryExceptionKind;
  submissionVersion?: number;
  messageType?: RegistrySubmissionHeader['messageType'];
  environment?: RegistrySubmissionHeader['environment'];
  /** When it last moved (the latest acknowledgement, attempt, or queuing). */
  at: string;
  /** What went wrong: the registry's findings, or PathScribe's own hold / delivery message as one finding. */
  findings: RegistryFinding[];
  /** The latest acknowledgement as received, for the expandable raw view. */
  rawAcknowledgement?: string;
  /** A resend can't fix a consent exclusion or a missing header; everything here can be re-validated. */
  canResend: boolean;
}

/** Which exception, if any, an entry is. */
export function registryExceptionKind(e: RegistryQueueEntryForWorklist): RegistryExceptionKind | null {
  if (e.errorCode === 'EXCLUDED_BY_CONSENT') return null;
  const acks = e.acknowledgements ?? [];
  const lastAck = acks[acks.length - 1];
  if ((e.registryStatus === 'accepted' || e.registryStatus === 'acceptedWithWarnings') && lastAck && lastAck.outcome !== e.registryStatus) return 'conflict';
  if ((e.registryStatus === 'accepted' || e.registryStatus === 'acceptedWithWarnings') && (e.registryRevisions ?? []).some(r => !r.reviewedAt)) return 'revisedPostAcceptance';
  if (e.registryStatus === 'rejectedRecoverable') return 'rejectedRecoverable';
  if (e.registryStatus === 'rejectedFatal') return 'rejectedFatal';
  if (e.registryStatus === 'ackOverdue') return 'ackOverdue';
  if (e.status === 'FAILED' && e.errorCode === 'REGISTRY_LIVE_NOT_APPROVED') return 'attestationRequired';
  // Batch 425: a cancer report missing the registry's mandatory data is held the same way.
  if (e.status === 'FAILED' && (e.errorCode === 'REGISTRY_NOT_READY' || e.errorCode === 'HOLD_MISSING_MANDATORY_DATA')) return 'held';
  if (e.status === 'FAILED' && e.maxRetriesExceeded) return 'deliveryFailed';
  return null;
}

const KIND_ORDER: RegistryExceptionKind[] = ['rejectedFatal', 'rejectedRecoverable', 'conflict', 'revisedPostAcceptance', 'deliveryFailed', 'ackOverdue', 'attestationRequired', 'held'];

export function registryExceptionRows(queues: Record<RegistryQueueName, RegistryQueueEntryForWorklist[]>): RegistryExceptionRow[] {
  const rows: RegistryExceptionRow[] = [];
  for (const queue of ['cytology', 'cancer'] as RegistryQueueName[]) {
    const entries = queues[queue];
    // The latest version per result (master id); entries without a header stand alone.
    const latestByMaster = new Map<string, number>();
    for (const e of entries) {
      const m = e.submission?.masterTransactionId;
      if (m) latestByMaster.set(m, Math.max(latestByMaster.get(m) ?? 0, e.submission!.submissionVersion));
    }
    for (const e of entries) {
      if (e.submission && latestByMaster.get(e.submission.masterTransactionId) !== e.submission.submissionVersion) continue;
      const kind = registryExceptionKind(e);
      if (!kind) continue;
      const acks = e.acknowledgements ?? [];
      const lastAck = acks[acks.length - 1];
      const findings: RegistryFinding[] = (kind === 'held' || kind === 'attestationRequired' || kind === 'deliveryFailed') && e.errorMessage
        ? [{ severity: kind === 'deliveryFailed' ? 'FATAL' : 'CRITICAL_REJECT', ...(e.errorCode ? { code: e.errorCode } : {}), message: e.errorMessage }]
        : kind === 'ackOverdue' ? []
          : kind === 'revisedPostAcceptance'
            ? (e.registryRevisions ?? []).filter(r => !r.reviewedAt).flatMap(r => r.updatedFields.map(f => ({ severity: 'INFORMATIONAL' as const, code: f.field, message: f.value })))
            : lastAck?.findings ?? [];
      rows.push({
        queue, entryId: e.id, caseId: e.caseId, registryId: e.registryId, kind,
        submissionVersion: e.submission?.submissionVersion, messageType: e.submission?.messageType, environment: e.submission?.environment,
        at: lastAck?.receivedAt ?? e.lastAttemptAt ?? e.queuedAt,
        findings,
        // HL7 separates segments with a bare carriage return, which a screen doesn't break on.
        ...(lastAck ? { rawAcknowledgement: lastAck.raw.replace(/\r\n?/g, '\n') } : {}),
        canResend: !!e.submission && kind !== 'conflict' && kind !== 'revisedPostAcceptance',
      });
    }
  }
  return rows.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || b.at.localeCompare(a.at));
}

/** The counts the worklist's filter chips show. */
export function registryExceptionCounts(rows: RegistryExceptionRow[]): Record<RegistryExceptionKind, number> {
  const counts = { held: 0, attestationRequired: 0, deliveryFailed: 0, rejectedRecoverable: 0, rejectedFatal: 0, ackOverdue: 0, conflict: 0, revisedPostAcceptance: 0 };
  for (const r of rows) counts[r.kind]++;
  return counts;
}

/** The locale key for a registry's name (the screening programme's own, or the cancer registry's). */
export function registryLabelKey(queue: RegistryQueueName, registryId: string, screeningLabelId: (id: string) => string | undefined): string | undefined {
  if (queue === 'cytology') {
    const labelId = screeningLabelId(registryId);
    return labelId ? `screeningRegistry.registries.${labelId}` : undefined;
  }
  return registryId && registryId !== 'none' ? `cancerRegistrySection.registries.${registryId.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}` : undefined;
}

/**
 * Where "Open case" goes: the Cytology Workspace for a screening submission,
 * the report for a cancer one. Batch 446: the case and view, not an address;
 * the screen opens it through useOpenCase, which addresses it by reference.
 */
export function registryExceptionCaseView(row: Pick<RegistryExceptionRow, 'queue' | 'caseId'>): { caseId: string; view: 'cytology' | 'synoptic' } {
  return { caseId: row.caseId, view: row.queue === 'cytology' ? 'cytology' : 'synoptic' };
}
