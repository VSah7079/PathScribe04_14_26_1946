import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { ConcurrencyConflictError } from './ConcurrencyConflictError';
import { createHttpCaseService } from './httpCaseService';
import type { Case } from '@/types/case/Case';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpCaseService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
const url = (f: ReturnType<typeof vi.fn>, i = 0) => f.mock.calls[i][0] as string;

describe('createHttpCaseService', () => {
  it('reads one case, and gives undefined when the server has none', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(200, { id: 'S26-1' })).mockResolvedValueOnce(reply(404, {}));
    const s = svc(f);
    expect(await s.getCase('S26-1')).toEqual({ id: 'S26-1' });
    expect(await s.getCase('nope')).toBeUndefined();
    expect(url(f)).toBe('https://api.test/api/cases/case/get-case?caseId=S26-1');
  });
  it('lists with filters and passes the next-page cursor on', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, { items: [{ id: 'a' }], nextCursor: 'c2' }));
    const r = await svc(f).getAll({ search: 'smith', status: ['Signed Out', 'Draft'] as never, pageSize: 25, cursor: 'c1' });
    expect(r).toEqual({ ok: true, data: [{ id: 'a' }], meta: { hasMore: true, nextCursor: 'c1'.replace('c1', 'c2') } });
    expect(url(f)).toBe('https://api.test/api/cases/case/get-all');
    expect((f.mock.calls[0][1] as RequestInit).method).toBe('POST');
    expect(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string)).toEqual({ search: 'smith', status: ['Signed Out', 'Draft'], pageSize: 25, cursor: 'c1' });
  });
  it('ignores a cursor with no page size', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, { items: [] }));
    await svc(f).getAll({ cursor: 'c1' });
    expect(url(f)).toBe('https://api.test/api/cases/case/get-all');
    expect(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string)).toEqual({});
  });
  it('lists a user\'s cases for the worklist', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, { items: [{ id: 'a' }] }));
    expect(await svc(f).listCasesForUser('u 1')).toEqual([{ id: 'a' }]);
    expect(url(f)).toBe('https://api.test/api/cases/case/list-cases-for-user?userId=u%201');
  });
  it('saves with If-Match and turns a 409 into the app\'s conflict error', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(200, {})).mockResolvedValueOnce(reply(409, { currentVersion: 9 }));
    const s = svc(f);
    await s.updateCase('a', { version: 4 } as Partial<Case>, 4);
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ caseId: 'a', updates: { version: 4 } });
    expect((init.headers as Record<string, string>)['If-Match']).toBe('"4"');
    const err = await s.updateCase('a', {}, 4).catch(e => e);
    expect(err).toBeInstanceOf(ConcurrencyConflictError);
    expect([err.expectedVersion, err.actualVersion]).toEqual([4, 9]);
  });
  it('saves without a version when none is given (no If-Match)', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {}));
    await svc(f).updateCase('a', {});
    expect((f.mock.calls[0][1] as RequestInit).headers as Record<string, string>).not.toHaveProperty('If-Match');
  });
  it('creates a case, and a refusal throws a code', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(201, {})).mockResolvedValueOnce(reply(403, {}));
    const s = svc(f);
    await s.createCase({ id: 'x' } as Case);
    expect((f.mock.calls[0][1] as RequestInit).method).toBe('POST');
    await expect(s.createCase({ id: 'x' } as Case)).rejects.toMatchObject({ code: 'NOT_PERMITTED' });
  });
});
