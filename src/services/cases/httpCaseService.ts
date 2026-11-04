// src/services/cases/httpCaseService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 615 (PS-482): the API server's version of ICaseService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are
// the ones in docs/architecture/CASE_API.md. A save with an expected version
// sends `If-Match`; a 409 becomes the same ConcurrencyConflictError the mock
// and the browser-side rules throw, so a screen has one catch path.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, done, list, methodPath, queryString, result, value } from '../apiServer/httpServiceKit';
import { ConcurrencyConflictError } from './ConcurrencyConflictError';
import type { ICaseService } from './ICaseService';

interface CasePage { items: Case[]; nextCursor?: string }

type Args<K extends keyof ICaseService> = Parameters<ICaseService[K]>;
const BASE = '/api/cases/case';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpCaseService(client: ApiHttpClient): ICaseService {
  const routes = buildHttpService<ICaseService>(client, {
    getCase: value('GET', (caseId: Args<'getCase'>[0]) => `${route('getCase')}${queryString({ caseId })}`, { missing: undefined }),
    getAll: result('POST', () => route('getAll'), { body: (p: Args<'getAll'>[0]) => ({ ...p, cursor: p?.pageSize ? p.cursor : undefined }), pick: (d: CasePage) => d.items ?? [], meta: (d: CasePage) => (d.nextCursor ? { hasMore: true, nextCursor: d.nextCursor } : { hasMore: false }) }),
    listCasesForUser: list('GET', (userId: Args<'listCasesForUser'>[0]) => `${route('listCasesForUser')}${queryString({ userId })}`, { pick: (d: CasePage) => d.items ?? [] }),
    updateCase: done('POST', () => route('updateCase'), { body: (caseId: string, updates: Partial<Case>) => ({ caseId, updates }), headers: (_id: string, _u: Partial<Case>, expectedVersion?: number) =>
        expectedVersion === undefined ? undefined : { 'If-Match': `"${expectedVersion}"` } }),
    createCase: done('POST', () => route('createCase'), { body: (c: Case) => c }),
  });
  // A 409 on a versioned save is the app's own conflict error, not a generic failure.
  return {
    ...routes,
    async updateCase(caseId, updates, expectedVersion) {
      try {
        await routes.updateCase(caseId, updates, expectedVersion);
      } catch (e) {
        if (e instanceof Error && (e as { code?: string }).code === 'CONFLICT' && expectedVersion !== undefined) {
          const actual = (e as { currentVersion?: number }).currentVersion;
          throw new ConcurrencyConflictError(caseId, expectedVersion, actual ?? -1);
        }
        throw e;
      }
    },
  };
}
