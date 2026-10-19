// src/services/material/httpCaseMaterialService.test.ts
// Batch 618 (PS-482): the API server's case material service, against a fake fetch.
import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpCaseMaterialService } from './httpCaseMaterialService';
import type { DecantChange } from './materialTree';
import { caseMaterialService } from './caseMaterialServiceInstance';
import { mockCaseMaterialService } from './mockCaseMaterialService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpCaseMaterialService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
const change: DecantChange = { kind: 'delete', decantId: 'D1' };
const body = (f: ReturnType<typeof vi.fn>) => JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);

describe('createHttpCaseMaterialService', () => {
  it('posts the change with the expected version to the one route, and nothing identifying is in the URL', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, { specimens: [], rowVersion: 5, change: 'deleted', event: { parentId: 'SP-A', childId: 'D1' }, billing: { changed: [], removedMaterialIds: ['D1'] } }));
    await svc(f).applyDecantChange('S26-1', change, 4);
    expect(f.mock.calls[0][0]).toBe('https://api.test/api/material/case-material/apply-decant-change');
    expect((f.mock.calls[0][1] as RequestInit).method).toBe('POST');
    expect(body(f)).toEqual({ caseId: 'S26-1', change, expectedVersion: 4 });
  });
  it('turns the success into the app\'s result: the new version, the tree and the billing lines', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, { specimens: [{ id: 'SP-A' }], rowVersion: 5, change: 'deleted', event: { parentId: 'SP-A', childId: 'D1' }, billing: { changed: [], removedMaterialIds: ['D1'] } }));
    expect(await svc(f).applyDecantChange('S26-1', change, 4)).toEqual({
      ok: true, specimens: [{ id: 'SP-A' }], version: 5, change: 'deleted', event: { parentId: 'SP-A', childId: 'D1' }, billing: { changed: [], removedMaterialIds: ['D1'] },
    });
  });
  it('a stale version is a conflict that carries the version the server holds', async () => {
    const f = vi.fn().mockResolvedValue(reply(409, { currentVersion: 9 }));
    expect(await svc(f).applyDecantChange('S26-1', change, 4)).toEqual({ ok: false, error: 'conflict', currentVersion: 9 });
  });
  it('a refused delete and a missing case keep the app\'s names', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, {})).mockResolvedValueOnce(reply(404, {}));
    const s = svc(f);
    expect(await s.applyDecantChange('S26-1', change, 4)).toEqual({ ok: false, error: 'notPermitted' });
    expect(await s.applyDecantChange('nope', change, 4)).toEqual({ ok: false, error: 'caseNotFound' });
  });
  it.each([
    ['SPECIMEN_NOT_FOUND', 'specimenNotFound'], ['DECANT_NOT_FOUND', 'decantNotFound'], ['DUPLICATE_ID', 'duplicateId'],
    ['PARENT_NOT_FOUND', 'parentNotFound'], ['HAS_CHILDREN', 'hasChildren'],
  ])('a 422 with %s is the tree refusal %s', async (code, refusal) => {
    const f = vi.fn().mockResolvedValue(reply(422, { code }));
    expect(await svc(f).applyDecantChange('S26-1', { kind: 'update', decantId: 'D1', patch: {} } as DecantChange, 4)).toEqual({ ok: false, error: refusal });
  });
  it('any other failure is a save failure that carries only the fixed code, never the server\'s text', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(500, { message: 'Smith, John 1960 failed' })).mockRejectedValueOnce(new Error('offline'));
    const s = svc(f);
    expect(await s.applyDecantChange('S26-1', change, 4)).toEqual({ ok: false, error: 'saveFailed', detail: 'UNAVAILABLE' });
    expect(await s.applyDecantChange('S26-1', change, 4)).toEqual({ ok: false, error: 'saveFailed', detail: 'UNAVAILABLE' });
  });
  it('is the demo\'s version when no API server is configured', () => {
    expect(caseMaterialService).toBe(mockCaseMaterialService);
  });
});
