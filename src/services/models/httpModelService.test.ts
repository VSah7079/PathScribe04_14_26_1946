import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpModelService } from './httpModelService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpModelService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
const call = (f: ReturnType<typeof vi.fn>, i = 0) => ({ url: f.mock.calls[i][0] as string, init: f.mock.calls[i][1] as RequestInit });
type Any = Record<string, (...a: unknown[]) => Promise<unknown>>;

describe('createHttpModelService', () => {
  it('getAll: GET /api/models/model/get-all', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).getAll();
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/models/model/get-all');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('getById: GET /api/models/model/get-by-id?id=a%20b', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).getById("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/models/model/get-by-id?id=a%20b');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('getActive: GET /api/models/model/get-active', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).getActive();
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/models/model/get-active');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('getDefault: GET /api/models/model/get-default', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).getDefault();
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/models/model/get-default');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('getDefaultVoiceModel: GET /api/models/model/get-default-voice-model', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).getDefaultVoiceModel();
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/models/model/get-default-voice-model');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('setDefault: POST /api/models/model/set-default', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).setDefault("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/models/model/set-default');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b"});
  });
  it('update: POST /api/models/model/update', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).update("a b", {"name": "x"});
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/models/model/update');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b", "changes": {"name": "x"}});
  });
  it('retire: POST /api/models/model/retire', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).retire("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/models/model/retire');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b"});
  });
  it('adopt: POST /api/models/model/adopt', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).adopt("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/models/model/adopt');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"modelId": "a b"});
  });
  it('a refusal or a missing item becomes the fixed answer for every method, never the server\'s text', async () => {
    const all: Array<[string, unknown[], string]> = [
      ["getAll", [], "result"],
      ["getById", ["a b"], "result"],
      ["getActive", [], "result"],
      ["getDefault", [], "result"],
      ["getDefaultVoiceModel", [], "result"],
      ["setDefault", ["a b"], "result"],
      ["update", ["a b", {"name": "x"}], "result"],
      ["retire", ["a b"], "result"],
      ["adopt", ["a b"], "result"],
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
