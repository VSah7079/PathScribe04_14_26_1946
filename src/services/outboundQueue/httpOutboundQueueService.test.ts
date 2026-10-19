import { describe, expect, it } from 'vitest';
import { createHttpOutboundQueueService } from './httpOutboundQueueService';
import { expectCalls, expectEveryMethod, fakeApi, type CallCase } from '../apiServer/httpTestHelpers';

const view = { items: [], counts: {}, deadlineCounts: { dueSoon: 0, overdue: 0 }, facilityIds: [] };

describe('http outbound queue service', () => {
  const { client, fetch } = fakeApi(200, view);
  const service = createHttpOutboundQueueService(client);
  const cases: CallCase[] = [
    ['list', [{ feeds: ['result'] }, { key: 'state', direction: 'asc' }], 'POST', '/api/delivery/outbound-queue/list', { filter: { feeds: ['result'] }, sort: { key: 'state', direction: 'asc' } }],
    ['hold', [['result:1'], 'dataCheck', 'n'], 'POST', '/api/delivery/outbound-queue/hold', { refs: ['result:1'], reason: 'dataCheck', note: 'n' }],
    ['release', [['result:1']], 'POST', '/api/delivery/outbound-queue/release', { refs: ['result:1'] }],
    ['retry', [['registry:1'], 'dataCorrected'], 'POST', '/api/delivery/outbound-queue/retry', { refs: ['registry:1'], reason: 'dataCorrected' }],
    ['retract', [['billing:1'], 'caseAmended'], 'POST', '/api/delivery/outbound-queue/retract', { refs: ['billing:1'], reason: 'caseAmended' }],
    ['overrideRelease', [['billing:1']], 'POST', '/api/delivery/outbound-queue/override-release', { refs: ['billing:1'] }],
    ['markNotReportable', [['registry:1'], 'duplicateSubmission'], 'POST', '/api/delivery/outbound-queue/mark-not-reportable', { refs: ['registry:1'], reason: 'duplicateSubmission' }],
  ];
  it('sends each method to its route', async () => { await expectCalls(service, fetch, cases); });
  it('has a route for every method', () => { expectEveryMethod(service, cases); });
  it('the results come back as the list of per-message results', async () => {
    const api = fakeApi(200, { results: [{ ref: 'result:1', ok: true }] });
    const r = await createHttpOutboundQueueService(api.client).hold(['result:1'], 'other');
    expect(r).toEqual({ ok: true, data: [{ ref: 'result:1', ok: true }] });
  });
  it('a refusal is the fixed code', async () => {
    const api = fakeApi(403, { error: 'NOT_PERMITTED' });
    const r = await createHttpOutboundQueueService(api.client).release(['a:1']);
    expect(r.ok).toBe(false);
  });
});
