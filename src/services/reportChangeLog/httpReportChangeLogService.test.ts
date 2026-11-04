import { describe, expect, it } from 'vitest';
import { expectCalls, expectEveryMethod, fakeApi, type CallCase } from '../apiServer/httpTestHelpers';
import { createHttpReportChangeLogService } from './httpReportChangeLogService';

const entry = { caseId: 'S26 1', at: 't', userId: 'u', userName: 'U', stationId: null, changes: [] };
const cases: CallCase[] = [
  ['record', [entry], 'POST', '/api/report-change-log/report-change-log/record', entry],
  ['listForCase', ['S26 1'], 'GET', '/api/report-change-log/report-change-log/list-for-case?caseId=S26%201'],
];
describe('createHttpReportChangeLogService', () => {
  it('sends the contract calls', async () => {
    const { client, fetch } = fakeApi(200, {});
    const s = createHttpReportChangeLogService(client);
    expectEveryMethod(s, cases); await expectCalls(s, fetch, cases);
  });
  it('lists from { items } and passes a refusal on as a code', async () => {
    expect(await createHttpReportChangeLogService(fakeApi(200, { items: [{ id: 'e1' }] }).client).listForCase('c')).toEqual({ ok: true, data: [{ id: 'e1' }] });
    expect(await createHttpReportChangeLogService(fakeApi(403).client).listForCase('c')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });
});
