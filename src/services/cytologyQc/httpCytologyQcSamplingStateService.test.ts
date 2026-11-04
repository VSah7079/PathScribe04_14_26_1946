import { describe, expect, it, vi } from 'vitest';
import { ApiCallError } from '../apiServer/httpServiceKit';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpCytologyQcSamplingStateService } from './httpCytologyQcSamplingStateService';

// Batch 672: the sampling-state calls against a fake fetch.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpCytologyQcSamplingStateService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
const state = { seen: 3 } as never;

describe('createHttpCytologyQcSamplingStateService', () => {
  it('has a call for every method of the interface', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(['getAll', 'saveAll']);
  });
  it('getAll turns the server\'s object into a Map, and is empty on a failure', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(200, { states: { 'rule-1': state } })).mockResolvedValueOnce(reply(500, {}));
    const s = svc(f);
    const m = await s.getAll();
    expect(m.get('rule-1')).toEqual(state);
    expect(f.mock.calls[0][0]).toBe('https://api.test/api/cytology-qc/cytology-qc-sampling-state/get-all');
    expect((await s.getAll()).size).toBe(0);
  });
  it('saveAll posts the counters as an object and throws a fixed-code error on a refusal', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(204)).mockResolvedValueOnce(reply(403, { message: 'x' }));
    const s = svc(f);
    await s.saveAll(new Map([['rule-1', state]]));
    expect(f.mock.calls[0][0]).toBe('https://api.test/api/cytology-qc/cytology-qc-sampling-state/save-all');
    expect(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string)).toEqual({ states: { 'rule-1': state } });
    await expect(s.saveAll(new Map())).rejects.toBeInstanceOf(ApiCallError);
  });
});
