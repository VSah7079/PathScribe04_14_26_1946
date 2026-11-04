import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpHistoryExtractionService } from './httpHistoryExtractionService';
import { createHttpHistoryExtractionSettingsService } from './httpHistoryExtractionSettingsService';

// Batch 621: every call of both services against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const client = (f: ReturnType<typeof vi.fn>) => createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' });
type Call = (...a: unknown[]) => Promise<unknown>;
const extraction = { sourceCaseId: 'S26-1', status: 'extracted', fields: [] };
const flag = { sourceCaseId: 'S26-1', fieldId: null, templateId: null, sourceTextHash: 'h', flaggedBy: 'Dr A' };
const setting = { facilityId: null, enabled: true };

const CALLS: { make: (f: ReturnType<typeof vi.fn>) => unknown; name: string; verb: string; path: string; body?: unknown; args: unknown[] }[] = [
  { make: f => createHttpHistoryExtractionService(client(f)), name: 'getForCase', verb: 'GET', path: '/api/ai/history-extraction/get-for-case?sourceCaseId=S26-1', args: ['S26-1'] },
  { make: f => createHttpHistoryExtractionService(client(f)), name: 'save', verb: 'POST', path: '/api/ai/history-extraction/save', body: extraction, args: [extraction] },
  { make: f => createHttpHistoryExtractionService(client(f)), name: 'flagAsWrong', verb: 'POST', path: '/api/ai/history-extraction/flag-as-wrong', body: flag, args: [flag] },
  { make: f => createHttpHistoryExtractionService(client(f)), name: 'getFlags', verb: 'GET', path: '/api/ai/history-extraction/get-flags?sourceCaseId=S26-1', args: ['S26-1'] },
  { make: f => createHttpHistoryExtractionService(client(f)), name: 'getAccuracy', verb: 'GET', path: '/api/ai/history-extraction/get-accuracy', args: [] },
  { make: f => createHttpHistoryExtractionSettingsService(client(f)), name: 'getAll', verb: 'GET', path: '/api/ai/history-extraction-settings/get-all', args: [] },
  { make: f => createHttpHistoryExtractionSettingsService(client(f)), name: 'getForFacility', verb: 'GET', path: '/api/ai/history-extraction-settings/get-for-facility?facilityId=fac-a', args: ['fac-a'] },
  { make: f => createHttpHistoryExtractionSettingsService(client(f)), name: 'set', verb: 'POST', path: '/api/ai/history-extraction-settings/set', body: setting, args: [setting] },
  { make: f => createHttpHistoryExtractionSettingsService(client(f)), name: 'remove', verb: 'POST', path: '/api/ai/history-extraction-settings/remove', body: { facilityId: 'fac-a' }, args: ['fac-a'] },
];
const call = (c: (typeof CALLS)[number], f: ReturnType<typeof vi.fn>) => (c.make(f) as Record<string, Call>)[c.name](...c.args);

describe('the history extraction server versions', () => {
  it('have a call for every method of both interfaces', () => {
    expect(Object.keys(createHttpHistoryExtractionService(client(vi.fn()))).sort()).toEqual(['flagAsWrong', 'getAccuracy', 'getFlags', 'getForCase', 'save']);
    expect(Object.keys(createHttpHistoryExtractionSettingsService(client(vi.fn()))).sort()).toEqual(['getAll', 'getForFacility', 'remove', 'set']);
  });
  it.each(CALLS)('$name sends $verb $path and returns the data', async (c) => {
    const f = vi.fn().mockResolvedValue(reply(200, { id: 'd1' }));
    expect(await call(c, f)).toMatchObject({ ok: true, data: { id: 'd1' } });
    expect(f.mock.calls[0][0]).toBe(`https://api.test${c.path}`);
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe(c.verb);
    if (c.body === undefined) expect(init.body === undefined || init.body === '{}').toBe(true);
    else expect(JSON.parse(init.body as string)).toEqual(c.body);
  });
  it.each(CALLS)('$name turns a 403 and a 404 into the fixed answer', async (c) => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, { message: 'Smith, J. MRN 123' })).mockResolvedValueOnce(reply(404, {}));
    expect(await call(c, f)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await call(c, f)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
