import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpHardwareContainerRegistryService } from './httpHardwareContainerRegistryService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const make = (f: ReturnType<typeof vi.fn>) =>
  createHttpHardwareContainerRegistryService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));

// verb, path and body for every method of the interface (the table in the contract doc).
const CALLS: Array<[string, unknown[], string, string, unknown]> = [
  ["getAll", [], "GET", "https://api.test/api/hardware-containers/hardware-container-registry/get-all", null],
  ["getById", ["a b"], "GET", "https://api.test/api/hardware-containers/hardware-container-registry/get-by-id?id=a%20b", null],
  ["getByRackId", ["a b"], "GET", "https://api.test/api/hardware-containers/hardware-container-registry/get-by-rack-id?rackId=a%20b", null],
  ["create", [{"k": 1}], "POST", "https://api.test/api/hardware-containers/hardware-container-registry/create", {"k": 1}],
  ["update", ["a b", {"k": 1}], "POST", "https://api.test/api/hardware-containers/hardware-container-registry/update", {"id": "a b", "changes": {"k": 1}}],
  ["checkOut", ["a b", "a b"], "POST", "https://api.test/api/hardware-containers/hardware-container-registry/check-out", {"rackId": "a b", "batchId": "a b"}],
  ["checkIn", ["a b"], "POST", "https://api.test/api/hardware-containers/hardware-container-registry/check-in", {"rackId": "a b"}],
];

describe('createHttpHardwareContainerRegistryService' + ' (server version)', () => {
  it.each(CALLS)('%s: %s', async (name, args, verb, url, body) => {
    const f = vi.fn().mockResolvedValue(reply(200, { ok: 1 }));
    const r = await (make(f) as unknown as Record<string, (...a: unknown[]) => Promise<{ ok: boolean }>>)[name](...args);
    expect(r.ok).toBe(true);
    expect(f.mock.calls[0][0]).toBe(url);
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe(verb);
    if (body === null) expect([null, '{}']).toContain(init.body ?? null);
    else expect(JSON.parse(String(init.body))).toEqual(body);
  });

  it('turns a refusal into a fixed code, never the server text', async () => {
    const f = vi.fn().mockResolvedValue(reply(403, { message: 'Smith, John 12345' }));
    const r = await (make(f) as unknown as Record<string, (...a: unknown[]) => Promise<{ ok: boolean; error?: string }>>)["getAll"](...[]);
    expect(r).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(JSON.stringify(r)).not.toContain('Smith');
  });
});
