import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpFlagService } from './httpFlagService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpFlagService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
const call = (f: ReturnType<typeof vi.fn>, i = 0) => ({ url: f.mock.calls[i][0] as string, init: f.mock.calls[i][1] as RequestInit });
type Any = Record<string, (...a: unknown[]) => Promise<unknown>>;

describe('createHttpFlagService', () => {
  it('getAll: GET /api/flags/flag/get-all', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).getAll();
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/flags/flag/get-all');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('getById: GET /api/flags/flag/get-by-id?id=a%20b', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).getById("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/flags/flag/get-by-id?id=a%20b');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('add: POST /api/flags/flag/add', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).add({"name": "f"});
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/flags/flag/add');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"name": "f"});
  });
  it('update: POST /api/flags/flag/update', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).update("a b", {"name": "g"});
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/flags/flag/update');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b", "changes": {"name": "g"}});
  });
  it('deactivate: POST /api/flags/flag/deactivate', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).deactivate("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/flags/flag/deactivate');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b"});
  });
  it('reactivate: POST /api/flags/flag/reactivate', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).reactivate("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/flags/flag/reactivate');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b"});
  });
  it('a refusal or a missing item becomes the fixed answer for every method, never the server\'s text', async () => {
    const all: Array<[string, unknown[], string]> = [
      ["getAll", [], "result"],
      ["getById", ["a b"], "result"],
      ["add", [{"name": "f"}], "result"],
      ["update", ["a b", {"name": "g"}], "result"],
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
