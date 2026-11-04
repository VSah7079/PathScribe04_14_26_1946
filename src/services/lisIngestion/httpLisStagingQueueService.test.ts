import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpLisStagingQueueService } from './httpLisStagingQueueService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpLisStagingQueueService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
const call = (f: ReturnType<typeof vi.fn>, i = 0) => ({ url: f.mock.calls[i][0] as string, init: f.mock.calls[i][1] as RequestInit });
type Any = Record<string, (...a: unknown[]) => Promise<unknown>>;

describe('createHttpLisStagingQueueService', () => {
  it('load: GET /api/lis-ingestion/lis-staging-queue/load', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, [{"id": "r1"}]));
    const r = await (svc(f) as unknown as Any).load();
    expect(r).toEqual([{"id": "r1"}]);
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/lis-ingestion/lis-staging-queue/load');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('save: POST /api/lis-ingestion/lis-staging-queue/save', async () => {
    const f = vi.fn().mockResolvedValue(reply(204, undefined));
    const r = await (svc(f) as unknown as Any).save([{"id": "e1"}]);
    expect(r).toBeUndefined();
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/lis-ingestion/lis-staging-queue/save');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual([{"id": "e1"}]);
  });
  it('a refusal or a missing item becomes the fixed answer for every method, never the server\'s text', async () => {
    const all: Array<[string, unknown[], string]> = [
      ["load", [], "list"],
      ["save", [[{"id": "e1"}]], "done"],
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
