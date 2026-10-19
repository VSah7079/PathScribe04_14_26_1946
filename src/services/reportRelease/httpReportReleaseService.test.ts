import { describe, expect, it } from 'vitest';
import { expectCalls, expectEveryMethod, fakeApi, type CallCase } from '../apiServer/httpTestHelpers';
import { createHttpReportReleaseService } from './httpReportReleaseService';

const by = { userId: 'u', userName: 'U' };
const cases: CallCase[] = [
  ['resolveBufferForCase', [{ order: { priority: 'STAT' }, originHospitalId: 'h1' }], 'POST', '/api/report-release/report-release/resolve-buffer-for-case', {"order": {"priority": "STAT"}, "originHospitalId": "h1"}],
  ['getOrgDefault', [], 'GET', '/api/report-release/report-release/get-org-default'],
  ['setOrgDefault', [{ enabled: true }], 'POST', '/api/report-release/report-release/set-org-default', {"enabled": true}],
  ['startBuffer', ['S26 1', { previousStatus: 'Signed Out', durationMinutes: 10 }, by], 'POST', '/api/report-release/report-release/start-buffer', { caseId: 'S26 1', previousStatus: 'Signed Out', durationMinutes: 10, performedBy: by }],
  ['recall', ['S26 1', by], 'POST', '/api/report-release/report-release/recall', { caseId: 'S26 1', performedBy: by }],
  ['checkAndReleaseIfExpired', ['S26 1'], 'POST', '/api/report-release/report-release/check-and-release-if-expired', {"caseId": "S26 1"}],
];
describe('createHttpReportReleaseService', () => {
  it('sends the contract calls', async () => {
    const { client, fetch } = fakeApi(200, {});
    const s = createHttpReportReleaseService(client);
    expectEveryMethod(s, cases); await expectCalls(s, fetch, cases);
  });
  it('starting the buffer gives { ok: true, releaseBufferExpiresAt }', async () => {
    const s = createHttpReportReleaseService(fakeApi(200, { releaseBufferExpiresAt: '2026-10-19T00:10:00Z' }).client);
    expect(await s.startBuffer('c', { previousStatus: 'Signed Out' as never, durationMinutes: 10 }, by)).toEqual({ ok: true, releaseBufferExpiresAt: '2026-10-19T00:10:00Z' });
  });
  it('a refused start or recall is { ok: false, reason: <code> }, not a thrown error', async () => {
    const s = createHttpReportReleaseService(fakeApi(403).client);
    expect(await s.startBuffer('c', { previousStatus: 'Signed Out' as never, durationMinutes: 10 }, by)).toEqual({ ok: false, reason: 'NOT_PERMITTED' });
    expect(await createHttpReportReleaseService(fakeApi(409).client).recall('c', by)).toEqual({ ok: false, reason: 'CONFLICT' });
  });
  it('recall works', async () => {
    expect(await createHttpReportReleaseService(fakeApi(200, {}).client).recall('c', by)).toEqual({ ok: true });
  });
  it('resolving the buffer throws a code when the server is unreachable (never a quiet "no delay")', async () => {
    await expect(createHttpReportReleaseService(fakeApi(503).client).resolveBufferForCase({ order: undefined, originHospitalId: 'h' } as never)).rejects.toMatchObject({ code: expect.any(String) });
  });
  it('a failed expiry check releases nothing', async () => {
    expect(await createHttpReportReleaseService(fakeApi(500).client).checkAndReleaseIfExpired('c')).toEqual({ released: false });
  });
});
