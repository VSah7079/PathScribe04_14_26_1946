// src/services/apiServer/httpTestHelpers.ts
// Batch 616: helpers for testing a server version of a service with a fake fetch (HTTP_SERVICES_PATTERN.md §5).
//   const { client, fetch } = fakeApi(200, { items: [] });
//   await expectCalls(service, fetch, [['getAll', [], 'GET', '/api/things'], ...]);
// Every method of the interface should appear in the table: `expectEveryMethod` fails if one is missing.
import { expect, vi } from 'vitest';
import { createApiHttpClient, type ApiHttpClient } from './apiHttpClient';

export const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });

export function fakeApi(status = 200, body: unknown = {}): { client: ApiHttpClient; fetch: ReturnType<typeof vi.fn> } {
  const f = vi.fn().mockImplementation(async () => reply(status, body));
  return { client: createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }), fetch: f };
}

/** [method name, arguments, expected verb, expected path (with query), expected JSON body (omit for none)] */
export type CallCase = [string, unknown[], string, string, unknown?];

/** Calls each method once against a server that answers 200 `{}` and checks the verb, path and body it sent. */
export async function expectCalls(service: object, f: ReturnType<typeof vi.fn>, cases: CallCase[]): Promise<void> {
  for (const [name, args, verb, path, body] of cases) {
    f.mockClear();
    await (service as Record<string, (...a: unknown[]) => Promise<unknown>>)[name](...args).catch(() => undefined);
    expect(f, name).toHaveBeenCalledTimes(1);
    const init = f.mock.calls[0][1] as RequestInit;
    expect([name, init.method, f.mock.calls[0][0]]).toEqual([name, verb, `https://api.test${path}`]);
    if (body !== undefined) expect([name, JSON.parse(String(init.body))]).toEqual([name, body]);
  }
}

/** Every function on the service has a case in the table. */
export function expectEveryMethod(service: object, cases: CallCase[]): void {
  const have = new Set(cases.map(c => c[0]));
  const missing = Object.keys(service).filter(k => typeof (service as Record<string, unknown>)[k] === 'function' && !have.has(k));
  expect(missing).toEqual([]);
}
