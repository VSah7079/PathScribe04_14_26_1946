// src/services/displayAccess/mockDisplayAccessService.ts
// ─────────────────────────────────────────────────
// Batch 603: demo implementation of the device-binding registry. In
// production the API server holds this registry and every request from a wall
// display carries the token (X-Display-Token or Authorization: Bearer); a
// revoked, expired or unknown token gets 401 and the display blanks
// (docs/architecture/DISPLAY_ACCESS_API.md). Issuing and revoking need the
// display's own Configuration capability.
// ─────────────────────────────────────────────────
import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import type { IDisplayAccessService, DisplayBindingSummary } from './IDisplayAccessService';
import {
  DEFAULT_DISPLAY_TOKEN_DAYS, evaluateDisplayBinding, generateDisplayToken, hashDisplayToken,
  type DisplayBinding, type DisplayKind,
} from './displayToken';

const STORAGE_KEY = 'displayDeviceBindings';
const DAY_MS = 86_400_000;

let _cache: DisplayBinding[] = storageGet<DisplayBinding[]>(STORAGE_KEY, []);
const persist = () => storageSet(STORAGE_KEY, _cache);
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = (message: string): ServiceResult<never> => ({ ok: false, error: message });

const find = (kind: DisplayKind, subjectId: ID) => _cache.find(b => b.kind === kind && b.subjectId === subjectId);

export function summarize(b: DisplayBinding, now: Date = new Date()): DisplayBindingSummary {
  const state = b.revokedAt ? 'revoked' : new Date(b.expiresAt).getTime() <= now.getTime() ? 'expired' : 'valid';
  return { kind: b.kind, subjectId: b.subjectId, tokenHint: b.tokenHint, issuedAt: b.issuedAt, expiresAt: b.expiresAt, revokedAt: b.revokedAt, state };
}

async function issue(kind: DisplayKind, subjectId: ID, validDays: number) {
  if (!subjectId) return err('A display is required.');
  if (!(validDays > 0)) return err('The token must be valid for at least one day.');
  const token = generateDisplayToken();
  const now = new Date();
  const binding: DisplayBinding = {
    kind, subjectId, tokenHash: await hashDisplayToken(token), tokenHint: token.slice(-4),
    issuedAt: now.toISOString(), expiresAt: new Date(now.getTime() + validDays * DAY_MS).toISOString(),
  };
  _cache = [..._cache.filter(b => !(b.kind === kind && b.subjectId === subjectId)), binding];
  persist();
  return ok({ token, binding: summarize(binding, now) });
}

function revoke(kind: DisplayKind, subjectId: ID) {
  const existing = find(kind, subjectId);
  if (!existing) return err('No token has been issued for this display.');
  const revoked = { ...existing, revokedAt: existing.revokedAt ?? new Date().toISOString() };
  _cache = _cache.map(b => (b === existing ? revoked : b));
  persist();
  return ok(summarize(revoked));
}

const unchecked: IDisplayAccessService = {
  issueFacilityOpsToken: (id, days = DEFAULT_DISPLAY_TOKEN_DAYS) => issue('facility-ops', id, days),
  issueOrSuiteToken: (id, days = DEFAULT_DISPLAY_TOKEN_DAYS) => issue('or-suite', id, days),
  async revokeFacilityOpsToken(id) { return revoke('facility-ops', id); },
  async revokeOrSuiteToken(id) { return revoke('or-suite', id); },
  async verify(kind, subjectId, token) {
    const presented = token && token.trim() ? await hashDisplayToken(token) : null;
    return evaluateDisplayBinding(find(kind, subjectId), presented);
  },
  async getSummary(kind, subjectId) {
    const b = find(kind, subjectId);
    return b ? summarize(b) : null;
  },
  async getAllSummaries(kind) {
    return _cache.filter(b => b.kind === kind).map(b => summarize(b));
  },
};

export const mockDisplayAccessService: IDisplayAccessService = guardConfigWrites(unchecked, [
  ['config:display-profiles:manage', ['issueFacilityOpsToken', 'revokeFacilityOpsToken']],
  ['config:or-suite-terminals:manage', ['issueOrSuiteToken', 'revokeOrSuiteToken']],
]);

/** Test seam: forgets every binding. */
export function resetDisplayBindingsForTests(): void { _cache = []; persist(); }
