// src/services/exports/asyncExportContract.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 542 (PS-539 phase 2c, decision D7, Pete, Oct 13, 2026: "request it,
// get notified, download it"). The wire contract for asynchronous exports,
// the source of truth for docs/architecture/ASYNC_EXPORT_API.md. Pure: types,
// the export kinds and their capabilities, limits, and the status rules. The
// API server implements it (the India team); the browser switches its export
// buttons to it in phase 2d.
//
// Every export the app offers has a capability of its own (Pete: one per
// report; services/printing/exportGate.ts and the QA tabs check them today).
// Each becomes an export kind here, with the same capability, checked when the
// export is requested and again when the file is downloaded.
// ─────────────────────────────────────────────────────────────────────────────

/** How the capability is checked for this export: as today in the browser (exportGate.ts, the QA tabs, the services). */
export type ExportScope =
  | 'facility'    // one facility, or "all" (needs an assignment covering all): the QA reports, disposal. Since Batch 544
                  // (Pete, Oct 13) every QA report with facility rows can be exported for one facility; the enterprise
                  // rollup, management reviews and patient match stay "all" (ASYNC_EXPORT_API.md §2).
  | 'enterprise'  // checked without a facility today (the Audit Log's five logs, case search); rows are still filtered by access
  | 'case'        // one case (its report change history)
  | 'self';       // the requester's own records (My Contributions)

export interface ExportKindDefinition {
  capability: string;
  scope: ExportScope;
  formats: readonly ExportFormat[];
}

/** CSV today for every export (the browser offers no JSON export of these); JSON is reserved for a kind that adds it. */
export type ExportFormat = 'csv' | 'json';

/** Every export kind, keyed `domain.object` from its capability `domain:object:export`. */
export const EXPORT_KINDS = {
  'audit.audit-log':                   { capability: 'audit:audit-log:export', scope: 'enterprise', formats: ['csv'] },
  'audit.billing-log':                 { capability: 'audit:billing-log:export', scope: 'enterprise', formats: ['csv'] },
  'audit.error-log':                   { capability: 'audit:error-log:export', scope: 'enterprise', formats: ['csv'] },
  'audit.interface-log':               { capability: 'audit:interface-log:export', scope: 'enterprise', formats: ['csv'] },
  'audit.qa-log':                      { capability: 'audit:qa-log:export', scope: 'enterprise', formats: ['csv'] },
  'contribution.case-mix-summary':     { capability: 'contribution:case-mix-summary:export', scope: 'self', formats: ['csv'] },
  'contribution.trainee-case-reference': { capability: 'contribution:trainee-case-reference:export', scope: 'self', formats: ['csv'] },
  'qa.access-request-response':        { capability: 'qa:access-request-response:export', scope: 'facility', formats: ['csv'] },
  'qa.activity-dashboard':             { capability: 'qa:activity-dashboard:export', scope: 'facility', formats: ['csv'] },
  'qa.billing-deficiencies':           { capability: 'qa:billing-deficiencies:export', scope: 'facility', formats: ['csv'] },
  'qa.countersign-turnaround':         { capability: 'qa:countersign-turnaround:export', scope: 'facility', formats: ['csv'] },
  'qa.cytology-histology-correlation': { capability: 'qa:cytology-histology-correlation:export', scope: 'facility', formats: ['csv'] },
  'qa.deficiencies':                   { capability: 'qa:deficiencies:export', scope: 'facility', formats: ['csv'] },
  'qa.drift-correction':               { capability: 'qa:drift-correction:export', scope: 'facility', formats: ['csv'] },
  'qa.enterprise-rollup':              { capability: 'qa:enterprise-rollup:export', scope: 'facility', formats: ['csv'] },
  'qa.follow-up':                      { capability: 'qa:follow-up:export', scope: 'facility', formats: ['csv'] },
  'qa.fppe-tracking':                  { capability: 'qa:fppe-tracking:export', scope: 'facility', formats: ['csv'] },
  'qa.inspection-evidence':            { capability: 'qa:inspection-evidence:export', scope: 'facility', formats: ['csv'] },
  'qa.intraop-linkage':                { capability: 'qa:intraop-linkage:export', scope: 'facility', formats: ['csv'] },
  'qa.management-reviews':             { capability: 'qa:management-reviews:export', scope: 'facility', formats: ['csv'] },
  'qa.patient-match-review':           { capability: 'qa:patient-match-review:export', scope: 'facility', formats: ['csv'] },
  'qa.reconciliation':                 { capability: 'qa:reconciliation:export', scope: 'facility', formats: ['csv'] },
  'qa.registry-transmission-audit':    { capability: 'qa:registry-transmission-audit:export', scope: 'facility', formats: ['csv'] },
  'report.change-history':             { capability: 'report:change-history:export', scope: 'case', formats: ['csv'] },
  'retention.disposal-report':         { capability: 'retention:disposal-report:export', scope: 'facility', formats: ['csv'] },
  'search.case-results':               { capability: 'search:case-results:export', scope: 'enterprise', formats: ['csv'] },
} as const satisfies Record<string, ExportKindDefinition>;

export type ExportKind = keyof typeof EXPORT_KINDS;

export const EXPORT_LIMITS = {
  /** The most rows one export may hold; more is refused at request time with the count. */
  maxRows: 1_000_000,
  /** Exports one user may have queued or running at once. */
  maxOpenPerUser: 3,
  /** How long a finished file is kept before it is deleted (days). */
  defaultRetentionDays: 7,
  maxRetentionDays: 30,
  /** How long a download link works (minutes). A new link is issued on each download request. */
  downloadLinkMinutes: 15,
  /** The browser waits this long for a quick export and then downloads it straight away (no extra click). */
  inlineWaitMs: 3_000,
  /** A build that runs longer than this is stopped and failed (minutes). Longer than a serverless function may run
   *  (Azure Functions Consumption 10 min, AWS Lambda 15 min), so export builds run on an always-on worker. */
  buildTimeoutMinutes: 30,
} as const;

export type ExportStatus = 'queued' | 'running' | 'ready' | 'failed' | 'cancelled' | 'expired';

/** The states each status can move to. A build that fails once and is retried stays 'running' between its two attempts. */
export const EXPORT_TRANSITIONS: Record<ExportStatus, readonly ExportStatus[]> = {
  queued:    ['running', 'cancelled', 'failed'],
  running:   ['ready', 'failed', 'cancelled'],
  ready:     ['expired'],
  failed:    [],
  cancelled: [],
  expired:   [],
};

export function canTransition(from: ExportStatus, to: ExportStatus): boolean {
  return EXPORT_TRANSITIONS[from].includes(to);
}

/** `POST /api/exports` */
export interface ExportRequest {
  kind: ExportKind;
  format: ExportFormat;
  /** The screen's filters, as that screen's own API takes them (e.g. CaseSearchCriteria). Stored with the export. */
  parameters: Record<string, unknown>;
  /** 'all' or one facility id, for a facility-scoped kind. */
  facilityId?: string;
  /** The file name the user sees (no path); the server adds the date and the extension. */
  title: string;
}

/** `GET /api/exports/{id}` and the items of `GET /api/exports`. */
export interface ExportJob {
  exportId: string;
  kind: ExportKind;
  format: ExportFormat;
  title: string;
  status: ExportStatus;
  requestedBy: { userId: string; userName: string };
  requestedAt: string;
  startedAt?: string;
  finishedAt?: string;
  /** Rows written (when ready) and the total that matched. */
  rowCount?: number;
  /** When the file is deleted (ready only). */
  expiresAt?: string;
  /** SHA-256 of the file, lower-case hex (ready only). */
  sha256?: string;
  byteLength?: number;
  /** A code and plain English, never patient data (failed only). */
  error?: { code: ExportErrorCode; message: string };
}

export type ExportErrorCode =
  | 'NOT_PERMITTED'      // the capability is missing or was removed
  | 'TOO_MANY_ROWS'      // more than EXPORT_LIMITS.maxRows matched
  | 'TOO_MANY_OPEN'      // the user already has EXPORT_LIMITS.maxOpenPerUser exports queued or running
  | 'INVALID_PARAMETERS'
  | 'TIMED_OUT'
  | 'BUILD_FAILED';

/** The SignalR message sent to the requester (`Clients.User`) when an export changes status. */
export interface ExportStatusEvent {
  type: 'ExportStatus';
  /** The live-updates contract version, as on every hub event (liveUpdateContract.ts). */
  v: number;
  eventId: string;
  exportId: string;
  status: ExportStatus;
  title: string;
  rowCount?: number;
}

/** When a file finished at `readyAt` is deleted. */
export function exportExpiresAt(readyAt: string, retentionDays: number = EXPORT_LIMITS.defaultRetentionDays): string {
  const days = Math.min(Math.max(1, Math.floor(retentionDays)), EXPORT_LIMITS.maxRetentionDays);
  return new Date(new Date(readyAt).getTime() + days * 86_400_000).toISOString();
}

export type DownloadRefusal = 'notReady' | 'expired' | 'notRequester';

/** Whether this user may download the file now (the capability is checked again by the server). */
export function downloadRefusal(job: Pick<ExportJob, 'status' | 'expiresAt' | 'requestedBy'>, userId: string, now: Date): DownloadRefusal | null {
  if (job.requestedBy.userId !== userId) return 'notRequester';
  if (job.status === 'expired' || (job.expiresAt && new Date(job.expiresAt) <= now)) return 'expired';
  if (job.status !== 'ready') return 'notReady';
  return null;
}

/** The kind for a capability, if it is an export capability. */
export function exportKindFor(capability: string): ExportKind | undefined {
  return (Object.keys(EXPORT_KINDS) as ExportKind[]).find(k => EXPORT_KINDS[k].capability === capability);
}

// ── Batch 550 (phase 2d): what the browser needs from the responses ─────────

/** The body of a refused or failed call (4xx/5xx). `matchedRows` with TOO_MANY_ROWS. */
export interface ExportErrorBody {
  code: ExportErrorCode;
  message?: string;
  matchedRows?: number;
}

/** `POST /api/exports/{exportId}/download` answers with this. The URL works without the
 *  Authorization header (a signed blob URL, or an API URL carrying a single-use token),
 *  because the browser opens it as a plain download; it expires after
 *  EXPORT_LIMITS.downloadLinkMinutes and sets Content-Disposition: attachment. */
export interface ExportDownloadLink {
  url: string;
  expiresAt: string;
  /** The file name the browser saves it as (title, date and extension). */
  filename: string;
}

/** The facility a request names, from the capability context the screen checks (one facility, or 'all'). */
export function exportFacilityId(context: { facilityIds?: readonly string[]; facilityId?: string | null; allFacilities?: boolean } | undefined): string | undefined {
  if (!context) return undefined;
  if (context.allFacilities) return 'all';
  const ids = [...(context.facilityId ? [context.facilityId] : []), ...(context.facilityIds ?? [])];
  return ids.length === 1 ? ids[0] : ids.length > 1 ? 'all' : undefined;
}

/** The title the user sees: the browser's file name without its date and extension (the server adds both). */
export function exportTitleFromFilename(filename: string): string {
  return filename.replace(/\.(csv|xlsx|json)$/i, '').replace(/[-_ ]?\d{4}-\d{2}-\d{2}$/, '').trim() || filename;
}
