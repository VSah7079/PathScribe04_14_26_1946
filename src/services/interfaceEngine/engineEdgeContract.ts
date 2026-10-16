// src/services/interfaceEngine/engineEdgeContract.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 545 (PS-539 phase 2c). The contract between the interface engine
// (BridgeLink) and the PathScribe API: the source of truth for
// docs/architecture/INTERFACE_ENGINE_EDGE.md. Pure: types, constants and the
// rules both sides apply. The India team builds the API side; the engine's
// channels are configured from it.
//
// Decision D6 (Pete, Oct 13, 2026): the engine runs both ways, per hospital,
// from the same container image: hosted by ForMedrixAI in the tenant's region,
// or installed in the hospital. Nothing here depends on where it runs, except
// how outbound work reaches it (pushed to a hosted engine, pulled by an
// on-site one, §5 of the doc).
// ─────────────────────────────────────────────────────────────────────────────
import type { InstanceRole } from '../deployment/deploymentInstance';

/** Bumped when a field changes meaning or is removed; added optional fields don't bump it. */
export const ENGINE_EDGE_CONTRACT_VERSION = 1;

/** Where this engine runs (D6). Reported in the heartbeat; the rules are the same either way. */
export type EngineHosting = 'cloud' | 'onsite';

/**
 * When the engine acknowledges an inbound message to the hospital, when the
 * sender's MSH-15/MSH-16 don't say (they win when present):
 *   - 'accept': once the message is in durable storage. An original-mode AA
 *     then means "stored", not "applied"; the hospital is told so at go-live.
 *   - 'application': once the API has answered, so an AE/AR carries
 *     PathScribe's reason.
 * Never on receipt alone (§6.2 rule 1).
 */
export type AckMode = 'accept' | 'application';

/** MSH-15 / MSH-16: when the sender asks for each enhanced-mode ACK. */
export type HL7AckCondition = 'AL' | 'NE' | 'ER' | 'SU';

/** MSH-11 processing ID: production, training, debugging. */
export type HL7ProcessingId = 'P' | 'T' | 'D';

/** `POST /api/interface/inbound`: one message from the engine, as normalised JSON (the engine parses HL7). */
export interface EngineInboundEnvelope {
  v: number;
  /** The performing-lab tenant. Must equal the tenant of the engine's credential (else 403). */
  tenantId: string;
  /** The ordering or sending facility, when the message names one. */
  facilityId?: string;
  /** The engine channel it came in on. */
  channelId: string;
  /** The sending system (MSH-3 + MSH-4, as configured on the channel); checked against the tenant's registered senders. */
  sourceSystem: string;
  /** MSH-10. With tenantId and sourceSystem, the idempotency key. */
  messageControlId: string;
  /** MSH-9, e.g. "ADT^A08", "ORM^O01". */
  messageType: string;
  /** MSH-11: a 'T' or 'D' message never reaches a production instance, nor 'P' a validation one. */
  processingId: HL7ProcessingId;
  /** MSH-12, e.g. "2.5.1". */
  hl7Version: string;
  /**
   * The event time, ISO 8601 **with an offset**: EVN-2/EVN-6 for ADT where
   * present, else MSH-7. MSH-7's offset is optional in HL7, so the engine
   * applies the sending system's time zone (set on the channel) before
   * sending; a value without an offset is refused (422).
   */
  messageDateTime: string;
  /** When the engine stored it. */
  receivedAt: string;
  /** What messages are kept in order by: an MRN qualified by its assigning authority (PID-3.4), else the order or accession number. */
  orderingKey: string;
  /** The engine's id for the raw message in its store (PHI, encrypted); PathScribe keeps only this reference. */
  rawMessageRef: string;
  ackMode: AckMode;
  /** MSH-15 and MSH-16, when the sender filled them in. */
  acceptAckType?: HL7AckCondition;
  applicationAckType?: HL7AckCondition;
  /** The message, normalised to the JSON the API takes for this message type. */
  payload: Record<string, unknown>;
}

/** What the API answers. Each outcome has one status code and one thing the engine does next. */
export type InboundOutcome = 'applied' | 'duplicate' | 'retryLater' | 'rejected' | 'unauthorized';

export type EngineAction =
  | 'ack'            // done: AA to the hospital (application mode), message settled
  | 'retry'          // keep it, try again on the retry schedule (in order: the key waits), up to INBOUND_RETRY.maxAgeHours
  | 'deadLetter'     // stop: AE/AR to the hospital (application mode), dead letter, alert, release the key
  | 'reauthenticate' // get a new token and retry once; a second refusal stops the channel
  | 'stopAndAlert';  // pause the channel with its queue kept, and alert: configuration or credentials are wrong

export const INBOUND_RESPONSES: Record<InboundOutcome, { status: number; action: EngineAction }> = {
  applied:      { status: 200, action: 'ack' },
  duplicate:    { status: 200, action: 'ack' },          // already applied: same answer as the first time
  retryLater:   { status: 409, action: 'retry' },        // e.g. the case or patient isn't there yet; nothing was written
  rejected:     { status: 422, action: 'deadLetter' },   // can never succeed as sent
  unauthorized: { status: 401, action: 'reauthenticate' },
};

/** The body of a 422: a code and plain English (no patient data), and which HL7 ACK the hospital gets in application mode. */
export interface InboundRejection {
  code: string;
  message: string;
  /** AR for a message the API can't take at all (type, version, processing ID); AE for an error in its content. */
  hl7Ack: 'AE' | 'AR';
}

/**
 * What the engine does with any HTTP status from the API, when the body
 * names no outcome (it reads `outcome` first when there is one).
 *   - 404 means "not there yet, retry" only on today's webhooks
 *     (api/webhooks/engine), which answer 404 for a case that doesn't exist
 *     yet. On the API a 404 means a wrong address: a configuration fault.
 *   - 401: a token can expire, so get a new one and retry once.
 *   - 403, 407 (a hospital proxy wants credentials): configuration; pause.
 *   - 429 and 503 honour Retry-After.
 */
export function engineActionForStatus(status: number, opts: { legacyWebhook?: boolean } = {}): EngineAction {
  if (status >= 200 && status < 300) return 'ack';
  if (status === 401) return 'reauthenticate';
  if (status === 403 || status === 407) return 'stopAndAlert';
  if (status === 404) return opts.legacyWebhook ? 'retry' : 'stopAndAlert';
  if (status === 408 || status === 409 || status === 425 || status === 429 || status >= 500) return 'retry';
  return 'deadLetter';
}

export const INBOUND_RETRY = {
  /** Waits between retries, in seconds; the last repeats. */
  backoffSeconds: [10, 30, 60, 300, 900] as readonly number[],
  /**
   * A message still not applied this long after its first attempt is
   * dead-lettered, alerted and its key released, so one message can't hold
   * its key (and, for a sender waiting on each ACK, the whole feed) for ever.
   */
  maxAgeHours: 24,
  /** In application mode, the longest the engine holds the hospital's ACK; then it sends a commit ACK and settles the message on its own. */
  applicationAckBudgetSeconds: 30,
} as const;

/** Whether a message that keeps being retried has run out of time. */
export function inboundRetryExpired(firstAttemptAt: string, now: Date, maxAgeHours: number = INBOUND_RETRY.maxAgeHours): boolean {
  return now.getTime() - new Date(firstAttemptAt).getTime() > maxAgeHours * 3_600_000;
}

/**
 * The key a message is applied once by. MSH-10 is unique per sending system
 * only, so the tenant and system are part of it. Encoded so a part containing
 * the separator can't collide (sourceSystem itself contains '|'); the server
 * stores the three as a composite unique key.
 */
export function inboundIdempotencyKey(e: Pick<EngineInboundEnvelope, 'tenantId' | 'sourceSystem' | 'messageControlId'>): string {
  return JSON.stringify([e.tenantId.trim(), e.sourceSystem.trim(), e.messageControlId.trim()]);
}

const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/;

/**
 * Whether an inbound update is older than the one PathScribe applied last
 * for the same record and sending system. It compares the two messages' own
 * event times, never the server's clock (a backlog would otherwise drop valid
 * updates). Equal times are 'current': the engine keeps each key in order, so
 * the later arrival is the later message. A time without an offset, or not a
 * time, is 'invalid' (422).
 */
export function updateStaleness(messageDateTime: string, lastAppliedMessageDateTime: string | undefined): 'stale' | 'current' | 'invalid' {
  const t = Date.parse(messageDateTime);
  if (!HAS_OFFSET.test(messageDateTime.trim()) || Number.isNaN(t)) return 'invalid';
  if (!lastAppliedMessageDateTime) return 'current';
  const last = Date.parse(lastAppliedMessageDateTime);
  return !Number.isNaN(last) && t < last ? 'stale' : 'current';
}

/** Why a message's processing ID doesn't belong on this instance, or null (as registryPayloadBoundary.ts does outbound). */
export function processingIdProblem(processingId: HL7ProcessingId, role: InstanceRole): string | null {
  if (role === 'production' && processingId !== 'P') return 'PROCESSING_ID_NOT_PRODUCTION';
  if (role === 'validation' && processingId === 'P') return 'PRODUCTION_MESSAGE_ON_VALIDATION';
  return null;
}

// ─── Outbound: the API hands a message to the engine ─────────────────────────

/** HL7 acknowledgement codes (MSA-1): original mode AA/AE/AR, enhanced mode CA/CE/CR. */
export type HL7AckCode = 'AA' | 'AE' | 'AR' | 'CA' | 'CE' | 'CR';

/** `POST /api/interface/outbound-acks`: one answer about one outbound message, from the engine. */
export interface EngineOutboundAck {
  v: number;
  /** The queue entry (the envelope's queueEntryId, dispatchInterfaceMessage.ts). The outbound MSH-10 is fixed per entry, so a resend is recognisable. */
  queueEntryId: string;
  channelId: string;
  /** Which send this answers (1 = first). The engine resends from its stored copy and reports each attempt. */
  attempt: number;
  /** 'accept' for an enhanced-mode commit ACK; 'application' for an original-mode or enhanced application ACK. */
  stage: 'accept' | 'application';
  /** null when the receiver never answered within the channel's time-out. */
  ackCode: HL7AckCode | null;
  /** MSA-3 / ERR. Receivers often echo identifiers here, so it is stored as PHI and never written to an audit `detail`. */
  ackText?: string;
  ackedAt: string;
}

export type OutboundOutcome = 'sent' | 'awaitingApplicationAck' | 'retry' | 'failed';

/**
 * What an outbound answer means for the queue entry (a channel may override a
 * code for a receiver known to misuse it):
 *   - AA: sent.
 *   - CA: stored by the receiver; sent, unless an application ACK was asked
 *     for (MSH-16), which then settles it.
 *   - no answer: retry. The receiver may have processed it, so the engine
 *     resends the same message with the same MSH-10.
 *   - AR (original mode: rejected, including for reasons unrelated to the
 *     content, such as the receiver being down) and CE (commit error, usually
 *     temporary): retry, within the retry window.
 *   - AE (the receiver's application refused the content) and CR (the
 *     message type, version or processing ID is unacceptable): failed at once;
 *     sending it again unchanged won't help. A person corrects and resends it.
 */
export function outboundOutcomeForAck(ackCode: HL7AckCode | null, applicationAckRequested = false): OutboundOutcome {
  if (ackCode === 'AA') return 'sent';
  if (ackCode === 'CA') return applicationAckRequested ? 'awaitingApplicationAck' : 'sent';
  if (ackCode === null || ackCode === 'AR' || ackCode === 'CE') return 'retry';
  return 'failed';
}

/**
 * Outbound resends are the engine's (it holds the stored copy), within a time
 * window per transaction family, long enough to ride out an EHR's downtime.
 * Separate from the hand-over job's own retries (MESSAGE_BUS_API.md,
 * `interface.dispatch`), which only get the message to the engine.
 */
export const OUTBOUND_RETRY = {
  backoffMinutes: [1, 5, 15, 60] as readonly number[], // then every 60 minutes
  defaultWindowHours: 24,
  /** Registry submissions keep the 72-hour escalation they already have (REGISTRY_ACKNOWLEDGEMENT_API.md). */
  registryWindowHours: 72,
} as const;

// ─── Health ──────────────────────────────────────────────────────────────────

/**
 * The two endpoints every engine container answers, cloud or on site (D6:
 * the same checks, the same answers). Unauthenticated, on the engine's
 * management port, no patient data; 200 when every check passes, 503
 * otherwise, with an EngineHealthResponse body.
 */
export const ENGINE_HEALTH_ENDPOINTS = {
  /** The process is up. Used to restart a hung container. */
  live: '/health/live',
  /** It can take messages: the message store is writable and every enabled listener is bound. The API being unreachable doesn't make it unready (it stores and forwards); it shows in the heartbeat. */
  ready: '/health/ready',
} as const;

export interface EngineHealthResponse {
  status: 'pass' | 'fail';
  checks: { name: 'process' | 'messageStore' | 'listeners'; status: 'pass' | 'fail'; detail?: string }[];
}

export const ENGINE_HEALTH_LIMITS = {
  /** The engine posts a heartbeat this often. */
  heartbeatSeconds: 60,
  /** No heartbeat received for this long (by the server's clock): offline. */
  offlineAfterSeconds: 180,
  /** A message waiting longer than this makes the engine degraded. */
  maxQueuedAgeMinutes: 15,
  /** Less free disk than this: degraded (the store and forward backlog needs room). */
  minDiskFreePercent: 15,
  /** A certificate expiring sooner than this: degraded, so it's renewed in time. */
  certWarningDays: 14,
} as const;

export interface EngineChannelStatus {
  channelId: string;
  direction: 'inbound' | 'outbound';
  state: 'started' | 'stopped' | 'paused' | 'error';
  /** Messages waiting (stored, not yet settled). */
  queued: number;
  /** How long the oldest has waited, measured by the engine (an age, so the engine's clock doesn't matter). */
  oldestQueuedAgeSeconds?: number;
  /** Dead letters not yet resolved. */
  deadLetters: number;
}

/** `POST /api/interface/heartbeat`, every heartbeatSeconds. No patient data. The tenant is taken from the credential. */
export interface EngineHeartbeat {
  v: number;
  engineInstanceId: string;
  hosting: EngineHosting;
  /** The container image tag: the same image runs in the cloud and on site. */
  imageVersion: string;
  /** Whether the engine reached the API on its last call (false while it stores and forwards). */
  apiReachable: boolean;
  diskFreePercent: number;
  /** The soonest expiry among its TLS / MLLP-TLS certificates and its client credential. */
  certExpiresAt?: string;
  channels: EngineChannelStatus[];
}

/** 'attention': working, but dead letters wait for a person. 'degraded': something is wrong now. */
export type EngineStatus = 'online' | 'attention' | 'degraded' | 'offline';

/** How the Interfaces views show an engine, from its last heartbeat and when the server received it. */
export function engineStatus(last: { heartbeat: EngineHeartbeat; receivedAt: string } | undefined, now: Date): EngineStatus {
  if (!last || !last.heartbeat) return 'offline';
  // Batch 554: a time that can't be read is never taken as "recent" (it would never go offline).
  const age = (now.getTime() - new Date(last.receivedAt).getTime()) / 1000;
  if (!Number.isFinite(age) || age > ENGINE_HEALTH_LIMITS.offlineAfterSeconds) return 'offline';
  const hb = last.heartbeat;
  const channels = Array.isArray(hb.channels) ? hb.channels : [];
  const certAt = hb.certExpiresAt ? new Date(hb.certExpiresAt).getTime() : NaN;
  const certSoon = !!hb.certExpiresAt && (!Number.isFinite(certAt) || certAt - now.getTime() < ENGINE_HEALTH_LIMITS.certWarningDays * 86_400_000);
  // Batch 554: a stopped channel (a listener that isn't taking messages) is degraded too.
  const degraded = !hb.apiReachable || certSoon || !(hb.diskFreePercent >= ENGINE_HEALTH_LIMITS.minDiskFreePercent)
    || channels.some(c => c.state === 'error' || c.state === 'paused' || c.state === 'stopped'
      || (c.oldestQueuedAgeSeconds ?? 0) > ENGINE_HEALTH_LIMITS.maxQueuedAgeMinutes * 60);
  if (degraded) return 'degraded';
  return channels.some(c => c.deadLetters > 0) ? 'attention' : 'online';
}
