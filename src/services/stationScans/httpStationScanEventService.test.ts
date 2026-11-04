import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpStationScanEventService } from './httpStationScanEventService';

// Batch 726: every call of IStationScanEventService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpStationScanEventService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<unknown>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);

const CALLS = [
  { name: 'recordMany', path: '/api/station-scans/station-scan-event/record-many', body: { events: [{ itemId: 'S26-1-A1' }] }, args: [[{ itemId: 'S26-1-A1' }]] },
  { name: 'query', path: '/api/station-scans/station-scan-event/query', body: { caseAccession: 'S26-1' }, args: [{ caseAccession: 'S26-1' }] },
  { name: 'activitySummary', path: '/api/station-scans/station-scan-event/activity-summary', body: { facilityId: 'f1', staleMinutes: 240 }, args: [{ facilityId: 'f1', staleMinutes: 240 }] },
];

describe('createHttpStationScanEventService', () => {
  it('has a call for every method of the interface', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(CALLS.map(c => c.name).sort());
  });
  it.each(CALLS)('$name sends POST $path with the body, never a case number in the URL', async (c) => {
    const f = vi.fn().mockResolvedValue(reply(200, [{ id: 'r1' }]));
    const r = await call(f, c.name, c.args);
    expect(f.mock.calls[0][0]).toBe(`https://api.test${c.path}`);
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(c.body);
    expect(r).toMatchObject({ ok: true });
  });
  it.each(CALLS)('$name turns a 403 and a 404 into fixed codes', async (c) => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, { message: 'Smith, J. MRN 123' })).mockResolvedValueOnce(reply(404, {}));
    expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
