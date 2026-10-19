import { describe, expect, it } from 'vitest';
import { expectCalls, expectEveryMethod, fakeApi, type CallCase } from '../apiServer/httpTestHelpers';
import { createHttpOutboundPatientAdtQueueService } from './httpOutboundPatientAdtQueueService';

const failure = { errorCode: 'E', errorMessage: 'm', maxRetriesExceeded: true };
const cases: CallCase[] = [
  ['getAll', [], 'GET', '/api/patients/outbound-patient-adt-queue/get-all'], ['getFailed', [], 'GET', '/api/patients/outbound-patient-adt-queue/get-failed'],
  ['getByPatientId', ['p 1'], 'GET', '/api/patients/outbound-patient-adt-queue/get-by-patient-id?patientId=p%201'],
  ['enqueue', [{ patientId: 'p1' }], 'POST', '/api/patients/outbound-patient-adt-queue/enqueue', {"patientId": "p1"}],
  ['markFailed', ['q1', failure], 'POST', '/api/patients/outbound-patient-adt-queue/mark-failed', { id: 'q1', ...failure }],
  ['retryDispatch', ['q1'], 'POST', '/api/patients/outbound-patient-adt-queue/retry-dispatch', {"id": "q1"}], ['markSent', ['q1'], 'POST', '/api/patients/outbound-patient-adt-queue/mark-sent', {"id": "q1"}],
];
describe('createHttpOutboundPatientAdtQueueService', () => {
  it('sends the contract calls', async () => {
    const { client, fetch } = fakeApi(200, {});
    const s = createHttpOutboundPatientAdtQueueService(client);
    expectEveryMethod(s, cases); await expectCalls(s, fetch, cases);
  });
  it('lists from { items }', async () => {
    expect(await createHttpOutboundPatientAdtQueueService(fakeApi(200, { items: [{ id: 'q1' }] }).client).getAll()).toEqual({ ok: true, data: [{ id: 'q1' }] });
  });
});
