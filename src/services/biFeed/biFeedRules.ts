// src/services/biFeed/biFeedRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613 (PS-787): the reporting feed's rules. Pure; the service keeps the data.
//
// The feed lets Power BI and other BI tools read PathScribe data through the API
// server (docs/architecture/BI_FEED_API.md). The server does the real work; the
// browser holds the settings and the tokens and answers a Simulated pull the way
// the server will.
//
//   • The organisation chooses which datasets and which performing-lab facilities
//     the feed offers at all (the ceiling). A token is limited to a subset.
//   • By default every token is de-identified. A token is "identified" only when
//     an approval is on record naming the approver and the reason, and only the
//     datasets that can identify a patient are affected.
//   • Token handling matches the workstation registry: shown once, only the
//     SHA-256 hash kept, rotated with a grace period, revoked with a reason.
//   • A pull is audited by token, dataset and row count. Never row content.
// ─────────────────────────────────────────────────────────────────────────────
import type { AgentRevokeReason } from '../siteAgent/siteAgentAdmin';
import { BI_DATASETS, BI_DATASET_IDS, datasetById, type BiDatasetId, type BiField } from './biFeedCatalog';

export const BI_TOKEN_PREFIX = 'psbi_';
export const BI_TOKEN_LIFETIME_DAYS = 365;
export const BI_TOKEN_WARN_DAYS = 30;
export const BI_PREVIOUS_TOKEN_GRACE_HOURS = 24;
export const BI_NAME_MAX = 60;
export const BI_REASON_MAX = 500;
export const BI_APPROVER_MAX = 80;
/** The server refuses a token's pulls past this many in a minute. */
export const BI_RATE_LIMIT_PER_MINUTE = 60;
export const BI_PAGE_SIZE_DEFAULT = 1000;
export const BI_PAGE_SIZE_MAX = 10000;

export interface BiIdentifiedApproval {
  approverName: string;
  reason: string;
  approvedAt: string;
  /** Who recorded it (the signed-in person; the approver named may be someone else). */
  recordedBy: string;
}

export interface BiFeedSettings {
  enabled: boolean;
  datasetIds: BiDatasetId[];
  facilityIds: string[];
  identifiedApproval?: BiIdentifiedApproval;
  updatedAt?: string;
  updatedBy?: string;
}

export const EMPTY_BI_SETTINGS: BiFeedSettings = { enabled: false, datasetIds: [], facilityIds: [] };

export type BiTokenStatus = 'active' | 'revoked';

export interface BiPullSummary { datasetId: BiDatasetId; rows: number; fields: number; at: string }

export interface BiTokenRecord {
  id: string;
  name: string;
  datasetIds: BiDatasetId[];
  /** Empty means every facility the feed offers. */
  facilityIds: string[];
  identified: boolean;
  status: BiTokenStatus;
  createdAt: string;
  createdBy: string;
  tokenHash: string;
  tokenHint: string;
  tokenIssuedAt: string;
  tokenExpiresAt: string;
  previousTokenHash?: string;
  previousValidUntil?: string;
  lastPulledAt?: string;
  lastPull?: BiPullSummary;
  /** Times of the pulls in the last minute, for the rate limit. */
  recentPulls?: string[];
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: AgentRevokeReason;
}

export type BiTokenSummary = Omit<BiTokenRecord, 'tokenHash' | 'previousTokenHash' | 'recentPulls'>;

export interface BiTokenDraft {
  name: string;
  datasetIds: BiDatasetId[];
  facilityIds: string[];
  identified: boolean;
}

const clean = (s: string | undefined): string => (s ?? '').trim().replace(/\s+/g, ' ');

// ── Settings ────────────────────────────────────────────────────────────────

export type BiSettingsError = 'DATASETS_REQUIRED' | 'FACILITIES_REQUIRED' | 'DATASET_UNKNOWN';

/** What is wrong with a settings draft (pure). A feed that is switched off needs nothing chosen. */
export function checkBiSettings(s: Pick<BiFeedSettings, 'enabled' | 'datasetIds' | 'facilityIds'>): BiSettingsError[] {
  const errors: BiSettingsError[] = [];
  if (s.datasetIds.some(id => !(BI_DATASET_IDS as readonly string[]).includes(id))) errors.push('DATASET_UNKNOWN');
  if (s.enabled && s.datasetIds.length === 0) errors.push('DATASETS_REQUIRED');
  if (s.enabled && s.facilityIds.length === 0) errors.push('FACILITIES_REQUIRED');
  return errors;
}

export type BiApprovalError = 'APPROVER_REQUIRED' | 'APPROVER_TOO_LONG' | 'REASON_REQUIRED' | 'REASON_TOO_LONG';

export function checkBiApproval(a: { approverName: string; reason: string }): BiApprovalError[] {
  const errors: BiApprovalError[] = [];
  const who = clean(a.approverName);
  const why = clean(a.reason);
  if (!who) errors.push('APPROVER_REQUIRED'); else if (who.length > BI_APPROVER_MAX) errors.push('APPROVER_TOO_LONG');
  if (!why) errors.push('REASON_REQUIRED'); else if (why.length > BI_REASON_MAX) errors.push('REASON_TOO_LONG');
  return errors;
}

export const normaliseBiApproval = (a: { approverName: string; reason: string }) => ({ approverName: clean(a.approverName), reason: clean(a.reason) });

// ── Tokens ──────────────────────────────────────────────────────────────────

export type BiTokenDraftError =
  | 'NAME_REQUIRED' | 'NAME_TOO_LONG' | 'NAME_TAKEN' | 'DATASETS_REQUIRED' | 'DATASET_NOT_IN_FEED'
  | 'FACILITY_NOT_IN_FEED' | 'IDENTIFIED_NOT_APPROVED' | 'IDENTIFIED_NEEDS_IDENTIFIABLE_DATASET' | 'FEED_OFF';

export function normaliseBiTokenDraft(d: BiTokenDraft): BiTokenDraft {
  return { name: clean(d.name), datasetIds: [...new Set(d.datasetIds)], facilityIds: [...new Set(d.facilityIds)], identified: !!d.identified };
}

/** What is wrong with a token draft, in the order it would be fixed (pure). */
export function checkBiTokenDraft(
  raw: BiTokenDraft,
  settings: BiFeedSettings,
  existing: readonly Pick<BiTokenRecord, 'name' | 'status'>[],
): BiTokenDraftError[] {
  const d = normaliseBiTokenDraft(raw);
  const errors: BiTokenDraftError[] = [];
  if (!settings.enabled) errors.push('FEED_OFF');
  if (!d.name) errors.push('NAME_REQUIRED');
  else if (d.name.length > BI_NAME_MAX) errors.push('NAME_TOO_LONG');
  else if (existing.some(t => t.status === 'active' && t.name.toLocaleLowerCase() === d.name.toLocaleLowerCase())) errors.push('NAME_TAKEN');
  if (d.datasetIds.length === 0) errors.push('DATASETS_REQUIRED');
  else if (d.datasetIds.some(id => !settings.datasetIds.includes(id))) errors.push('DATASET_NOT_IN_FEED');
  if (d.facilityIds.some(id => !settings.facilityIds.includes(id))) errors.push('FACILITY_NOT_IN_FEED');
  if (d.identified) {
    if (!settings.identifiedApproval) errors.push('IDENTIFIED_NOT_APPROVED');
    else if (!d.datasetIds.some(id => datasetById(id)?.identifiable)) errors.push('IDENTIFIED_NEEDS_IDENTIFIABLE_DATASET');
  }
  return errors;
}

export function newBiToken(random: (n: number) => Uint8Array): string {
  return BI_TOKEN_PREFIX + Array.from(random(24), b => b.toString(16).padStart(2, '0')).join('');
}
export const biTokenHintOf = (token: string): string => token.slice(-4);
export const looksLikeBiToken = (s: string): boolean => /^psbi_[0-9a-f]{48}$/.test(s.trim());

export async function hashBiToken(token: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export const addDays = (iso: string, days: number): string => new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
export const addHours = (iso: string, hours: number): string => new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();

export type BiTokenState = 'active' | 'expiringSoon' | 'expired' | 'revoked';

export function biTokenState(t: Pick<BiTokenRecord, 'status' | 'tokenExpiresAt'>, now: string): BiTokenState {
  if (t.status === 'revoked') return 'revoked';
  if (now > t.tokenExpiresAt) return 'expired';
  if (now > addDays(t.tokenExpiresAt, -BI_TOKEN_WARN_DAYS)) return 'expiringSoon';
  return 'active';
}

export function sortBiTokens<T extends Pick<BiTokenRecord, 'name' | 'status'>>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => (a.status === 'revoked' ? 1 : 0) - (b.status === 'revoked' ? 1 : 0) || a.name.localeCompare(b.name));
}

// ── Fields ──────────────────────────────────────────────────────────────────

/** The fields a pull returns: all of them when identified, otherwise all but the removed ones (pure). */
export function fieldsReturned(datasetId: BiDatasetId, identified: boolean): BiField[] {
  const ds = datasetById(datasetId);
  if (!ds) return [];
  return identified || !ds.identifiable ? [...ds.fields] : ds.fields.filter(x => x.deidentified !== 'removed');
}

/** Whether a token receives identifying fields for a dataset, given the approval on record (pure). */
export function tokenIsIdentifiedFor(token: Pick<BiTokenRecord, 'identified'>, datasetId: BiDatasetId, settings: Pick<BiFeedSettings, 'identifiedApproval'>): boolean {
  return token.identified && !!settings.identifiedApproval && !!datasetById(datasetId)?.identifiable;
}

// ── The Simulated pull ──────────────────────────────────────────────────────

export type BiPullResult =
  | 'ok' | 'malformed' | 'unknown' | 'revoked' | 'expired' | 'feedOff'
  | 'datasetNotAllowed' | 'identifiedNotApproved' | 'rateLimited';

/** The answer the server would give to a presented token and dataset (pure). */
export function decideBiPull(
  token: BiTokenRecord | undefined,
  presentedHash: string,
  datasetId: string,
  settings: BiFeedSettings,
  now: string,
): BiPullResult {
  if (!token) return 'unknown';
  const isCurrent = presentedHash === token.tokenHash;
  const isPrevious = !!token.previousTokenHash && presentedHash === token.previousTokenHash
    && !!token.previousValidUntil && now <= token.previousValidUntil;
  if (!isCurrent && !isPrevious) return 'unknown';
  if (token.status === 'revoked') return 'revoked';
  if (isCurrent && now > token.tokenExpiresAt) return 'expired';
  if (!settings.enabled) return 'feedOff';
  if (!(BI_DATASET_IDS as readonly string[]).includes(datasetId)
    || !token.datasetIds.includes(datasetId as BiDatasetId) || !settings.datasetIds.includes(datasetId as BiDatasetId)) return 'datasetNotAllowed';
  if (token.identified && !settings.identifiedApproval && datasetById(datasetId)?.identifiable) return 'identifiedNotApproved';
  const since = new Date(new Date(now).getTime() - 60_000).toISOString();
  if ((token.recentPulls ?? []).filter(t => t > since).length >= BI_RATE_LIMIT_PER_MINUTE) return 'rateLimited';
  return 'ok';
}

const BASE_ROWS: Record<BiDatasetId, number> = { cases: 4200, specimens: 9800, billing: 12600, qa: 380, workload: 900, audit: 1500 };

/** A made-up but steady row count for the Simulated pull: the same dataset and facilities always give the same number (pure). */
export function simulatedRowCount(datasetId: BiDatasetId, facilityCount: number): number {
  return BASE_ROWS[datasetId] * Math.max(1, facilityCount);
}

export { BI_DATASETS, BI_DATASET_IDS };
