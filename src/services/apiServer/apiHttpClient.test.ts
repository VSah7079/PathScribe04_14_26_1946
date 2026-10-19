import { describe, expect, it, vi } from 'vitest';
import { apiErrorCode, createApiHttpClient, selectByConfiguration } from './apiHttpClient';

const reply = (status: number, body?: unknown): Response =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });
const client = (fetchImpl: typeof fetch, token = 'tok', timeoutMs?: number) =>
  createApiHttpClient({ baseUrl: 'https://api.example.test/', fetch: fetchImpl, accessToken: async () => token, timeoutMs });

describe('apiErrorCode', () => {
  it.each([[401, 'SIGNED_OUT'], [403, 'NOT_PERMITTED'], [404, 'NOT_FOUND'], [409, 'CONFLICT'], [429, 'TOO_MANY_REQUESTS'], [400, 'INVALID'], [422, 'INVALID'], [500, 'UNAVAILABLE'], [503, 'UNAVAILABLE']])(
    'status %i gives %s', (status, code) => expect(apiErrorCode(status, null)).toBe(code));
  it('uses a well-formed code from the server', () => expect(apiErrorCode(409, { code: 'CASE_CHANGED' })).toBe('CASE_CHANGED'));
  it('ignores a code that is not a short upper-case code, and never uses message text', () => {
    expect(apiErrorCode(404, { code: 'Smith, John not found' })).toBe('NOT_FOUND');
    expect(apiErrorCode(500, { message: 'Patient Smith' })).toBe('UNAVAILABLE');
  });
});

describe('createApiHttpClient', () => {
  it('sends the token and the JSON body, and joins the address without a double slash', async () => {
    const f = vi.fn(async () => reply(200, { id: 'a' }));
    const r = await client(f as unknown as typeof fetch).post('cases', { n: 1 });
    expect(r).toEqual({ ok: true, data: { id: 'a' } });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.example.test/cases');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(init.body).toBe('{"n":1}');
  });
  it('sends no Authorization header when nobody is signed in, and no body on a GET', async () => {
    const f = vi.fn(async () => reply(200, []));
    await client(f as unknown as typeof fetch, '').get('/cases');
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.body).toBeUndefined();
  });
  it('maps a failed response to a code and keeps the server message out', async () => {
    const f = async () => reply(403, { message: 'Patient Smith may not' });
    expect(await client(f as unknown as typeof fetch).get('/x')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });
  it('treats 204 as success with no data', async () => {
    const f = async () => reply(204);
    expect(await client(f as unknown as typeof fetch).delete('/x/1')).toEqual({ ok: true, data: undefined });
  });
  it('treats a success that is not JSON as UNAVAILABLE', async () => {
    const f = async () => new Response('<html>', { status: 200 });
    expect(await client(f as unknown as typeof fetch).get('/x')).toEqual({ ok: false, error: 'UNAVAILABLE' });
  });
  it('gives UNAVAILABLE when the network fails', async () => {
    const f = async () => { throw new TypeError('network'); };
    expect(await client(f as unknown as typeof fetch).get('/x')).toEqual({ ok: false, error: 'UNAVAILABLE' });
  });
  it('gives TIMED_OUT when the call takes too long', async () => {
    const f = (_u: string, init: RequestInit) => new Promise<Response>((_res, rej) => {
      init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
    });
    expect(await client(f as unknown as typeof fetch, 'tok', 10).get('/x')).toEqual({ ok: false, error: 'TIMED_OUT' });
  });
});

describe('selectByConfiguration', () => {
  it('uses the mock without an address, the server version with one', () => {
    const mock = { kind: 'mock' };
    const make = vi.fn((u: string) => ({ kind: u }));
    expect(selectByConfiguration(null, mock, make)).toBe(mock);
    expect(make).not.toHaveBeenCalled();
    expect(selectByConfiguration('https://a.test', mock, make)).toEqual({ kind: 'https://a.test' });
  });
});
