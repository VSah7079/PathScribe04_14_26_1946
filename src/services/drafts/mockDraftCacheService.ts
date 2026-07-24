// src/services/drafts/mockDraftCacheService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Mock implementation of IDraftCacheService. localStorage-backed, matching
// every other mock service in this codebase's ok/err/delay convention.
//
// SECURITY, per the original spec's own rules (pulled forward from Phase 3
// rather than deferred, since it's cheap to do correctly from the start and
// expensive to retrofit later):
//   - Callers are responsible for excluding sensitive fields (SSN, full DOB
//     if ever added, etc.) from whatever payload they pass in — this service
//     has no way to know what's sensitive in an arbitrary caller's data shape.
//   - Real encryption of the cached payload is NOT implemented here — that's
//     genuinely Phase 3, and needs a real backend/production auth posture
//     (a real client-side key derived at login) to be meaningful. Doing a
//     fake/weak "obfuscation" now would be worse than being honest that this
//     is plaintext in localStorage today, same reasoning as not claiming
//     Phase 1's warning modal auto-saves anything before it actually did.
//
// Retention: drafts older than RETENTION_DAYS are silently dropped on next
// read, matching the spec's Drafts:RetentionDays default.
// ─────────────────────────────────────────────────────────────────────────────

import type { IDraftCacheService, DraftRecord } from './IDraftCacheService';
import type { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';

const STORAGE_KEY = 'pathscribe_drafts';
const RETENTION_DAYS = 7;

type DraftStore = Record<string, DraftRecord>; // keyed by `${userId}:${entityId}`

const ok    = <T>(data: T): ServiceResult<T>    => ({ ok: true,  data });
const delay = () => new Promise(r => setTimeout(r, 30));

function draftKey(userId: string, entityId: string): string {
  return `${userId}:${entityId}`;
}

function loadStore(): DraftStore {
  return storageGet<DraftStore>(STORAGE_KEY, {});
}

function persistStore(store: DraftStore): void {
  storageSet(STORAGE_KEY, store);
}

function isExpired(savedAt: string): boolean {
  const ageMs = Date.now() - new Date(savedAt).getTime();
  return ageMs > RETENTION_DAYS * 24 * 60 * 60 * 1000;
}

export const mockDraftCacheService: IDraftCacheService = {

  async saveDraft<T>(userId: string, entityId: string, payload: T) {
    await delay();
    const store = loadStore();
    store[draftKey(userId, entityId)] = {
      entityId, payload, userId,
      savedAt: new Date().toISOString(),
    };
    persistStore(store);
    return ok(undefined);
  },

  async getDraft<T>(userId: string, entityId: string) {
    await delay();
    const store = loadStore();
    const key = draftKey(userId, entityId);
    const record = store[key] as DraftRecord<T> | undefined;
    if (!record) return ok(null);
    if (isExpired(record.savedAt)) {
      delete store[key];
      persistStore(store);
      return ok(null);
    }
    return ok(record);
  },

  async clearDraft(userId: string, entityId: string) {
    await delay();
    const store = loadStore();
    delete store[draftKey(userId, entityId)];
    persistStore(store);
    return ok(undefined);
  },

  async clearAllDraftsForUser(userId: string) {
    await delay();
    const store = loadStore();
    for (const key of Object.keys(store)) {
      if (store[key].userId === userId) delete store[key];
    }
    persistStore(store);
    return ok(undefined);
  },
};
