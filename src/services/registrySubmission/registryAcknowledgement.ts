// src/services/registrySubmission/registryAcknowledgement.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 420 (Registry Engine SRS v2.1, FR-008.2, FR-008.3, FR-008.11). What a
// registry (through the interface engine: ForMedrixAI's, shipped with PathScribe,
// or a site's own when it insists; Batch 424 correction) says back about a
// submission, and what that does to the submission's status. Pure.
//
// Batch 425 (Pete and his developer, Oct 1 2026: a strict JSON boundary).
// PathScribe reads only the engine's normalised JSON. Batch 420 also read HL7 v2
// ACKs and FHIR OperationOutcomes here; that mapping now belongs to the engine
// (PS-331) and is kept as its specification in
// docs/architecture/REGISTRY_ACKNOWLEDGEMENT_API.md §4. Two event shapes:
//
//   registry answer      { submissionGuid (or submissionId), status: ACCEPTED |
//                        ACCEPTED_WITH_WARNINGS | REJECTED_RECOVERABLE | REJECTED_FATAL,
//                        responseCode (or ackCode)?, findings: [{ severity, code?,
//                        message, tier?, location? }] }
//   a revision           the registry revised data it had accepted (e.g. a TNM
//                        stage): status REVISED, either as the event
//                        { event: REGISTRY_RESPONSE_UPDATED, submissionGuid? or
//                        accessionId + registryId, previousStatus, payloadHash,
//                        updatedFields: [{ field, value }] } or on the answer
//                        endpoint { submissionId, status: REVISED, ackCode?,
//                        revisedPayload: { field: value } } (the developer's
//                        adjusted plan, Oct 1 2026). Both are read.
//
// Status lifecycle (on the queue entry, beside the transport status):
//   sent → awaitingAck → accepted | acceptedWithWarnings | rejectedRecoverable | rejectedFatal
//   awaitingAck for more than 72 hours → ackOverdue (still accepts a late ACK).
//   A resend (the same id, isDuplicateRetry) goes back to awaitingAck.
// ─────────────────────────────────────────────────────────────────────────────

import { sha256Hex } from './sha256';

export type RegistryLifecycleStatus = 'awaitingAck' | 'accepted' | 'acceptedWithWarnings' | 'rejectedRecoverable' | 'rejectedFatal' | 'ackOverdue';
export type RegistryAckOutcome = 'accepted' | 'acceptedWithWarnings' | 'rejectedRecoverable' | 'rejectedFatal';
export type RegistryFindingSeverity = 'FATAL' | 'CRITICAL_REJECT' | 'WARNING' | 'INFORMATIONAL';
/** Batch 425: only 'statusJson' (the engine's normalised JSON) is read. The other two appear only on
 *  answers stored before Batch 425. */
export type RegistryAckFormat = 'statusJson' | 'hl7Ack' | 'fhirOperationOutcome';

export interface RegistryFinding {
  severity: RegistryFindingSeverity;
  code?: string;
  message: string;
  /** Validation tier 1–4 when the sender says (SRS §7). */
  tier?: number;
  /** Where in the message (HL7 ERR-2, FHIR expression). */
  location?: string;
}

export interface RegistryAcknowledgement {
  submissionGuid: string;
  outcome: RegistryAckOutcome;
  findings: RegistryFinding[];
  format: RegistryAckFormat;
  /** Batch 425: the registry's own response code as the engine passes it on (e.g. AA, AE), for the transmission audit. */
  responseCode?: string;
  receivedAt: string;
  /** The message as received, kept for the exception worklist (SRS FR-008.7). */
  raw: string;
}

export type ParseAckResult =
  | { ok: true; ack: Omit<RegistryAcknowledgement, 'receivedAt'> }
  | { ok: false; reason: 'unparseable' | 'noSubmissionGuid' | 'notNormalizedJson' };

// ── The interface engine's status JSON ───────────────────────────────────────

const STATUS_JSON: Record<string, RegistryAckOutcome> = {
  ACCEPTED: 'accepted', ACCEPTED_WITH_WARNINGS: 'acceptedWithWarnings', REJECTED_RECOVERABLE: 'rejectedRecoverable', REJECTED_FATAL: 'rejectedFatal',
};

function parseStatusJson(raw: string, submissionGuid?: string): ParseAckResult {
  let body: any;
  try { body = JSON.parse(raw); } catch { return { ok: false, reason: 'unparseable' }; }
  const outcome = STATUS_JSON[String(body?.status ?? '').toUpperCase()];
  if (!outcome) return { ok: false, reason: 'unparseable' };
  const guid = submissionGuid || body.submissionGuid || body.submissionId;
  if (!guid) return { ok: false, reason: 'noSubmissionGuid' };
  const findings: RegistryFinding[] = (Array.isArray(body.findings) ? body.findings : []).map((x: any) => ({
    severity: ['FATAL', 'CRITICAL_REJECT', 'WARNING', 'INFORMATIONAL'].includes(x.severity) ? x.severity : 'CRITICAL_REJECT',
    ...(x.code ? { code: String(x.code) } : {}),
    message: String(x.message ?? 'Issue reported by the registry.'),
    ...(Number.isInteger(x.tier) ? { tier: x.tier } : {}),
    ...(x.location ? { location: String(x.location) } : {}),
  }));
  return { ok: true, ack: { submissionGuid: guid, outcome, findings, format: 'statusJson', ...((body.responseCode ?? body.ackCode) ? { responseCode: String(body.responseCode ?? body.ackCode) } : {}), raw } };
}

/** Batch 425: the engine's normalised JSON only. HL7 and FHIR are read by the engine, never here. */
export function parseRegistryAcknowledgement(format: string, raw: string, submissionGuid?: string): ParseAckResult {
  if (format !== 'statusJson') return { ok: false, reason: 'notNormalizedJson' };
  return parseStatusJson(raw, submissionGuid);
}

// ── A revision after acceptance (Batch 425) ──────────────────────────────────

export interface RegistryRevision {
  receivedAt: string;
  previousStatus: string;
  payloadHash: string;
  updatedFields: { field: string; value: string }[];
  responseCode?: string;
  /** The CAPA deficiency raised for it. */
  deficiencyId?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  raw: string;
}

export type ParseRevisionResult =
  | { ok: true; submissionGuid?: string; accessionId?: string; registryId?: string; revision: Omit<RegistryRevision, 'receivedAt'> }
  | { ok: false; reason: 'unparseable' | 'noSubmission' };

export function parseRegistryRevisionEvent(raw: string): ParseRevisionResult {
  let body: any;
  try { body = JSON.parse(raw); } catch { return { ok: false, reason: 'unparseable' }; }
  if (!isRegistryRevision(body)) return { ok: false, reason: 'unparseable' };
  const guid = body.submissionGuid ?? body.submissionId;
  if (!guid && !(body.accessionId && body.registryId)) return { ok: false, reason: 'noSubmission' };
  const updatedFields = Array.isArray(body.updatedFields)
    ? body.updatedFields.filter((f: any) => f && f.field).map((f: any) => ({ field: String(f.field), value: String(f.value ?? '') }))
    : Object.entries(body.revisedPayload && typeof body.revisedPayload === 'object' ? body.revisedPayload : {}).map(([field, value]) => ({ field, value: String(value ?? '') }));
  // Without the engine's hash, the revision's own content identifies it (so a repeat is a duplicate).
  const payloadHash = String(body.payloadHash ?? sha256Hex(JSON.stringify(updatedFields)));
  return {
    ok: true,
    ...(guid ? { submissionGuid: String(guid) } : {}),
    ...(body.accessionId ? { accessionId: String(body.accessionId) } : {}),
    ...(body.registryId ? { registryId: String(body.registryId) } : {}),
    revision: { previousStatus: String(body.previousStatus ?? ''), payloadHash, updatedFields, ...((body.ackCode ?? body.responseCode) ? { responseCode: String(body.ackCode ?? body.responseCode) } : {}), raw },
  };
}

/** Is this registry message a revision (either shape) rather than an answer? */
export function isRegistryRevision(body: any): boolean {
  return String(body?.status ?? '').toUpperCase() === 'REVISED' && (body.event === undefined || body.event === 'REGISTRY_RESPONSE_UPDATED');
}

// ── The status change ────────────────────────────────────────────────────────

const FINAL_ACCEPTED: RegistryLifecycleStatus[] = ['accepted', 'acceptedWithWarnings'];

export interface AckTransition {
  result: 'applied' | 'duplicate' | 'conflict';
  registryStatus: RegistryLifecycleStatus;
}

/** What an acknowledgement does to a submission's status. An accepted submission is never
 *  reopened by a later, different answer (that is recorded as a conflict for a person to look at);
 *  the same answer twice is a duplicate. Anything else takes the new answer. */
export function applyRegistryAcknowledgement(current: RegistryLifecycleStatus | undefined, ack: Pick<RegistryAcknowledgement, 'outcome'>): AckTransition {
  if (current && FINAL_ACCEPTED.includes(current)) {
    return current === ack.outcome ? { result: 'duplicate', registryStatus: current } : { result: 'conflict', registryStatus: current };
  }
  if (current === ack.outcome) return { result: 'duplicate', registryStatus: current };
  return { result: 'applied', registryStatus: ack.outcome };
}

// ── The 72-hour rule (SRS NFR-002) ───────────────────────────────────────────

export const REGISTRY_ESCALATION_HOURS = 72;

export interface EscalationCandidate {
  id: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  registryStatus?: RegistryLifecycleStatus;
  queuedAt: string;
  sentAt?: string;
  errorCode?: string;
  maxRetriesExceeded: boolean;
}

/** Which submissions have waited too long: sent but never acknowledged (→ ackOverdue), or
 *  failing to reach the interface engine (→ retries stopped, escalated to the worklist). */
export function registrySubmissionsToEscalate(entries: EscalationCandidate[], now: Date): { ackOverdue: string[]; deliveryAbandoned: string[] } {
  const limit = now.getTime() - REGISTRY_ESCALATION_HOURS * 3600_000;
  const older = (iso?: string) => !!iso && Date.parse(iso) < limit;
  return {
    ackOverdue: entries.filter(e => e.status === 'SENT' && e.registryStatus === 'awaitingAck' && older(e.sentAt)).map(e => e.id),
    deliveryAbandoned: entries.filter(e => e.status === 'FAILED' && !e.maxRetriesExceeded && (e.errorCode ?? '').startsWith('DISPATCH_') && older(e.queuedAt)).map(e => e.id),
  };
}
