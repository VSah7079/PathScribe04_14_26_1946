import { describe, expect, it, vi } from 'vitest';
import { ApiCallError } from '../apiServer/httpServiceKit';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpReportReleasedEventLogService } from './httpReportReleasedEventLogService';

// Batch 672: the event-log calls against a fake fetch.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpReportReleasedEventLogService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));

describe('createHttpReportReleasedEventLogService', () => {
  it('has a call for every method of the interface (and none that changes or deletes)', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(['getByCaseId', 'record']);
  });
  it('record posts the event and returns the stamped entry', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, { id: 'rre-1', recordedAt: 't', caseId: 'c1' }));
    const r = await svc(f).record({ caseId: 'c1' } as never);
    expect(r).toMatchObject({ id: 'rre-1' });
    expect(f.mock.calls[0][0]).toBe('https://api.test/api/reports/report-released-event-log/record');
    expect(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string)).toEqual({ caseId: 'c1' });
  });
  it('record throws a fixed-code error when the server refuses', async () => {
    const f = vi.fn().mockResolvedValue(reply(403, { message: 'Smith, J.' }));
    await expect(svc(f).record({ caseId: 'c1' } as never)).rejects.toBeInstanceOf(ApiCallError);
  });
  it('getByCaseId asks by case and returns the list (empty on a failure)', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(200, { items: [{ id: 'a' }] })).mockResolvedValueOnce(reply(500, {}));
    const s = svc(f);
    expect(await s.getByCaseId('c 1')).toEqual([{ id: 'a' }]);
    expect(f.mock.calls[0][0]).toBe('https://api.test/api/reports/report-released-event-log/get-by-case-id?caseId=c%201');
    expect(await s.getByCaseId('c1')).toEqual([]);
  });
});
