// src/services/biFeed/biFeedService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613 (PS-787): the reporting feed's settings and tokens. Dependencies are
// passed in so it is tested without the browser; biFeedServices.ts wires the
// browser demo's pieces and adds the capability checks. With the API server this
// is replaced by HTTP calls; the screen and the rules do not change.
//
// Every change is audited and PHI-free. A token is returned once, by createToken
// and rotateToken, and only its hash is kept. A Simulated pull records the
// dataset and the row count, never any row.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { NewAuditLog } from '../auditlog/IAuditService';
import { revokeReasonValid, type AgentRevokeReason } from '../siteAgent/siteAgentAdmin';
import {
  BI_PREVIOUS_TOKEN_GRACE_HOURS, BI_TOKEN_LIFETIME_DAYS, EMPTY_BI_SETTINGS,
  addDays, addHours, biTokenHintOf, checkBiApproval, checkBiSettings, checkBiTokenDraft, decideBiPull, fieldsReturned,
  looksLikeBiToken, newBiToken, normaliseBiApproval, normaliseBiTokenDraft, simulatedRowCount, sortBiTokens, tokenIsIdentifiedFor,
  type BiApprovalError, type BiFeedSettings, type BiPullResult, type BiSettingsError, type BiTokenDraft,
  type BiTokenDraftError, type BiTokenRecord, type BiTokenSummary,
} from './biFeedRules';
import type { BiDatasetId } from './biFeedCatalog';

export const BI_FEED_SETTINGS_KEY = 'biFeedSettings';
export const BI_FEED_TOKENS_KEY = 'biFeedTokens';

export interface BiFeedDeps {
  load: <T>(key: string, fallback: T) => T;
  save: (key: string, value: unknown) => void;
  audit: (e: NewAuditLog) => Promise<unknown>;
  actor: () => { name: string };
  now: () => string;
  random: (n: number) => Uint8Array;
  hash: (token: string) => Promise<string>;
}

export type BiFeedError =
  | 'NOT_FOUND' | 'ALREADY_REVOKED' | 'REVOKE_REASON_INVALID' | 'NO_APPROVAL_ON_RECORD'
  | BiSettingsError | BiApprovalError | BiTokenDraftError;

/** The answer to a Simulated pull. Never carries rows. */
export interface BiPullAnswer {
  result: BiPullResult;
  simulated: true;
  tokenName?: string;
  datasetId?: BiDatasetId;
  rows?: number;
  fieldCount?: number;
  /** Whether the answer would carry identifying fields. */
  identified?: boolean;
}

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const fail = (error: BiFeedError): ServiceResult<never> => ({ ok: false, error });

export function toBiSummary(r: BiTokenRecord): BiTokenSummary {
  const { tokenHash: _h, previousTokenHash: _p, recentPulls: _r, ...rest } = r;
  void _h; void _p; void _r;
  return rest;
}

const audit = (event: string, detail: string, user: string): NewAuditLog =>
  ({ type: 'user', event, detail, user, caseId: null, confidence: null });

export function createBiFeedService(d: BiFeedDeps) {
  const readSettings = (): BiFeedSettings => d.load<BiFeedSettings>(BI_FEED_SETTINGS_KEY, EMPTY_BI_SETTINGS);
  const writeSettings = (s: BiFeedSettings) => d.save(BI_FEED_SETTINGS_KEY, s);
  const readTokens = (): BiTokenRecord[] => d.load<BiTokenRecord[]>(BI_FEED_TOKENS_KEY, []);
  const writeTokens = (list: BiTokenRecord[]) => d.save(BI_FEED_TOKENS_KEY, list);
  const log = (e: NewAuditLog) => { void d.audit(e).catch(() => undefined); };
  const newId = () => 'bi-' + Array.from(d.random(6), b => b.toString(16).padStart(2, '0')).join('');
  const names = (ids: readonly string[]) => (ids.length ? ids.join(', ') : 'none');

  async function issue(now: string) {
    const token = newBiToken(d.random);
    return {
      token,
      fields: { tokenHash: await d.hash(token), tokenHint: biTokenHintOf(token), tokenIssuedAt: now, tokenExpiresAt: addDays(now, BI_TOKEN_LIFETIME_DAYS) },
    };
  }

  return {
    async getSettings(): Promise<ServiceResult<BiFeedSettings>> {
      return ok(readSettings());
    },

    /** Switches the feed on or off and chooses what it offers. The approval on record is untouched. */
    async saveSettings(draft: Pick<BiFeedSettings, 'enabled' | 'datasetIds' | 'facilityIds'>): Promise<ServiceResult<BiFeedSettings>> {
      const problems = checkBiSettings(draft);
      if (problems.length) return fail(problems[0]);
      const prev = readSettings();
      const next: BiFeedSettings = {
        ...prev, enabled: draft.enabled, datasetIds: [...new Set(draft.datasetIds)], facilityIds: [...new Set(draft.facilityIds)],
        updatedAt: d.now(), updatedBy: d.actor().name,
      };
      writeSettings(next);
      log(audit('BI Feed Settings Changed',
        `Reporting feed ${next.enabled ? 'on' : 'off'}; datasets: ${names(next.datasetIds)}; facilities: ${names(next.facilityIds)}.`, next.updatedBy as string));
      return ok(next);
    },

    /** Records who approved identified tokens, and why. Needed before any token can be identified. */
    async approveIdentified(raw: { approverName: string; reason: string }): Promise<ServiceResult<BiFeedSettings>> {
      const problems = checkBiApproval(raw);
      if (problems.length) return fail(problems[0]);
      const a = normaliseBiApproval(raw);
      const now = d.now();
      const actor = d.actor().name;
      const next: BiFeedSettings = { ...readSettings(), identifiedApproval: { ...a, approvedAt: now, recordedBy: actor }, updatedAt: now, updatedBy: actor };
      writeSettings(next);
      log(audit('BI Feed Identified Approved', `Identified (not de-identified) feed tokens approved by ${a.approverName}, recorded by ${actor}. Reason: ${a.reason}`, actor));
      return ok(next);
    },

    /** Withdraws the approval. Identified tokens are refused on identifiable datasets until it is recorded again. */
    async withdrawIdentified(): Promise<ServiceResult<BiFeedSettings>> {
      const prev = readSettings();
      if (!prev.identifiedApproval) return fail('NO_APPROVAL_ON_RECORD');
      const { identifiedApproval: gone, ...rest } = prev;
      const actor = d.actor().name;
      const next: BiFeedSettings = { ...rest, updatedAt: d.now(), updatedBy: actor };
      writeSettings(next);
      log(audit('BI Feed Identified Withdrawn', `Approval by ${gone.approverName} withdrawn by ${actor}; identified tokens get nothing identifying until a new approval is recorded.`, actor));
      return ok(next);
    },

    async listTokens(): Promise<ServiceResult<BiTokenSummary[]>> {
      return ok(sortBiTokens(readTokens()).map(toBiSummary));
    },

    /** Creates a token. It is in the answer once and cannot be read again. */
    async createToken(raw: BiTokenDraft): Promise<ServiceResult<{ token: string; summary: BiTokenSummary }>> {
      const settings = readSettings();
      const list = readTokens();
      const problems = checkBiTokenDraft(raw, settings, list);
      if (problems.length) return fail(problems[0]);
      const draft = normaliseBiTokenDraft(raw);
      const now = d.now();
      const { token, fields } = await issue(now);
      const rec: BiTokenRecord = { ...draft, id: newId(), status: 'active', createdAt: now, createdBy: d.actor().name, ...fields };
      writeTokens([...list, rec]);
      log(audit('BI Feed Token Created',
        `Feed token "${rec.name}" created (ending ${rec.tokenHint}, expires ${rec.tokenExpiresAt.slice(0, 10)}); datasets: ${names(rec.datasetIds)}; facilities: ${rec.facilityIds.length ? names(rec.facilityIds) : 'all the feed offers'}; ${rec.identified ? 'identified' : 'de-identified'}.`,
        rec.createdBy));
      return ok({ token, summary: toBiSummary(rec) });
    },

    /** A new token. The previous one keeps working for the grace period. */
    async rotateToken(id: string): Promise<ServiceResult<{ token: string; summary: BiTokenSummary }>> {
      const list = readTokens();
      const current = list.find(t => t.id === id);
      if (!current) return fail('NOT_FOUND');
      if (current.status === 'revoked') return fail('ALREADY_REVOKED');
      const now = d.now();
      const { token, fields } = await issue(now);
      const next: BiTokenRecord = { ...current, ...fields, previousTokenHash: current.tokenHash, previousValidUntil: addHours(now, BI_PREVIOUS_TOKEN_GRACE_HOURS) };
      writeTokens(list.map(t => (t.id === id ? next : t)));
      log(audit('BI Feed Token Rotated', `Feed token "${next.name}" replaced (ending ${current.tokenHint} to ${next.tokenHint}); the old one works until ${next.previousValidUntil}.`, d.actor().name));
      return ok({ token, summary: toBiSummary(next) });
    },

    /** Cuts the token off at once. It is kept for the record and cannot be restored. */
    async revokeToken(id: string, reason: AgentRevokeReason): Promise<ServiceResult<BiTokenSummary>> {
      if (!revokeReasonValid(reason)) return fail('REVOKE_REASON_INVALID');
      const list = readTokens();
      const current = list.find(t => t.id === id);
      if (!current) return fail('NOT_FOUND');
      if (current.status === 'revoked') return fail('ALREADY_REVOKED');
      const note = (reason.note ?? '').trim();
      const next: BiTokenRecord = {
        ...current, status: 'revoked', revokedAt: d.now(), revokedBy: d.actor().name,
        revokedReason: note ? { code: reason.code, note } : { code: reason.code },
        previousTokenHash: undefined, previousValidUntil: undefined,
      };
      writeTokens(list.map(t => (t.id === id ? next : t)));
      log(audit('BI Feed Token Revoked', `Feed token "${next.name}" revoked (${reason.code}); it no longer works.`, next.revokedBy as string));
      return ok(toBiSummary(next));
    },

    /**
     * The Simulated pull: what the API server does when a BI tool presents a token
     * for a dataset. Records the time, dataset and row count on success; refusals
     * are audited. The answer never carries rows.
     */
    async pull(presented: string, datasetId: string): Promise<ServiceResult<BiPullAnswer>> {
      const tokenText = presented.trim();
      if (!looksLikeBiToken(tokenText)) return ok({ result: 'malformed', simulated: true });
      const hash = await d.hash(tokenText);
      const settings = readSettings();
      const list = readTokens();
      const now = d.now();
      const match = list.find(t => t.tokenHash === hash || t.previousTokenHash === hash);
      const result = decideBiPull(match, hash, datasetId, settings, now);
      if (result !== 'ok' || !match) {
        log(audit('BI Feed Pull Refused',
          match ? `Feed token "${match.name}" refused for dataset ${datasetId}: ${result} (Simulated pull).` : 'A token that matches no feed token was presented (Simulated pull).', d.actor().name));
        return ok({ result, simulated: true, tokenName: match?.name });
      }
      const ds = datasetId as BiDatasetId;
      const identified = tokenIsIdentifiedFor(match, ds, settings);
      const fieldCount = fieldsReturned(ds, identified).length;
      const facilityCount = match.facilityIds.length || settings.facilityIds.length;
      const rows = simulatedRowCount(ds, facilityCount);
      const since = new Date(new Date(now).getTime() - 60_000).toISOString();
      const next: BiTokenRecord = {
        ...match, lastPulledAt: now, lastPull: { datasetId: ds, rows, fields: fieldCount, at: now },
        recentPulls: [...(match.recentPulls ?? []).filter(t => t > since), now],
      };
      writeTokens(list.map(t => (t.id === match.id ? next : t)));
      log(audit('BI Feed Pull',
        `Feed token "${match.name}" pulled dataset ${ds}: ${rows} rows, ${fieldCount} fields, ${identified ? 'identified' : 'de-identified'} (Simulated pull).`, d.actor().name));
      return ok({ result: 'ok', simulated: true, tokenName: match.name, datasetId: ds, rows, fieldCount, identified });
    },
  };
}

export type BiFeedService = ReturnType<typeof createBiFeedService>;
