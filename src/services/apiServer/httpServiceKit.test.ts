import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from './apiHttpClient';
import { ApiCallError, buildHttpService, done, enc, list, queryString, required, result, value } from './httpServiceKit';

interface IFoo {
  one(id: string): Promise<{ id: string } | null>;
  all(): Promise<{ id: string }[]>;
  page(q: string): Promise<import('../types').ServiceResult<{ id: string }[]>>;
  save(id: string, body: { n: number }, v?: number): Promise<void>;
}
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const make = (f: ReturnType<typeof vi.fn>) => {
  const client = createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' });
  return buildHttpService<IFoo>(client, {
    one: value('GET', (id: string) => `/api/foos/${enc(id)}`),
    all: list('GET', () => '/api/foos', { pick: (d: { items: { id: string }[] }) => d.items }),
    page: result('GET', (q: string) => `/api/foos${queryString({ q })}`, { pick: (d: { items: { id: string }[] }) => d.items, meta: (d: { next?: string }) => ({ hasMore: !!d.next, nextCursor: d.next }) }),
    save: done('PUT', (id: string) => `/api/foos/${enc(id)}`, { body: (_i: string, b: { n: number }) => b, headers: (_i: string, _b: { n: number }, v?: number) => (v === undefined ? undefined : { 'If-Match': `"${v}"` }) }),
  });
};

describe('queryString and enc', () => {
  it('skips empty values, repeats arrays and encodes', () => {
    expect(queryString({ a: 'x y', b: undefined, c: '', d: [1, 2], e: false })).toBe('?a=x%20y&d=1&d=2&e=false');
    expect(queryString({})).toBe('');
    expect(enc('a/b?c')).toBe('a%2Fb%3Fc');
  });
});

describe('buildHttpService', () => {
  it('value(): data, null when missing, null on any other failure', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(reply(200, { id: 'a' })).mockResolvedValueOnce(reply(404, {})).mockResolvedValueOnce(reply(500, {}));
    const s = make(f);
    expect(await s.one('a/1')).toEqual({ id: 'a' });
    expect(f.mock.calls[0][0]).toBe('https://api.test/api/foos/a%2F1');
    expect(await s.one('b')).toBeNull();
    expect(await s.one('c')).toBeNull();
  });
  it('list(): picks the items, and is empty on failure', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(200, { items: [{ id: 'a' }] })).mockResolvedValueOnce(reply(403, {}));
    const s = make(f);
    expect(await s.all()).toEqual([{ id: 'a' }]);
    expect(await s.all()).toEqual([]);
  });
  it('result(): passes a failure through with its code, and adds the paging meta on success', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(200, { items: [], next: 'n2' })).mockResolvedValueOnce(reply(403, {}));
    const s = make(f);
    expect(await s.page('x')).toEqual({ ok: true, data: [], meta: { hasMore: true, nextCursor: 'n2' } });
    expect(await s.page('x')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });
  it('done(): sends the body and If-Match, resolves on success, throws a code on failure', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(204)).mockResolvedValueOnce(reply(409, { currentVersion: 7 }));
    const s = make(f);
    await expect(s.save('a', { n: 1 }, 3)).resolves.toBeUndefined();
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('PUT');
    expect(init.body).toBe('{"n":1}');
    expect((init.headers as Record<string, string>)['If-Match']).toBe('"3"');
    const err = await s.save('a', { n: 1 }, 3).catch(e => e);
    expect(err).toBeInstanceOf(ApiCallError);
    expect(err.code).toBe('CONFLICT');
    expect(err.currentVersion).toBe(7);
    expect(err.message).toBe('API call failed: CONFLICT');
  });
});

describe('required()', () => {
  interface IBar { make(n: string): Promise<{ id: string }> }
  const bar = (f: ReturnType<typeof vi.fn>) => buildHttpService<IBar>(
    createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }),
    { make: required('POST', () => '/api/bars', { body: (n: string) => ({ n }), pick: (d: { bar: { id: string } }) => d.bar }) });
  it('gives the data, and throws a code (never a default) on a refusal', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(201, { bar: { id: 'b1' } })).mockResolvedValueOnce(reply(403, {})).mockResolvedValueOnce(reply(404, {}));
    const s = bar(f);
    expect(await s.make('x')).toEqual({ id: 'b1' });
    await expect(s.make('x')).rejects.toMatchObject({ code: 'NOT_PERMITTED' });
    await expect(s.make('x')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
