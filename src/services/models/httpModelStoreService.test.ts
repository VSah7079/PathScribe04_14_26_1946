import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpModelStoreService } from './httpModelStoreService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpModelStoreService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
const call = (f: ReturnType<typeof vi.fn>, i = 0) => ({ url: f.mock.calls[i][0] as string, init: f.mock.calls[i][1] as RequestInit });
type Any = Record<string, (...a: unknown[]) => Promise<unknown>>;

describe('createHttpModelStoreService', () => {
  it('checkAuthorization: GET /api/models/model-store/check-authorization', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).checkAuthorization();
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/models/model-store/check-authorization');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('getAvailable: GET /api/models/model-store/get-available', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).getAvailable();
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/models/model-store/get-available');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('download: POST /api/models/model-store/download', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).download("m 1");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/models/model-store/download');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"modelId": "m 1"});
  });
  it('a refusal or a missing item becomes the fixed answer for every method, never the server\'s text', async () => {
    const all: Array<[string, unknown[], string]> = [
      ["checkAuthorization", [], "result"],
      ["getAvailable", [], "result"],
      ["download", ["m 1"], "result"],
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
