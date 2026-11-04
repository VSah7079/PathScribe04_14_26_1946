import { describe, expect, it } from 'vitest';
import { expectCalls, expectEveryMethod, fakeApi, type CallCase } from '../apiServer/httpTestHelpers';
import { createHttpAccessionOutboundQueueService } from './httpAccessionOutboundQueueService';

const failure = { errorCode: 'E', errorMessage: 'm', maxRetriesExceeded: false };
const cases: CallCase[] = [
  ['getAll', [], 'GET', '/api/accessioning/accession-outbound-queue/get-all'], ['getFailed', [], 'GET', '/api/accessioning/accession-outbound-queue/get-failed'],
  ['getByCaseId', ['c 1'], 'GET', '/api/accessioning/accession-outbound-queue/get-by-case-id?caseId=c%201'],
  ['enqueue', [{ caseId: 'c1' }], 'POST', '/api/accessioning/accession-outbound-queue/enqueue', {"caseId": "c1"}],
  ['markFailed', ['q1', failure], 'POST', '/api/accessioning/accession-outbound-queue/mark-failed', { id: 'q1', ...failure }],
  ['retryDispatch', ['q1'], 'POST', '/api/accessioning/accession-outbound-queue/retry-dispatch', {"id": "q1"}], ['markSent', ['q1'], 'POST', '/api/accessioning/accession-outbound-queue/mark-sent', {"id": "q1"}],
];
describe('createHttpAccessionOutboundQueueService', () => {
  it('sends the contract calls', async () => {
    const { client, fetch } = fakeApi(200, {});
    const s = createHttpAccessionOutboundQueueService(client);
    expectEveryMethod(s, cases); await expectCalls(s, fetch, cases);
  });
  it('lists from { items }', async () => {
    expect(await createHttpAccessionOutboundQueueService(fakeApi(200, { items: [{ id: 'q1' }] }).client).getFailed()).toEqual({ ok: true, data: [{ id: 'q1' }] });
  });
});
