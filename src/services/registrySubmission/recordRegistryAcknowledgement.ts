// src/services/registrySubmission/recordRegistryAcknowledgement.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 420 (Registry Engine SRS v2.1, FR-008.2, FR-008.3). The registry's
// answer comes back through the interface engine (Batch 424 correction: ForMedrixAI's
// engine, shipped with PathScribe; a site's own engine only when it insists); this takes it in
// (Batch 425: the engine's normalised JSON only; HL7 and FHIR are read by the
// engine, PS-331), finds the submission by its
// id in the cytology or cancer registry queue, moves its status, keeps the raw
// message, and audits. System to system: no person's permission is involved
// (the API server authenticates the interface engine; see
// docs/architecture/REGISTRY_ACKNOWLEDGEMENT_API.md).
//
// A rejection lands on the exception worklist (Batch 421) through its status.
// ─────────────────────────────────────────────────────────────────────────────

import {
  applyRegistryAcknowledgement, parseRegistryAcknowledgement, registrySubmissionsToEscalate,
  type RegistryAckFormat, type RegistryAcknowledgement, type RegistryLifecycleStatus, type EscalationCandidate,
} from './registryAcknowledgement';

type Result<T> = { ok: true; data: T } | { ok: false; error?: string };

export type RegistryQueueName = 'cytology' | 'cancer';

export interface RegistryQueueEntryView extends EscalationCandidate {
  caseId: string;
  registryId: string;
  submission?: { submissionGuid: string };
}

export interface RegistryQueuePort {
  getAll: () => Promise<Result<RegistryQueueEntryView[]>>;
  setRegistryStatus: (id: string, status: RegistryLifecycleStatus, ack?: RegistryAcknowledgement) => Promise<unknown>;
  markFailed: (id: string, failure: { errorCode: any; errorMessage: string; maxRetriesExceeded: boolean }) => Promise<unknown>;
}

export interface RegistryAckDeps {
  queues: Record<RegistryQueueName, RegistryQueuePort>;
  logAudit: (event: any) => unknown;
  now: () => Date;
}

export interface RecordAckOutcome {
  outcome: 'applied' | 'duplicate' | 'conflict' | 'unparseable' | 'noSubmissionGuid' | 'notNormalizedJson' | 'unknownSubmission';
  queue?: RegistryQueueName;
  entryId?: string;
  registryStatus?: RegistryLifecycleStatus;
}

const FINDINGS_TEXT = (ack: RegistryAcknowledgement) =>
  ack.findings.length ? ack.findings.map(f => `${f.severity}${f.code ? ` ${f.code}` : ''}: ${f.message}`).join('; ') : 'no findings';

export async function recordRegistryAcknowledgement(
  /** Batch 425: format 'statusJson' (the engine's normalised JSON) only; anything else is refused. */
  input: { format: RegistryAckFormat | string; body: string; submissionGuid?: string },
  deps: RegistryAckDeps,
): Promise<RecordAckOutcome> {
  const parsed = parseRegistryAcknowledgement(input.format, input.body, input.submissionGuid);
  if (parsed.ok === false) {
    deps.logAudit({ type: 'system', event: 'Registry acknowledgement rejected', detail: `A ${input.format} acknowledgement could not be read (${parsed.reason}).`, user: 'system', caseId: null, confidence: null });
    return { outcome: parsed.reason };
  }
  const ack: RegistryAcknowledgement = { ...parsed.ack, receivedAt: deps.now().toISOString() };

  for (const queue of ['cytology', 'cancer'] as RegistryQueueName[]) {
    const all = await deps.queues[queue].getAll();
    const entry = all.ok ? all.data.find(e => e.submission?.submissionGuid === ack.submissionGuid) : undefined;
    if (!entry) continue;
    const t = applyRegistryAcknowledgement(entry.registryStatus, ack);
    // The message is kept on the entry whatever happens; the status moves only when applied.
    await deps.queues[queue].setRegistryStatus(entry.id, t.registryStatus, ack);
    const event = t.result === 'applied' ? 'Registry acknowledgement received'
      : t.result === 'duplicate' ? 'Registry acknowledgement repeated' : 'Registry acknowledgement conflicts with an accepted submission';
    deps.logAudit({
      type: 'system', event,
      detail: `${entry.registryId} submission ${ack.submissionGuid} (queue entry ${entry.id}): ${ack.outcome}; ${FINDINGS_TEXT(ack)}. Status ${t.registryStatus}.`,
      user: 'system', caseId: entry.caseId, confidence: null,
    });
    return { outcome: t.result, queue, entryId: entry.id, registryStatus: t.registryStatus };
  }
  deps.logAudit({ type: 'system', event: 'Registry acknowledgement for an unknown submission', detail: `No submission ${ack.submissionGuid} in either registry queue; ${ack.outcome}.`, user: 'system', caseId: null, confidence: null });
  return { outcome: 'unknownSubmission' };
}

/** SRS NFR-002: after 72 hours, an unacknowledged submission is ackOverdue and an undeliverable one
 *  stops retrying; both then show on the exception worklist. Run by the scheduler, and by the
 *  worklist when it opens. Returns how many changed. */
export async function escalateStaleRegistrySubmissions(deps: RegistryAckDeps): Promise<{ ackOverdue: number; deliveryAbandoned: number }> {
  let ackOverdue = 0, deliveryAbandoned = 0;
  for (const queue of ['cytology', 'cancer'] as RegistryQueueName[]) {
    const all = await deps.queues[queue].getAll();
    if (!all.ok) continue;
    const due = registrySubmissionsToEscalate(all.data, deps.now());
    for (const id of due.ackOverdue) {
      const e = all.data.find(x => x.id === id)!;
      await deps.queues[queue].setRegistryStatus(id, 'ackOverdue');
      deps.logAudit({ type: 'system', event: 'Registry acknowledgement overdue', detail: `${e.registryId} queue entry ${id}: no acknowledgement 72 hours after it was sent.`, user: 'system', caseId: e.caseId, confidence: null });
      ackOverdue++;
    }
    for (const id of due.deliveryAbandoned) {
      const e = all.data.find(x => x.id === id)!;
      await deps.queues[queue].markFailed(id, { errorCode: e.errorCode, errorMessage: 'Not delivered to the interface engine within 72 hours; retries stopped.', maxRetriesExceeded: true });
      deliveryAbandoned++;
    }
  }
  return { ackOverdue, deliveryAbandoned };
}
