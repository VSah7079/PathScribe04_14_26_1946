// src/services/liveUpdates/liveUpdateContract.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-262: the wire contract between PathScribe's browser clients and the
// live-update hub on the PathScribe API server (ASP.NET Core SignalR;
// Pete, Sep 26, 2026). This file is the source of truth for the .NET
// side; docs/architecture/LIVE_UPDATES_SIGNALR.md describes the hub.
//
// Batch 346→347 (PS-54): a second event, PrintJobStatus, tells the user
// who sent a network print job what the interface engine reported (printed,
// or why not). It goes only to that user's connections, so it needs no scope.
//
// Events carry identifiers only — never patient names, MRNs or diagnoses.
// OR wall displays are shared screens, and a client that receives an
// event re-reads the data through the normal (authorised) service call,
// so an event never grants access to anything.
// ─────────────────────────────────────────────────────────────────────────────
import type { ExportStatus, ExportStatusEvent } from '../exports/asyncExportContract';
import { DATA_KEY_MAX_LENGTH, isDataTopic, isKeyedDataTopic, type DataChangedEvent } from './dataTopics';

/** Hub path on the API server, relative to its base URL. */
export const LIVE_UPDATES_HUB_PATH = '/hubs/live';

/** Contract version carried on every event; a client ignores other versions. */
export const LIVE_UPDATES_CONTRACT_VERSION = 1;

/** Client → server: replace this connection's intraoperative scope. */
export const HUB_SET_INTRAOP_SCOPE = 'SetIntraopScope';
/** Server → client: an intraoperative session or specimen changed. */
export const HUB_INTRAOP_CHANGED = 'IntraopChanged';

/** What changed. The server sends one event per committed write. */
export type IntraopChangeKind =
  | 'session.created'      // a new frozen-section session (Intraop Queue)
  | 'specimen.added'       // a specimen added to a session
  | 'specimen.progressed'  // milestone, preparation output or image recorded
  | 'diagnosis.rendered'   // the frozen-section diagnosis was entered
  | 'verbal.reported'      // the verbal report to the surgeon was logged
  | 'specimen.dismissed'   // dismissed from the OR board
  | 'session.merged';      // merged into a case (leaves the boards)

export const INTRAOP_CHANGE_KINDS: readonly IntraopChangeKind[] = [
  'session.created', 'specimen.added', 'specimen.progressed', 'diagnosis.rendered',
  'verbal.reported', 'specimen.dismissed', 'session.merged',
];

export interface IntraopChangedEvent {
  v: typeof LIVE_UPDATES_CONTRACT_VERSION;
  /** Unique per event (the server's outbox row id); lets clients drop duplicates. */
  eventId: string;
  kind: IntraopChangeKind;
  sessionId: string;
  specimenId?: string;
  /** The session's OR location, when it has one. Boards subscribe by location. */
  locationId?: string;
  facilityId?: string;
  /** Server commit time (ISO 8601, UTC). */
  occurredAt: string;
}

/**
 * A connection's subscription. `locationIds` are the OR locations whose
 * boards it shows; `all` asks for every intraoperative change in the
 * tenant (the Intraop Queue). The server narrows both to what the
 * connection is authorised to see and replies with what it accepted.
 */
export interface IntraopScope {
  locationIds: string[];
  all: boolean;
}

export interface SetIntraopScopeResult {
  acceptedLocationIds: string[];
  rejectedLocationIds: string[];
  all: boolean;
}

/** Validates an event received from the wire; anything else is ignored. */
export function parseIntraopChangedEvent(raw: unknown): IntraopChangedEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (e.v !== LIVE_UPDATES_CONTRACT_VERSION) return null;
  if (typeof e.eventId !== 'string' || !e.eventId) return null;
  if (typeof e.sessionId !== 'string' || !e.sessionId) return null;
  if (typeof e.kind !== 'string' || !(INTRAOP_CHANGE_KINDS as readonly string[]).includes(e.kind)) return null;
  if (typeof e.occurredAt !== 'string') return null;
  for (const k of ['specimenId', 'locationId', 'facilityId'] as const) {
    if (e[k] !== undefined && typeof e[k] !== 'string') return null;
  }
  return {
    v: LIVE_UPDATES_CONTRACT_VERSION,
    eventId: e.eventId,
    kind: e.kind as IntraopChangeKind,
    sessionId: e.sessionId,
    ...(e.specimenId ? { specimenId: e.specimenId as string } : {}),
    ...(e.locationId ? { locationId: e.locationId as string } : {}),
    ...(e.facilityId ? { facilityId: e.facilityId as string } : {}),
    occurredAt: e.occurredAt,
  };
}


// ── Network print results (Batch 347, PS-54) ────────────────────────────────

/** Server → client: the interface engine reported on a network print job. */
export const HUB_PRINT_JOB_STATUS = 'PrintJobStatus';

/** What the engine can report (the NetworkPrintCallback statuses). */
export const PRINT_JOB_STATUSES = [
  'PRINT_SUCCESS', 'PRINTER_UNREACHABLE', 'PAPER_OUT', 'RIBBON_OUT', 'HEAD_OPEN', 'MALFORMED_ZPL', 'INVALID_GS1',
] as const;
export type PrintJobStatusCode = typeof PRINT_JOB_STATUSES[number];

export interface PrintJobStatusEvent {
  v: typeof LIVE_UPDATES_CONTRACT_VERSION;
  /** Unique per event (the server's outbox row id); lets clients drop duplicates. */
  eventId: string;
  /** The job's eventId from the NetworkPrintPayload the browser sent. */
  jobId: string;
  /** The payload's idempotencyKey (the same for every attempt at one label). */
  idempotencyKey: string;
  status: PrintJobStatusCode;
  /** The engine's own wording, for the audit trail. Printer text only, never PHI. */
  printerResponse?: string;
  durationMs?: number;
  /** When the engine reported (ISO 8601, UTC). */
  occurredAt: string;
}

/** Validates a print result received from the wire; anything else is ignored. */
export function parsePrintJobStatusEvent(raw: unknown): PrintJobStatusEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (e.v !== LIVE_UPDATES_CONTRACT_VERSION) return null;
  for (const k of ['eventId', 'jobId', 'idempotencyKey', 'occurredAt'] as const) {
    if (typeof e[k] !== 'string' || !e[k]) return null;
  }
  if (typeof e.status !== 'string' || !(PRINT_JOB_STATUSES as readonly string[]).includes(e.status)) return null;
  if (e.printerResponse !== undefined && typeof e.printerResponse !== 'string') return null;
  if (e.durationMs !== undefined && (typeof e.durationMs !== 'number' || !Number.isFinite(e.durationMs))) return null;
  return {
    v: LIVE_UPDATES_CONTRACT_VERSION,
    eventId: e.eventId as string,
    jobId: e.jobId as string,
    idempotencyKey: e.idempotencyKey as string,
    status: e.status as PrintJobStatusCode,
    ...(typeof e.printerResponse === 'string' ? { printerResponse: e.printerResponse } : {}),
    ...(typeof e.durationMs === 'number' ? { durationMs: e.durationMs } : {}),
    occurredAt: e.occurredAt as string,
  };
}


// ── WSI scan batches (Batch 434) ────────────────────────────────────────────

/** Server → client: a WSI scan batch changed (loaded, sent, a slide's scan
 *  status came back from the scanner, unloaded). Ids only; the Slide scanning
 *  page re-reads. The server sends it to users who can open Batch Management
 *  in the batch's lab (the scanner's lab). */
export const HUB_WSI_SCAN_BATCH_CHANGED = 'WsiScanBatchChanged';

export const WSI_SCAN_BATCH_CHANGES = ['loaded', 'sent', 'sendFailed', 'slideStatus', 'unloaded'] as const;
export type WsiScanBatchChange = typeof WSI_SCAN_BATCH_CHANGES[number];

export interface WsiScanBatchChangedEvent {
  v: typeof LIVE_UPDATES_CONTRACT_VERSION;
  eventId: string;
  batchId: string;
  change: WsiScanBatchChange;
  /** The batch's lab (the scanner's), when known. */
  facilityId?: string;
  occurredAt: string;
}

/** Validates a scan-batch change received from the wire; anything else is ignored. */
export function parseWsiScanBatchChangedEvent(raw: unknown): WsiScanBatchChangedEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (e.v !== LIVE_UPDATES_CONTRACT_VERSION) return null;
  for (const k of ['eventId', 'batchId', 'occurredAt'] as const) {
    if (typeof e[k] !== 'string' || !e[k]) return null;
  }
  if (typeof e.change !== 'string' || !(WSI_SCAN_BATCH_CHANGES as readonly string[]).includes(e.change)) return null;
  if (e.facilityId !== undefined && typeof e.facilityId !== 'string') return null;
  return {
    v: LIVE_UPDATES_CONTRACT_VERSION,
    eventId: e.eventId as string,
    batchId: e.batchId as string,
    change: e.change as WsiScanBatchChange,
    ...(typeof e.facilityId === 'string' ? { facilityId: e.facilityId } : {}),
    occurredAt: e.occurredAt as string,
  };
}

// ── Report delivery status (Batch 521, PS-281) ──────────────────────────────

/** Server → client: what a fax provider reported about a fax the interface
 *  server submitted (PS-281 §3.2.3: confirmation down to transmission). The
 *  queue entry is the report delivery queue's; ids and status only, no PHI.
 *  The server sends it when the provider's transmission report comes in (its
 *  webhook, or the report email to the sending address). */
export const HUB_REPORT_DELIVERY_STATUS = 'ReportDeliveryStatus';

export const REPORT_DELIVERY_STATUSES = ['TRANSMITTED', 'TRANSMISSION_FAILED'] as const;
export type ReportDeliveryStatusCode = typeof REPORT_DELIVERY_STATUSES[number];

export interface ReportDeliveryStatusEvent {
  v: typeof LIVE_UPDATES_CONTRACT_VERSION;
  eventId: string;
  queueEntryId: string;
  status: ReportDeliveryStatusCode;
  /** The provider's own words (e.g. "Busy", "No answer"), when it gave any. */
  detail?: string;
  occurredAt: string;
}

/** Validates a report delivery status received from the wire; anything else is ignored. */
export function parseReportDeliveryStatusEvent(raw: unknown): ReportDeliveryStatusEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (e.v !== LIVE_UPDATES_CONTRACT_VERSION) return null;
  for (const k of ['eventId', 'queueEntryId', 'occurredAt'] as const) {
    if (typeof e[k] !== 'string' || !e[k]) return null;
  }
  if (typeof e.status !== 'string' || !(REPORT_DELIVERY_STATUSES as readonly string[]).includes(e.status)) return null;
  if (e.detail !== undefined && typeof e.detail !== 'string') return null;
  return {
    v: LIVE_UPDATES_CONTRACT_VERSION,
    eventId: e.eventId as string,
    queueEntryId: e.queueEntryId as string,
    status: e.status as ReportDeliveryStatusCode,
    ...(typeof e.detail === 'string' ? { detail: e.detail } : {}),
    occurredAt: e.occurredAt as string,
  };
}

// ── Exports (Batch 550, PS-539 phase 2d; ASYNC_EXPORT_API.md §5) ────────────
/** Hub → client: one of the requester's exports changed status. Sent with
 *  `Clients.User(userId)` to the requester only, like PrintJobStatus. The
 *  payload is `ExportStatusEvent` (services/exports/asyncExportContract.ts):
 *  ids, status, the title built from the screen and date, and the row count.
 *  No patient data. */
export const HUB_EXPORT_STATUS = 'ExportStatus';

const EXPORT_EVENT_STATUSES: readonly ExportStatus[] = ['queued', 'running', 'ready', 'failed', 'cancelled', 'expired'];

/** Validates an export status received from the wire; anything else is ignored. */
export function parseExportStatusEvent(raw: unknown): ExportStatusEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (e.type !== HUB_EXPORT_STATUS || e.v !== LIVE_UPDATES_CONTRACT_VERSION) return null;
  for (const k of ['eventId', 'exportId', 'title'] as const) {
    if (typeof e[k] !== 'string' || !e[k]) return null;
  }
  if (typeof e.status !== 'string' || !EXPORT_EVENT_STATUSES.includes(e.status as ExportStatus)) return null;
  if (e.rowCount !== undefined && (typeof e.rowCount !== 'number' || !Number.isFinite(e.rowCount) || e.rowCount < 0)) return null;
  return {
    type: 'ExportStatus',
    v: LIVE_UPDATES_CONTRACT_VERSION,
    eventId: e.eventId as string,
    exportId: e.exportId as string,
    status: e.status as ExportStatus,
    title: e.title as string,
    ...(typeof e.rowCount === 'number' ? { rowCount: e.rowCount } : {}),
  };
}

// ─── Batch 559: data topics (dataTopics.ts) ──────────────────────────────────

/** Client → server: replace this connection's data topics (DataTopicScope). Answers SetDataTopicsResult. */
export const HUB_SET_DATA_TOPICS = 'SetDataTopics';
/** Server → client: something a topic's screen shows changed; the screen re-reads (DataChangedEvent). */
export const HUB_DATA_CHANGED = 'DataChanged';


/** Validates a DataChanged event from the wire; anything else is ignored. A keyed topic's event must name its key. */
export function parseDataChangedEvent(raw: unknown): DataChangedEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (e.type !== HUB_DATA_CHANGED || e.v !== LIVE_UPDATES_CONTRACT_VERSION) return null;
  if (typeof e.eventId !== 'string' || !e.eventId || !isDataTopic(e.topic)) return null;
  if (typeof e.occurredAt !== 'string' || Number.isNaN(Date.parse(e.occurredAt))) return null;
  const key = typeof e.key === 'string' ? e.key.trim() : undefined;
  if (e.key !== undefined && (!key || key.length > DATA_KEY_MAX_LENGTH)) return null;
  if (isKeyedDataTopic(e.topic) && !key) return null;
  return {
    type: 'DataChanged', v: LIVE_UPDATES_CONTRACT_VERSION, eventId: e.eventId, topic: e.topic,
    ...(key && isKeyedDataTopic(e.topic) ? { key } : {}),
    occurredAt: e.occurredAt,
  };
}
