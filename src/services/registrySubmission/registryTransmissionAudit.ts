// src/services/registrySubmission/registryTransmissionAudit.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 425 (Pete and his developer: "Transmission audit export parity"). One
// row shape for every registry submission, screening (cytology) or cancer, so
// the two audits download the same columns: what was sent, when, and what the
// registry said back (its lifecycle status and its own response code, e.g. AA,
// AE). Pure. No patient identifiers: the case is named by its id only, as every
// QA export is (components/QualityAssurance/qaReportUtils.ts).
//
// The export is checked against qa:registry-transmission-audit:export
// (services/qualityAssurance/qaExport.ts) before any file is made.
// ─────────────────────────────────────────────────────────────────────────────

import type { RegistryAcknowledgement, RegistryLifecycleStatus, RegistryRevision } from './registryAcknowledgement';
import type { RegistrySubmissionHeader } from './registrySubmissionHeader';
import type { RegistryQueueName } from './registryExceptions';

export const REGISTRY_TRANSMISSION_AUDIT_CAPABILITY = 'qa:registry-transmission-audit:export' as const;

export interface RegistryTransmissionEntry {
  id: string;
  caseId: string;
  registryId: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  queuedAt: string;
  lastAttemptAt?: string;
  sentAt?: string;
  errorCode?: string;
  registryStatus?: RegistryLifecycleStatus;
  submission?: RegistrySubmissionHeader;
  acknowledgements?: RegistryAcknowledgement[];
  registryRevisions?: RegistryRevision[];
}

export interface RegistryTransmissionAuditRow {
  queue: RegistryQueueName;
  registryId: string;
  caseId: string;
  submissionGuid: string;
  submissionVersion: string;
  messageType: string;
  environment: string;
  queuedAt: string;
  sentAt: string;
  transmissionStatus: 'QUEUED' | 'SENT' | 'FAILED';
  errorReasonCode: string;
  registryStatus: string;
  responseCode: string;
  answeredAt: string;
  revisionsAfterAcceptance: number;
}

/** The registry's own response code from the latest answer, when the engine passed one on. */
export function latestResponseCode(entry: Pick<RegistryTransmissionEntry, 'acknowledgements'>): string {
  const acks = entry.acknowledgements ?? [];
  for (let i = acks.length - 1; i >= 0; i--) if (acks[i].responseCode) return acks[i].responseCode!;
  return '';
}

export function registryTransmissionAuditRow(queue: RegistryQueueName, e: RegistryTransmissionEntry): RegistryTransmissionAuditRow {
  const acks = e.acknowledgements ?? [];
  const last = acks.length ? acks[acks.length - 1] : undefined;
  return {
    queue, registryId: e.registryId, caseId: e.caseId,
    submissionGuid: e.submission?.submissionGuid ?? '',
    submissionVersion: e.submission ? String(e.submission.submissionVersion) : '',
    messageType: e.submission?.messageType ?? '',
    environment: e.submission?.environment ?? '',
    queuedAt: e.queuedAt,
    sentAt: e.sentAt ?? (e.status === 'SENT' ? e.lastAttemptAt ?? '' : ''),
    transmissionStatus: e.status,
    errorReasonCode: e.errorCode ?? '',
    registryStatus: e.registryStatus ?? '',
    responseCode: latestResponseCode(e),
    answeredAt: last?.receivedAt ?? '',
    revisionsAfterAcceptance: (e.registryRevisions ?? []).length,
  };
}

/** Every submission in both queues (optionally one queue), newest first. */
export function registryTransmissionAuditRows(
  queues: Partial<Record<RegistryQueueName, RegistryTransmissionEntry[]>>,
  filter: { queue?: RegistryQueueName; caseIds?: Set<string> } = {},
): RegistryTransmissionAuditRow[] {
  const rows: RegistryTransmissionAuditRow[] = [];
  for (const queue of ['cytology', 'cancer'] as RegistryQueueName[]) {
    if (filter.queue && filter.queue !== queue) continue;
    for (const e of queues[queue] ?? []) if (!filter.caseIds || filter.caseIds.has(e.caseId)) rows.push(registryTransmissionAuditRow(queue, e));
  }
  return rows.sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
}

/** The CSV columns, in order (column names are the file's own, not UI text). */
export function registryTransmissionAuditCsvRows(rows: RegistryTransmissionAuditRow[]): Record<string, string | number>[] {
  return rows.map(r => ({
    Queue: r.queue, Registry: r.registryId, Case_ID: r.caseId, Submission_ID: r.submissionGuid, Submission_Version: r.submissionVersion,
    Message_Type: r.messageType, Environment: r.environment, Queued_At: r.queuedAt, Sent_At: r.sentAt, Transmission_Status: r.transmissionStatus,
    Error_Reason_Code: r.errorReasonCode, Registry_Status: r.registryStatus, Response_Code: r.responseCode, Answered_At: r.answeredAt,
    Revisions_After_Acceptance: r.revisionsAfterAcceptance,
  }));
}
