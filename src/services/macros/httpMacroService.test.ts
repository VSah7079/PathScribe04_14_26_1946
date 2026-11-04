import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpMacroService } from './httpMacroService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpMacroService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
const call = (f: ReturnType<typeof vi.fn>, i = 0) => ({ url: f.mock.calls[i][0] as string, init: f.mock.calls[i][1] as RequestInit });
type Any = Record<string, (...a: unknown[]) => Promise<unknown>>;

describe('createHttpMacroService', () => {
  it('getAll: GET /api/macros/macro/get-all', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).getAll();
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/macros/macro/get-all');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('getById: GET /api/macros/macro/get-by-id?id=a%20b', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).getById("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/macros/macro/get-by-id?id=a%20b');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('getByShortcut: GET /api/macros/macro/get-by-shortcut?shortcut=.nl', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).getByShortcut(".nl");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/macros/macro/get-by-shortcut?shortcut=.nl');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('getForSubspecialty: GET /api/macros/macro/get-for-subspecialty?subspecialtyId=sub%201', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).getForSubspecialty("sub 1");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/macros/macro/get-for-subspecialty?subspecialtyId=sub%201');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('add: POST /api/macros/macro/add', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).add({"shortcut": ".x"});
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/macros/macro/add');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"shortcut": ".x"});
  });
  it('update: POST /api/macros/macro/update', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).update("a b", {"text": "t"});
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/macros/macro/update');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b", "changes": {"text": "t"}});
  });
  it('deactivate: POST /api/macros/macro/deactivate', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).deactivate("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/macros/macro/deactivate');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b"});
  });
  it('reactivate: POST /api/macros/macro/reactivate', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).reactivate("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/macros/macro/reactivate');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b"});
  });
  it('a refusal or a missing item becomes the fixed answer for every method, never the server\'s text', async () => {
    const all: Array<[string, unknown[], string]> = [
      ["getAll", [], "result"],
      ["getById", ["a b"], "result"],
      ["getByShortcut", [".nl"], "result"],
      ["getForSubspecialty", ["sub 1"], "result"],
      ["add", [{"shortcut": ".x"}], "result"],
      ["update", ["a b", {"text": "t"}], "result"],
      ["deactivate", ["a b"], "result"],
      ["reactivate", ["a b"], "result"],
    ];
    for (const [name, args, kind] of all) {
      const f = vi.fn().mockResolvedValue(reply(403, { message: 'Patient Jane Doe' }));
      const run = (svc(f) as unknown as Any)[name](...args);
      if (kind === 'result') expect(await run).toEqual({ ok: false, error: 'NOT_PERMITTED' });
      else if (kind === 'list') expect(await run).toEqual([]);
      else if (kind === 'done') await expect(run).rejects.toMatchObject({ code: 'NOT_PERMITTED' });
      else await run;
      const g = vi.fn().mockResolvedValue(reply(404, {}));
      const miss = (svc(g) as unknown as Any)[name](...args);
      if (kind === 'result') expect(await miss).toEqual({ ok: false, error: 'NOT_FOUND' });
      else if (kind === 'list') expect(await miss).toEqual([]);
      else if (kind === 'done') await expect(miss).rejects.toMatchObject({ code: 'NOT_FOUND' });
      else await miss;
    }
  });
});
