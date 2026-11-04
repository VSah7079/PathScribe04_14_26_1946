// src/services/siteAgent/siteAgentContract.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 546 (PS-539 phase 2c, decision D3). The contract between the
// PathScribe site agent (one .NET Worker Service per site, on the hospital's
// network) and the API server: the source of truth for
// docs/architecture/SITE_AGENT_API.md. Pure: types, constants and the rules
// both sides apply.
//
// D3 (Pete, Oct 13, 2026), phased. Version 1: report and label printers, and
// Windows file shares. Version 2: instruments and analyzers. The agent may
// also host BridgeLink where a hospital requires it on site (D6,
// INTERFACE_ENGINE_EDGE.md).
//
// Not the workstation agent: that one runs on a user's own computer for
// printing from that workstation (src/utils/labels/pathscribeAgent/), and
// stays.
// ─────────────────────────────────────────────────────────────────────────────

/** Bumped when a field changes meaning or is removed; added optional fields don't bump it. */
export const SITE_AGENT_CONTRACT_VERSION = 1;

// ─── Enrolment ───────────────────────────────────────────────────────────────

/**
 * `POST /api/agent/enroll`, once per installation. The enrolment code is made
 * by an administrator for one site (a 2d screen), used once, and expires after
 * ENROLLMENT_LIMITS.codeHours. The private key never leaves the machine: the
 * agent sends a certificate signing request.
 */
export interface AgentEnrollmentRequest {
  v: number;
  enrollmentCode: string;
  /** PKCS#10, PEM. The key is generated on the machine and kept in the Windows certificate store, not exportable. */
  csrPem: string;
  machineName: string;
  osVersion: string;
  agentVersion: string;
}

export interface AgentEnrollmentResponse {
  agentId: string;
  tenantId: string;
  siteId: string;
  /** The client certificate the agent uses for every later call (mutual TLS), issued by PathScribe's agent CA. */
  certificatePem: string;
  chainPem: string;
  expiresAt: string;
}

export const ENROLLMENT_LIMITS = {
  /** An enrolment code is valid for this long, once. */
  codeHours: 24,
  /** A client certificate is valid for this long. */
  certificateDays: 90,
  /** The agent renews (a new CSR over its current certificate) this many days before expiry. */
  renewBeforeDays: 30,
} as const;

/** Whether the agent should renew its certificate now. */
export function certificateNeedsRenewal(expiresAt: string, now: Date, renewBeforeDays: number = ENROLLMENT_LIMITS.renewBeforeDays): boolean {
  return new Date(expiresAt).getTime() - now.getTime() <= renewBeforeDays * 86_400_000;
}

// ─── What the agent reaches ──────────────────────────────────────────────────

/**
 * Set by the hospital's IT at installation and kept on the machine, never
 * changed from PathScribe. The agent refuses any printer, share or download
 * outside it, so a mistaken or compromised configuration can't point it at
 * other hosts on the hospital network.
 */
export interface AgentLocalAllowList {
  /** Printer addresses the agent may reach, as CIDR blocks (e.g. "10.20.30.0/24"). */
  printerSubnets: string[];
  /** Printer ports it may use (default 9100, 515, 631, 443). */
  printerPorts: number[];
  /** UNC roots shares must sit under (e.g. "\\\\fileserver\\pathology$"). */
  shareRoots: string[];
  /** The only hosts documents may be downloaded from (the API, or its document store), https only, no redirects followed. */
  downloadHosts: string[];
}

export const DEFAULT_PRINTER_PORTS: readonly number[] = [9100, 515, 631, 443];

/** Whether an IPv4 address is inside a CIDR block. */
export function ipv4InCidr(ip: string, cidr: string): boolean {
  const toInt = (a: string) => {
    const p = a.split('.').map(Number);
    return p.length === 4 && p.every(n => Number.isInteger(n) && n >= 0 && n <= 255) ? ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3] : null;
  };
  const [base, bitsText] = cidr.split('/');
  const bits = Number(bitsText);
  const a = toInt(ip);
  const b = toInt(base);
  if (a === null || b === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return ((a & mask) >>> 0) === ((b & mask) >>> 0);
}

/** Why the agent refuses a printer from its configuration, or null. Host names are resolved first and the address checked. */
export function printerOutsideAllowList(printer: Pick<AgentPrinter, 'host' | 'port'>, allow: Pick<AgentLocalAllowList, 'printerSubnets' | 'printerPorts'>): 'SUBNET' | 'PORT' | null {
  if (!allow.printerSubnets.some(c => ipv4InCidr(printer.host, c))) return 'SUBNET';
  if (!allow.printerPorts.includes(printer.port)) return 'PORT';
  return null;
}

/** Whether a share sits under one of the allowed UNC roots (case-insensitive, whole path segments; no ".." allowed). */
export function shareWithinRoots(uncPath: string, roots: readonly string[]): boolean {
  const norm = (p: string) => p.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
  const path = norm(uncPath);
  if (!path.startsWith('\\\\') || path.split('\\').includes('..')) return false;
  return roots.some(r => { const root = norm(r); return path === root || path.startsWith(`${root}\\`); });
}

/** IPPS is IPP over TLS (port 443/631), preferred where the printer supports it. */
export type AgentPrintProtocol = 'RAW_9100' | 'LPR_LPD' | 'IPP' | 'IPPS';

/**
 * A printer on the site's network, as the API sends it in the agent's
 * configuration. It has an id, so jobs
 * are ordered per printer and the heartbeat reports on each. Since Batch 553
 * a PrintDestination can name it by site and id (`AgentPrintDestination`).
 */
export interface AgentPrinter {
  destinationId: string;
  kind: 'report' | 'label';
  protocol: AgentPrintProtocol;
  host: string;
  port: number;
  /** LPR queue name (default 'lp'). */
  queueName?: string;
  /** IPP resource path (default '/ipp/print'). */
  resourcePath?: string;
  /** Label printers: the language the agent sends unchanged. */
  labelLanguage?: 'ZPL';
  displayName?: string;
}

/** A Windows share the agent writes report files to, or picks files up from. */
export interface AgentShare {
  shareId: string;
  /** e.g. \\fileserver\pathology$\inbound. */
  uncPath: string;
  direction: 'write' | 'pickup';
  /**
   * The share's credential stays on the agent's machine (Windows Credential
   * Manager, entered by the hospital's IT at installation), or the agent's
   * service account has access. It is never sent to or stored by PathScribe.
   */
  credentialRef?: string;
  /** Pickup only: which files, how long they must be unchanged, and what happens after. */
  pickup?: SharePickupRule;
}

export interface SharePickupRule {
  /** A file name pattern, e.g. "*.hl7" or "ORDERS_*.csv". */
  pattern: string;
  /** A file is taken only once its size and modified time haven't changed for this long (it's still being written otherwise). */
  minStableSeconds: number;
  maxFileMegabytes: number;
  /** Where a file goes once handed over: moved to the 'processed' sub-folder (default) or deleted. */
  afterHandover: 'moveToProcessed' | 'delete';
  /** Where a refused file goes (a sub-folder, default 'rejected'). The 'processed' and 'rejected' sub-folders are never scanned. */
  rejectedFolder: string;
  /**
   * Where the file's content goes: the site's interface engine channel, or
   * the API's import for a kind of data file (orders, results). Data only:
   * no PDFs or images, which stay links (BLOB_STORAGE_API.md). Not kept as an
   * attachment.
   */
  handTo: { kind: 'engineChannel'; channelId: string } | { kind: 'apiImport'; importKind: string };
}

/**
 * The key a picked-up file is handed over once by: the share, the file's name,
 * size and SHA-256, and its modified time, so a fixed-name daily file with
 * new content (or the same content on a new day) is still taken. The receiver
 * keeps keys for PICKUP_DEDUPE_DAYS.
 */
export function pickupIdempotencyKey(f: { shareId: string; fileName: string; size: number; sha256: string; modifiedAt: string }): string {
  return JSON.stringify([f.shareId, f.fileName.toLowerCase(), f.size, f.sha256, f.modifiedAt]);
}

export const PICKUP_DEDUPE_DAYS = 7;

/**
 * Batch 553: the API imports a pickup share can hand data files to
 * (`handTo.kind === 'apiImport'`). Data only, never PDFs or images.
 */
export const PICKUP_IMPORT_KINDS = ['orders', 'results'] as const;
export type PickupImportKind = typeof PICKUP_IMPORT_KINDS[number];

export const SHARE_PICKUP_DEFAULTS: Pick<SharePickupRule, 'minStableSeconds' | 'maxFileMegabytes' | 'afterHandover' | 'rejectedFolder'> = {
  minStableSeconds: 30,
  maxFileMegabytes: 50,
  afterHandover: 'moveToProcessed',
  rejectedFolder: 'rejected',
};

/** What the agent saw of a file on two scans. */
export interface FileObservation { size: number; modifiedAt: string; observedAt: string }

/**
 * Whether a file is finished being written: unchanged across observations
 * spanning at least minStableSeconds. The agent also opens it exclusively
 * before reading; a file its writer still holds open is left for the next scan.
 */
export function fileIsStable(observations: readonly FileObservation[], minStableSeconds: number): boolean {
  if (observations.length < 2) return false;
  const first = observations[0];
  const last = observations[observations.length - 1];
  const unchanged = observations.every(o => o.size === first.size && o.modifiedAt === first.modifiedAt);
  return unchanged && (new Date(last.observedAt).getTime() - new Date(first.observedAt).getTime()) / 1000 >= minStableSeconds;
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export type AgentJobKind = 'print.report' | 'print.label' | 'share.write';

/** A document the agent fetches: a signed, read-only link to one stored file (REPORT_DOCUMENT_STORE_API.md), checked by its hash before use. */
export interface AgentDocumentRef {
  downloadUrl: string;
  /** SHA-256 of the file, lower-case hex: the agent refuses a file that doesn't match (DOCUMENT_INTEGRITY). */
  sha256: string;
  byteLength: number;
  contentType: 'application/pdf' | 'application/json';
}

/** One piece of work, pushed over the agent's connection or returned by its long poll. */
export interface AgentJob {
  v: number;
  jobId: string;
  kind: AgentJobKind;
  /** The same for every attempt of one piece of work. Once any attempt has started sending (§4 of the doc), no attempt is ever sent again by itself. */
  idempotencyKey: string;
  /** Which try this is (1 = first); a retry after a lost result reuses the jobId. */
  attempt: number;
  createdAt: string;
  /** Not started by then: the agent returns it as EXPIRED instead (a report printed hours late is worse than an alert). */
  expiresAt: string;
  /** The server's time when it sent the job: the agent corrects its own clock's offset with it before judging expiry. */
  serverTime: string;
  /** print.*: the printer. */
  destinationId?: string;
  /** share.write: the share, and the files to write (the PDF and its metadata JSON, as file drop does today). */
  shareId?: string;
  files?: { fileName: string; document: AgentDocumentRef }[];
  /** print.report: the PDF. */
  document?: AgentDocumentRef;
  /** print.label: the label, already rendered (ZPL; its ^PQ sets the label count). The agent strips printer-configuration commands (^NS, ~WC, ^JU) before sending. */
  labelData?: string;
  /** print.report: copies of the PDF (sent that many times). Not used for labels. */
  copies?: number;
  presentation?: { paperSource?: string; duplexMode?: 'SIMPLEX' | 'DUPLEX' };
}

export const AGENT_JOB_LIMITS = {
  /**
   * A claimed job is the agent's for this long, renewed every leaseSeconds/3
   * while it works (POST /api/agent/jobs/{jobId}/renew). A lease that lapses
   * on a job never reported started is offered again (same jobId, not counted
   * as a failure); one reported started is IN_DOUBT, never re-offered.
   */
  leaseSeconds: 120,
  /** Report prints expire this long after creation unless the job says otherwise. */
  reportPrintExpiryHours: 4,
  /** Label prints expire soon: a label printed late risks going on the wrong cassette or slide. */
  labelPrintExpiryMinutes: 10,
  /** Jobs the agent holds at once (claimed, not finished). */
  maxInFlight: 20,
} as const;

/**
 * How a job ended, as the agent can tell:
 *   - 'printed': the printer confirmed it (IPP/IPPS job state completed).
 *   - 'sent': the printer took the data but can't confirm printing (Raw 9100;
 *     LPR, whose acknowledgement means queued). The queue shows "Sent to
 *     printer", not "Printed".
 *   - 'written': the files are in the share (written as .part, then renamed).
 *   - 'failed': with an error code.
 */
export type AgentJobOutcome = 'printed' | 'sent' | 'written' | 'failed';

/** Every error the agent reports. The comments say what each means. */
export const AGENT_ERROR_CODES = [
  'PRINTER_UNREACHABLE',   // no connection
  'PRINTER_REJECTED',      // the printer refused the job (IPP status, LPR negative ack)
  'PAPER_OUT', 'RIBBON_OUT', 'HEAD_OPEN', // label printer states, as LIVE_UPDATES_SIGNALR.md §10
  'DOCUMENT_UNAVAILABLE',  // the download link failed or expired
  'DOCUMENT_INTEGRITY',    // the file's SHA-256 didn't match: never printed
  'SHARE_UNREACHABLE',
  'SHARE_ACCESS_DENIED',
  'SHARE_FULL',
  'UNKNOWN_DESTINATION',   // the agent has no printer or share with that id (its configuration is out of date)
  'EXPIRED',
  'MALFORMED_ZPL', 'INVALID_GS1', // the label printer refused the label's content (LIVE_UPDATES_SIGNALR.md §10)
  'IN_DOUBT',              // it may have been sent: the agent stopped (crash, restart) after it started sending and before it knew the result. Never resent by itself
  'AGENT_ERROR',
] as const;

export type AgentErrorCode = typeof AGENT_ERROR_CODES[number];

/** `POST /api/agent/jobs/{jobId}/result`. Idempotent on (jobId, attempt). */
export interface AgentJobResult {
  v: number;
  jobId: string;
  attempt: number;
  outcome: AgentJobOutcome;
  errorCode?: AgentErrorCode;
  /** Plain English from the printer or Windows, no patient data. */
  detail?: string;
  /** The printer's own job id, when it gives one (IPP). */
  printerJobId?: string;
  /** For share.write: the names actually written (a clash adds _2, _3, never overwrites). */
  writtenFileNames?: string[];
  completedAt: string;
}

/**
 * What the API does with a failed result: retry on the lab's delivery
 * schedule (deliveryRetryPolicy.ts), or go straight to the exception queue and
 * the fallback channels because retrying can't help.
 *
 * Labels are never retried by themselves (Pete, Sep 26, 2026, LIVE_UPDATES_SIGNALR.md
 * §10: retry is manual only, so a label can't print twice): a failed label
 * waits for a person's Retry.
 */
export function agentFailureRetriable(code: AgentErrorCode, kind: AgentJobKind): boolean {
  if (kind === 'print.label') return false;
  switch (code) {
    case 'PRINTER_UNREACHABLE': case 'PAPER_OUT': case 'RIBBON_OUT': case 'HEAD_OPEN':
    case 'DOCUMENT_UNAVAILABLE': case 'SHARE_UNREACHABLE': case 'SHARE_FULL': case 'AGENT_ERROR':
      return true;
    case 'PRINTER_REJECTED': case 'DOCUMENT_INTEGRITY': case 'SHARE_ACCESS_DENIED': case 'UNKNOWN_DESTINATION': case 'EXPIRED':
    case 'MALFORMED_ZPL': case 'INVALID_GS1': case 'IN_DOUBT':
      return false;
  }
}

/** Whether the agent may still start a job: before its expiry, judged on the server's clock (the job's serverTime corrects the agent's offset). The lease is checked separately. */
export function jobStartable(job: Pick<AgentJob, 'expiresAt'>, now: Date, clockOffsetMs = 0): boolean {
  return new Date(job.expiresAt).getTime() > now.getTime() - clockOffsetMs;
}

/** How far the agent's clock is ahead of the server's (ms), from a job's serverTime and when the agent received it (the network delay, a second or so, is within the error). */
export function clockOffsetMs(serverTime: string, receivedAt: Date): number {
  return receivedAt.getTime() - new Date(serverTime).getTime();
}

// ─── Updates ─────────────────────────────────────────────────────────────────

/** `GET /api/agent/update`: the version the agent should run, and how to check it. */
export interface AgentUpdateManifest {
  version: string;
  /** The installer: Authenticode-signed by ForMedrixAI. */
  downloadUrl: string;
  sha256: string;
  /**
   * An Ed25519 signature by ForMedrixAI's release key over the whole manifest
   * (its other fields as canonical JSON, keys sorted), checked as well as
   * Authenticode (pinned to ForMedrixAI's publisher certificate).
   */
  signature: string;
  /** Which release key signed it, so keys can be rotated: the agent carries the current and next public keys. */
  keyId: string;
  /** The lowest contract version this release speaks; an agent too old for the API is told to update. */
  minContractVersion: number;
  /** Which sites get it first: pilot sites, then everyone. Each installs only inside its own update window (set per site, in the hospital's local time). */
  ring: 'pilot' | 'general';
}

const VERSION = /^\d+(\.\d+){0,3}$/;

/** Whether `candidate` is newer than `current` (dotted numeric versions; anything else, such as "1.2.0-rc", is never newer). */
export function isNewerVersion(candidate: string, current: string): boolean {
  if (!VERSION.test(candidate) || !VERSION.test(current)) return false;
  const a = candidate.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

// ─── Heartbeat ───────────────────────────────────────────────────────────────

export const AGENT_HEALTH_LIMITS = {
  heartbeatSeconds: 60,
  /** No heartbeat received for this long (by the server's clock): offline. */
  offlineAfterSeconds: 180,
  /** A job waiting on the agent longer than this makes it degraded. */
  maxQueuedAgeMinutes: 10,
  minDiskFreePercent: 15,
  certWarningDays: 14,
} as const;

/** `POST /api/agent/heartbeat`. No patient data. The agent and site come from the certificate. */
export interface AgentHeartbeat {
  v: number;
  agentVersion: string;
  /** Jobs claimed or stored locally, not yet finished or reported. */
  queuedJobs: number;
  oldestQueuedAgeSeconds?: number;
  /** Results waiting to be reported (store and forward while the API is unreachable). */
  unsentResults: number;
  /** pendingJobs: jobs waiting for that printer or share. One switched off overnight with nothing waiting isn't a fault. */
  printers: { destinationId: string; reachable: boolean; pendingJobs: number; lastErrorCode?: AgentErrorCode }[];
  shares: { shareId: string; reachable: boolean; pendingJobs: number }[];
  certExpiresAt: string;
  diskFreePercent: number;
}

export type AgentStatus = 'online' | 'degraded' | 'offline';

/** How the Print Queue and the system health page show a site agent: from its last heartbeat and when the server received it. */
export function agentStatus(last: { heartbeat: AgentHeartbeat; receivedAt: string } | undefined, now: Date): AgentStatus {
  if (!last) return 'offline';
  if ((now.getTime() - new Date(last.receivedAt).getTime()) / 1000 > AGENT_HEALTH_LIMITS.offlineAfterSeconds) return 'offline';
  const hb = last.heartbeat;
  const certSoon = new Date(hb.certExpiresAt).getTime() - now.getTime() < AGENT_HEALTH_LIMITS.certWarningDays * 86_400_000;
  const degraded = certSoon || hb.diskFreePercent < AGENT_HEALTH_LIMITS.minDiskFreePercent
    || (hb.oldestQueuedAgeSeconds ?? 0) > AGENT_HEALTH_LIMITS.maxQueuedAgeMinutes * 60
    || hb.printers.some(p => !p.reachable && p.pendingJobs > 0) || hb.shares.some(s => !s.reachable && s.pendingJobs > 0);
  return degraded ? 'degraded' : 'online';
}
