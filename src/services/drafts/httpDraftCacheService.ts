// src/services/drafts/httpDraftCacheService.ts
// Batch 616 (PS-505): the API server's draft store (accessioning and report drafts). Drafts hold PHI,
// so on a server deployment they live on the server, not in the browser. Contract: ACCESSIONING_API.md section 3.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IDraftCacheService } from './IDraftCacheService';

type Args<K extends keyof IDraftCacheService> = Parameters<IDraftCacheService[K]>;
const BASE = '/api/drafts/draft-cache';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpDraftCacheService(client: ApiHttpClient): IDraftCacheService {
  const routes = buildHttpService<IDraftCacheService>(client, {
    saveDraft: result('POST', () => route('saveDraft'), { body: (userId: string, entityId: string, payload: unknown) => ({ userId, entityId, payload }) }),
    getDraft: result('GET', (userId: Args<'getDraft'>[0], entityId: Args<'getDraft'>[1]) => `${route('getDraft')}${queryString({ userId, entityId })}`),
    clearDraft: result('POST', () => route('clearDraft'), { body: (userId: Args<'clearDraft'>[0], entityId: Args<'clearDraft'>[1]) => ({ userId, entityId }) }),
    clearAllDraftsForUser: result('POST', () => route('clearAllDraftsForUser'), { body: (userId: Args<'clearAllDraftsForUser'>[0]) => ({ userId }) }),
  });
  return {
    ...routes,
    // A missing draft is a normal answer ({ ok: true, data: null }), not an error.
    getDraft: (async (userId: string, entityId: string) => {
      const r = await routes.getDraft(userId, entityId);
      return r.ok === false && r.error === 'NOT_FOUND' ? { ok: true as const, data: null } : r;
    }) as IDraftCacheService['getDraft'],
  };
}
