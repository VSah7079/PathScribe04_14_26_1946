import { describe, expect, it } from 'vitest';
import { expectCalls, expectEveryMethod, fakeApi, type CallCase } from '../apiServer/httpTestHelpers';
import { createHttpPatientHistoryCacheService, createHttpPatientHistoryLisService } from './httpPatientHistoryServices';

const cache: CallCase[] = [
  ['getAll', [], 'GET', '/api/patient-history/patient-history-cache/get-all'],
  ['getByCaseId', ["S26 1"], 'GET', '/api/patient-history/patient-history-cache/get-by-case-id?caseId=S26%201'],
  ['ensurePending', ["c1","p1"], 'POST', '/api/patient-history/patient-history-cache/ensure-pending', {"caseId":"c1","patientId":"p1"}],
  ['markFetched', ["c1",[{"id":"r1"}]], 'POST', '/api/patient-history/patient-history-cache/mark-fetched', {"caseId":"c1","reports":[{"id":"r1"}]}],
  ['markFailed', ["c1","timeout"], 'POST', '/api/patient-history/patient-history-cache/mark-failed', {"caseId":"c1","errorMessage":"timeout"}],
  ['destroy', ["c1"], 'POST', '/api/patient-history/patient-history-cache/destroy', {"caseId":"c1"}],
];
const lis: CallCase[] = [
  ['fetchPatientHistory', ["MRN-SECRET"], 'POST', '/api/patient-history/patient-history-lis/fetch-patient-history', {"mrn":"MRN-SECRET"}],
];

describe('patient history (server versions)', () => {
  it('cache: sends the contract calls', async () => {
    const { client, fetch } = fakeApi(200, {});
    const s = createHttpPatientHistoryCacheService(client);
    expectEveryMethod(s, cache); await expectCalls(s, fetch, cache);
  });
  it('lookup: sends the contract call, with the MRN in the body only', async () => {
    const { client, fetch } = fakeApi(200, { items: [] });
    const s = createHttpPatientHistoryLisService(client);
    expectEveryMethod(s, lis); await expectCalls(s, fetch, lis);
    expect(String(fetch.mock.calls[0][0])).not.toContain('SECRET');
  });
  it('no history for a case is { ok: true, data: null }; the lookup returns the reports', async () => {
    expect(await createHttpPatientHistoryCacheService(fakeApi(404).client).getByCaseId('c')).toEqual({ ok: true, data: null });
    expect(await createHttpPatientHistoryLisService(fakeApi(200, { items: [{ id: 'r1' }] }).client).fetchPatientHistory('m')).toEqual({ ok: true, data: [{ id: 'r1' }] });
    expect(await createHttpPatientHistoryLisService(fakeApi(503).client).fetchPatientHistory('m')).toEqual({ ok: false, error: 'UNAVAILABLE' });
  });
});
