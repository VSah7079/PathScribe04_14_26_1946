import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpAiBehaviorService } from './httpAiBehaviorService';

// Batch 617 (PS-514): every call of IAIBehaviorService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpAiBehaviorService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<unknown>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]): Promise<unknown> => (svc(f) as unknown as Record<string, Call>)[name](...args);
const rejection = async (p: Promise<unknown>): Promise<string> => { try { await p; return 'none'; } catch (e) { return (e as { code?: string }).code ?? 'none'; } };

const CALLS: { name: string; kind: string; verb: string; path: string; body?: unknown; missing: unknown; args: unknown[] }[] = [
  { name: 'get', kind: 'result', verb: 'GET', path: '/api/ai-behavior/ai-behavior/get', missing: null, args: [] },
  { name: 'update', kind: 'result', verb: 'POST', path: '/api/ai-behavior/ai-behavior/update', body: {"sample":1}, missing: null, args: [{ sample: 1 } as never] },
  { name: 'reset', kind: 'result', verb: 'POST', path: '/api/ai-behavior/ai-behavior/reset', missing: null, args: [] },
];
const okBody = (kind: string): unknown => (kind === 'list' ? { items: [{ id: 'r1' }] } : kind === 'done' ? {} : kind === 'value' ? { id: 'r1' } : kind === 'resultCustom' ? { ok: true, data: { id: 'r1' } } : { id: 'r1' });

describe('createHttpAiBehaviorService', () => {
  it('has a call for every method of the interface', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(CALLS.map(c => c.name).sort());
  });
  it.each(CALLS)('$name sends $verb $path', async (c) => {
    const f = vi.fn().mockResolvedValue(reply(200, okBody(c.kind)));
    await call(f, c.name, c.args);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe(`https://api.test${c.path}`);
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe(c.verb);
    if (c.body === undefined) expect(init.body === undefined || init.body === '{}').toBe(true);
    else expect(JSON.parse(init.body as string)).toEqual(c.body);
  });
  it.each(CALLS)('$name returns the data on success', async (c) => {
    const f = vi.fn().mockResolvedValue(reply(200, okBody(c.kind)));
    const r = await call(f, c.name, c.args);
    if (c.kind === 'result') expect(r).toMatchObject({ ok: true, data: { id: 'r1' } });
    else if (c.kind === 'list') expect(r).toEqual([{ id: 'r1' }]);
    else if (c.kind === 'done') expect(r).toBeUndefined();
    else if (c.kind === 'requiredOk') expect(r).toMatchObject({ ok: true });
    else if (c.kind === 'resultCustom') expect(r).toEqual({ ok: true, data: { id: 'r1' } });
    else expect(r).toEqual({ id: 'r1' });
  });
  it.each(CALLS)('$name turns a 403 and a 404 into fixed codes', async (c) => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, { message: 'Smith, J. MRN 123' })).mockResolvedValueOnce(reply(404, {}));
    if (c.kind === 'result') {
      expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
      expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_FOUND' });
    } else if (c.kind === 'resultCustom') {
      expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_PERMITTED', code: 'NOT_PERMITTED' });
      expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_FOUND', code: 'NOT_FOUND' });
    } else if (c.kind === 'list' || c.kind === 'value') {
      const fallback = c.kind === 'list' ? [] : c.missing;
      expect(await call(f, c.name, c.args)).toEqual(fallback);
      expect(await call(f, c.name, c.args)).toEqual(fallback);
    } else {
      expect(await rejection(call(f, c.name, c.args))).toBe('NOT_PERMITTED');
      expect(await rejection(call(f, c.name, c.args))).toBe('NOT_FOUND');
    }
  });
});
