import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpHeldReleaseService } from './httpHeldReleaseService';

// Batch 672: the held-release calls against a fake fetch.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpHeldReleaseService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
const held = { id: 'h1', caseId: 'c1' } as never;

describe('createHttpHeldReleaseService', () => {
  it('has a call for every method of the interface', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(['add', 'getAll', 'getByCaseId', 'settle']);
  });
  it('add, getAll and getByCaseId send the documented calls', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, { id: 'h1' }));
    const s = svc(f);
    expect(await s.add(held)).toMatchObject({ ok: true });
    await s.getAll(); await s.getByCaseId('c 1');
    expect(f.mock.calls.map(c => `${(c[1] as RequestInit).method} ${c[0]}`)).toEqual([
      'POST https://api.test/api/report-release/held-release/add',
      'GET https://api.test/api/report-release/held-release/get-all',
      'GET https://api.test/api/report-release/held-release/get-by-case-id?caseId=c%201',
    ]);
    expect(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string)).toEqual(held);
  });
  it('settle sends id, status and time, and answers true only when the server says it settled', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(200, { settled: true })).mockResolvedValueOnce(reply(200, { settled: false }))
      .mockResolvedValueOnce(reply(404, {})).mockResolvedValueOnce(reply(500, {}));
    const s = svc(f);
    expect(await s.settle('h1', 'released', '2026-10-25T10:00:00Z')).toBe(true);
    expect(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string)).toEqual({ id: 'h1', status: 'released', at: '2026-10-25T10:00:00Z' });
    expect(f.mock.calls[0][0]).toBe('https://api.test/api/report-release/held-release/settle');
    expect(await s.settle('h1', 'recalled', 't')).toBe(false);
    expect(await s.settle('nope', 'recalled', 't')).toBe(false);
    expect(await s.settle('h1', 'recalled', 't')).toBe(false);
  });
});
