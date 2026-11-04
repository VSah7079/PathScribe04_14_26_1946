// src/services/siteAgent/siteAgentAdmin.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 552 (PS-539 phase 2d; SITE_AGENT_API.md §2, §3, §9 and §11a): what an
// administrator manages for a site's agents, from the browser:
//   - the site's agents and their status (from the last heartbeat);
//   - a one-time enrolment code for installing an agent;
//   - revoking an agent;
//   - the site's agent printers and shares (the configuration the agent
//     fetches, §3).
// A "site" is a performing-lab facility (the facility list the printer and
// workstation screens use); siteId is its facility id.
// Pure: the wire types and the checks an edit must pass before it is saved.
// The hospital's local allow-list (§3) still decides on the agent's machine
// what the agent may reach; these checks only catch mistakes early.
// ─────────────────────────────────────────────────────────────────────────────
import {
  agentStatus, PICKUP_IMPORT_KINDS, SHARE_PICKUP_DEFAULTS, type AgentHeartbeat, type AgentPrinter, type AgentPrintProtocol, type AgentShare, type AgentStatus, type SharePickupRule,
} from './siteAgentContract';

/** `GET /api/sites/{siteId}/agents` (or `/api/agents` for every site the user may see). */
export interface SiteAgentSummary {
  agentId: string;
  siteId: string;
  machineName: string;
  agentVersion: string;
  enrolledAt: string;
  certExpiresAt: string;
  /** Set once revoked: the agent is cut off at once (§2). */
  revokedAt?: string;
  /** The last heartbeat and when the server received it (no patient data). */
  lastHeartbeat?: { heartbeat: AgentHeartbeat; receivedAt: string };
  /** The status the server worked out by its own clock (§9). Preferred; the browser works it out only if absent. */
  status?: AgentStatus;
}

/** `POST /api/sites/{siteId}/agent-enrollment-codes`. Shown once; the server keeps only its hash. */
export interface EnrollmentCode {
  code: string;
  siteId: string;
  expiresAt: string;
}

/** `GET` / `PUT /api/sites/{siteId}/agent-config`: what the agent fetches from `GET /api/agent/config` (§3). */
export interface SiteAgentConfig {
  siteId: string;
  printers: AgentPrinter[];
  shares: AgentShare[];
  /** Local time window in which updates may be installed, e.g. 02:00–04:00. */
  updateWindow?: { start: string; end: string };
  /** Changed by whom and when (set by the server). */
  updatedAt?: string;
  updatedBy?: string;
}

export type SiteAgentAdminError = 'NOT_PERMITTED' | 'NOT_FOUND' | 'INVALID' | 'UNAVAILABLE' | 'SIGNED_OUT';

/** An agent's status for the screen: revoked, or from its last heartbeat (by the server's clock, `now`). Pure. */
export function siteAgentState(agent: Pick<SiteAgentSummary, 'revokedAt' | 'lastHeartbeat' | 'status'>, now: Date): AgentStatus | 'revoked' {
  if (agent.revokedAt) return 'revoked';
  return agent.status ?? agentStatus(agent.lastHeartbeat, now);
}

/** Counts for a status line (the Print Queue): revoked agents aren't counted. Pure. */
export function siteAgentCounts(agents: readonly SiteAgentSummary[], now: Date): Record<AgentStatus, number> {
  const counts: Record<AgentStatus, number> = { online: 0, degraded: 0, offline: 0 };
  for (const a of agents) {
    const s = siteAgentState(a, now);
    if (s !== 'revoked') counts[s]++;
  }
  return counts;
}

// ─── Checks before saving the configuration ─────────────────────────────────

export type PrinterProblem = 'idRequired' | 'idDuplicate' | 'hostRequired' | 'hostInvalid' | 'ipv6NotSupported' | 'portInvalid' | 'labelNeedsRaw';
export type ShareProblem = 'idRequired' | 'idDuplicate' | 'uncInvalid' | 'patternRequired' | 'patternInvalid' | 'handToRequired' | 'numbersInvalid' | 'folderInvalid';
/** Batch 553: the agent's update window (both times or neither; HH:mm, the site's local time; may cross midnight). */
export type UpdateWindowProblem = 'bothRequired' | 'timeInvalid' | 'sameTimes';

const IPV4 = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

/**
 * An IPv4 address in dotted form, or a host name whose labels aren't all
 * numbers (so `10.1.1`, `999.1.1.1`, `2130706433` or `0x7f.0.0.1`, which
 * Windows would turn into other addresses, are refused). Pure.
 */
export function validPrinterHost(host: string): boolean {
  const h = host.trim();
  if (IPV4.test(h)) return true;
  if (h.length > 253) return false;
  const labels = h.split('.');
  if (labels.some(l => !LABEL.test(l))) return false;
  if (labels.every(l => /^\d+$/.test(l) || /^0x[0-9a-f]+$/i.test(l))) return false;
  return !/^\d+$/.test(labels[labels.length - 1]);
}

const isLoopback = (server: string) => /^localhost$/i.test(server) || /^127\./.test(server) || server === '.' || server === '?';
const BAD_SEGMENT = /[\\/:*?"<>|]/;

/**
 * \\server\share[\folder...]: the server a host name or IPv4 address (not
 * this machine, not a device path such as \\.\pipe), the share not a drive's
 * admin share (C$), and no "." or ".." or blank segments. Pure.
 */
export function validUncPath(path: string): boolean {
  const p = path.trim();
  if (!p.startsWith('\\\\')) return false;
  const parts = p.slice(2).replace(/\\$/, '').split('\\');
  if (parts.length < 2) return false;
  const [server, share, ...rest] = parts;
  if (isLoopback(server) || !(validPrinterHost(server) || /^[A-Za-z0-9-]{1,15}$/.test(server))) return false;
  if (/^[A-Za-z]\$$/.test(share)) return false;
  return [share, ...rest].every(seg => seg.trim() === seg && seg !== '' && seg !== '.' && seg !== '..' && !BAD_SEGMENT.test(seg));
}

/** A pickup pattern: a file name pattern only (no folders), and not PDFs or images, which stay links (§8). */
export function validPickupPattern(pattern: string): boolean {
  const p = pattern.trim();
  if (!p || /[\\/]/.test(p) || p.includes('..')) return false;
  return !/\.(pdf|png|jpe?g|tiff?|gif|bmp|svs|ndpi)$/i.test(p);
}

/** The port a protocol uses unless one is given. */
/** IPPS uses 631 too (RFC 7472); a printer that serves it on 443 is set by hand. */
export const DEFAULT_PORT: Record<AgentPrintProtocol, number> = { RAW_9100: 9100, LPR_LPD: 515, IPP: 631, IPPS: 631 };

/** What is wrong with each printer, by index (pure). Label printers print ZPL on Raw 9100 (§5). */
export function checkAgentPrinters(printers: readonly AgentPrinter[]): Record<number, PrinterProblem> {
  const out: Record<number, PrinterProblem> = {};
  const seen = new Set<string>();
  printers.forEach((p, i) => {
    const id = p.destinationId.trim();
    if (!id) out[i] = 'idRequired';
    else if (seen.has(id.toLowerCase())) out[i] = 'idDuplicate';
    else if (!p.host.trim()) out[i] = 'hostRequired';
    else if (/^[0-9a-f:.]+$/i.test(p.host.trim()) && p.host.includes(':')) out[i] = 'ipv6NotSupported';
    else if (!validPrinterHost(p.host)) out[i] = 'hostInvalid';
    else if (!Number.isInteger(p.port) || p.port < 1 || p.port > 65535) out[i] = 'portInvalid';
    else if (p.kind === 'label' && (p.protocol !== 'RAW_9100' || p.labelLanguage !== 'ZPL')) out[i] = 'labelNeedsRaw';
    if (id) seen.add(id.toLowerCase());
  });
  return out;
}

/** What is wrong with each share, by index (pure). A share's credential is never entered here, only its name (§3). */
export function checkAgentShares(shares: readonly AgentShare[]): Record<number, ShareProblem> {
  const out: Record<number, ShareProblem> = {};
  const seen = new Set<string>();
  shares.forEach((s, i) => {
    const id = s.shareId.trim();
    const rule: SharePickupRule | undefined = s.pickup;
    if (!id) out[i] = 'idRequired';
    else if (seen.has(id.toLowerCase())) out[i] = 'idDuplicate';
    else if (!validUncPath(s.uncPath)) out[i] = 'uncInvalid';
    else if (s.direction === 'pickup' && (!rule || !rule.pattern.trim())) out[i] = 'patternRequired';
    else if (s.direction === 'pickup' && rule && !validPickupPattern(rule.pattern)) out[i] = 'patternInvalid';
    else if (s.direction === 'pickup' && rule && !/^[A-Za-z0-9 _-]{1,64}$/.test(rule.rejectedFolder.trim())) out[i] = 'folderInvalid';
    else if (s.direction === 'pickup' && rule && !(rule.handTo.kind === 'engineChannel' ? rule.handTo.channelId.trim() : (PICKUP_IMPORT_KINDS as readonly string[]).includes(rule.handTo.importKind.trim()))) out[i] = 'handToRequired';
    else if (s.direction === 'pickup' && rule && !(rule.minStableSeconds >= 5 && rule.maxFileMegabytes >= 1 && rule.maxFileMegabytes <= 500)) out[i] = 'numbersInvalid';
    if (id) seen.add(id.toLowerCase());
  });
  return out;
}

/** Whether the configuration may be saved (pure). */
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Batch 553: what's wrong with the update window, or null. No window at all is fine (the agent updates when told). */
export function checkUpdateWindow(w: SiteAgentConfig['updateWindow']): UpdateWindowProblem | null {
  if (!w) return null;
  const start = (w.start ?? '').trim();
  const end = (w.end ?? '').trim();
  if (!start && !end) return null;
  if (!start || !end) return 'bothRequired';
  if (!HHMM.test(start) || !HHMM.test(end)) return 'timeInvalid';
  if (start === end) return 'sameTimes';
  return null;
}

export function siteAgentConfigValid(config: Pick<SiteAgentConfig, 'printers' | 'shares'> & Partial<Pick<SiteAgentConfig, 'updateWindow'>>): boolean {
  return Object.keys(checkAgentPrinters(config.printers)).length === 0 && Object.keys(checkAgentShares(config.shares)).length === 0
    && checkUpdateWindow(config.updateWindow) === null;
}

/** Batch 553: the engine channels this site's pickup shares already hand to, offered when typing another. */
export function engineChannelSuggestions(shares: readonly AgentShare[]): string[] {
  const ids = new Set<string>();
  for (const s of shares) {
    const h = s.pickup?.handTo;
    if (h && h.kind === 'engineChannel' && h.channelId.trim()) ids.add(h.channelId.trim());
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}

/** Batch 553: why an agent is revoked, picked from a short list (rule 8); a note is needed only for 'other'. */
export const REVOKE_REASON_CODES = ['replaced', 'retired', 'compromised', 'movedSite', 'enrolledByMistake', 'other'] as const;
export type AgentRevokeReasonCode = typeof REVOKE_REASON_CODES[number];
export interface AgentRevokeReason { code: AgentRevokeReasonCode; note?: string }
export const REVOKE_NOTE_MAX = 500;

export function revokeReasonValid(r: AgentRevokeReason | undefined): boolean {
  if (!r || !(REVOKE_REASON_CODES as readonly string[]).includes(r.code)) return false;
  const note = (r.note ?? '').trim();
  if (note.length > REVOKE_NOTE_MAX) return false;
  return r.code !== 'other' || note.length > 0;
}

/** A new enrolment code for the demo (the server makes the real ones): 128+ random bits, base32, grouped for reading aloud. */
export function newEnrollmentCode(random: (n: number) => Uint8Array): string {
  const bytes = random(20); // 160 bits
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
    value &= (1 << bits) - 1;
  }
  return out.match(/.{1,4}/g)!.join('-');
}

/** A new printer row with sensible defaults (a report printer on IPPS, the preferred protocol, §3). Pure. */
export function blankAgentPrinter(existing: readonly AgentPrinter[]): AgentPrinter {
  let n = existing.length + 1;
  while (existing.some(p => p.destinationId === `printer-${n}`)) n++;
  return { destinationId: `printer-${n}`, kind: 'report', protocol: 'IPPS', host: '', port: DEFAULT_PORT.IPPS };
}

/** A printer after its protocol changes: the port follows unless it was set by hand, and the protocol's own fields stay. Pure. */
export function withProtocol(p: AgentPrinter, protocol: AgentPrintProtocol): AgentPrinter {
  const port = p.port === DEFAULT_PORT[p.protocol] ? DEFAULT_PORT[protocol] : p.port;
  const next: AgentPrinter = { ...p, protocol, port };
  if (protocol !== 'LPR_LPD') delete next.queueName;
  if (protocol !== 'IPP' && protocol !== 'IPPS') delete next.resourcePath;
  return next;
}

/** A label printer prints ZPL on Raw 9100 (§5). Pure. */
export function withKind(p: AgentPrinter, kind: AgentPrinter['kind']): AgentPrinter {
  if (kind === 'label') return { ...withProtocol(p, 'RAW_9100'), kind, labelLanguage: 'ZPL' };
  const next: AgentPrinter = { ...p, kind };
  delete next.labelLanguage;
  return next;
}

/** A new share row: a write share; a pickup share gets the defaults (§8). Pure. */
export function blankAgentShare(existing: readonly AgentShare[], direction: AgentShare['direction']): AgentShare {
  let n = existing.length + 1;
  while (existing.some(s => s.shareId === `share-${n}`)) n++;
  return direction === 'write'
    ? { shareId: `share-${n}`, uncPath: '', direction }
    : { shareId: `share-${n}`, uncPath: '', direction, pickup: { pattern: '', ...SHARE_PICKUP_DEFAULTS, handTo: { kind: 'engineChannel', channelId: '' } } };
}

/** The configuration as it is saved: ids, hosts, paths and names trimmed, so `{siteId, destinationId}` matches exactly. Pure. */
export function normaliseSiteAgentConfig(config: SiteAgentConfig): SiteAgentConfig {
  const trim = (v: string | undefined) => (v === undefined ? undefined : v.trim() || undefined);
  const start = config.updateWindow?.start?.trim() ?? '';
  const end = config.updateWindow?.end?.trim() ?? '';
  const { updateWindow: _dropped, ...rest } = config;
  void _dropped;
  return {
    ...rest,
    ...(start || end ? { updateWindow: { start, end } } : {}),
    printers: config.printers.map(p => ({
      ...p, destinationId: p.destinationId.trim(), host: p.host.trim(),
      ...(p.displayName !== undefined ? { displayName: trim(p.displayName) } : {}),
      ...(p.queueName !== undefined ? { queueName: trim(p.queueName) } : {}),
      ...(p.resourcePath !== undefined ? { resourcePath: trim(p.resourcePath) } : {}),
    })),
    shares: config.shares.map(s => ({
      ...s, shareId: s.shareId.trim(), uncPath: s.uncPath.trim(),
      ...(s.credentialRef !== undefined ? { credentialRef: trim(s.credentialRef) } : {}),
      ...(s.pickup ? { pickup: { ...s.pickup, pattern: s.pickup.pattern.trim(), rejectedFolder: s.pickup.rejectedFolder.trim(),
        handTo: s.pickup.handTo.kind === 'engineChannel' ? { kind: 'engineChannel' as const, channelId: s.pickup.handTo.channelId.trim() } : { kind: 'apiImport' as const, importKind: s.pickup.handTo.importKind.trim() } } } : {}),
    })),
  };
}

/** Batch 562: the sites with an agent not revoked, sorted, each once (the Print Queue's line follows them live). */
export function agentSiteIds(agents: readonly { siteId: string; revokedAt?: string }[]): string[] {
  return [...new Set(agents.filter(a => !a.revokedAt).map(a => a.siteId?.trim()).filter((s): s is string => !!s))].sort();
}
