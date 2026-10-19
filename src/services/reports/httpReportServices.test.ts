import { describe, expect, it } from 'vitest';
import { expectCalls, expectEveryMethod, fakeApi, type CallCase } from '../apiServer/httpTestHelpers';
import { createHttpAmendmentService, createHttpInformalReviewService, createHttpLisAmendmentNoticeService } from './httpReportServices';
import { createHttpOutboundLisSyncQueueService, createHttpOutboundResultQueueService } from './httpOutboundQueueServices';

const amend: CallCase[] = [
  ['getByCaseId', ["S26 1"], 'GET', '/api/reports/amendment/get-by-case-id?caseId=S26%201'],
  ['getAll', [], 'GET', '/api/reports/amendment/get-all'],
  ['getOpenDraftsForPathologist', ["u1"], 'GET', '/api/reports/amendment/get-open-drafts-for-pathologist?pathologistId=u1'],
  ['startDraft', [{"caseId":"c1","type":"Addendum"}], 'POST', '/api/reports/amendment/start-draft', {"caseId":"c1","type":"Addendum"}],
  ['changeDraftType', ["a1","Correction"], 'POST', '/api/reports/amendment/change-draft-type', {"id":"a1","type":"Correction"}],
  ['captureFields', ["a1",{"explanationOfChange":"x"}], 'POST', '/api/reports/amendment/capture-fields', {"id":"a1","fields":{"explanationOfChange":"x"}}],
  ['release', ["a1",{"body":"b"}], 'POST', '/api/reports/amendment/release', {"id":"a1","fields":{"body":"b"}}],
  ['reopen', ["a1",{"userId":"u","userName":"U"}], 'POST', '/api/reports/amendment/reopen', {"id":"a1","by":{"userId":"u","userName":"U"}}],
];
const review: CallCase[] = [
  ['getPendingForReviewer', ["u1"], 'GET', '/api/reports/informal-review/get-pending-for-reviewer?userId=u1'],
  ['getSentByRequester', ["u1"], 'GET', '/api/reports/informal-review/get-sent-by-requester?userId=u1'],
  ['getForCase', ["c1"], 'GET', '/api/reports/informal-review/get-for-case?caseId=c1'],
  ['getAllForUser', ["u1"], 'GET', '/api/reports/informal-review/get-all-for-user?userId=u1'],
  ['create', [{"caseId":"c1"}], 'POST', '/api/reports/informal-review/create', {"caseId":"c1"}],
  ['publish', ["r1","n1"], 'POST', '/api/reports/informal-review/publish', {"id":"r1","noteId":"n1"}],
  ['markSeenByRequester', ["r1"], 'POST', '/api/reports/informal-review/mark-seen-by-requester', {"id":"r1"}],
];
const notice: CallCase[] = [
  ['getByCaseId', ["c1"], 'GET', '/api/reports/lis-amendment-notice/get-by-case-id?caseId=c1'],
  ['getPendingForPathologist', ["u1"], 'GET', '/api/reports/lis-amendment-notice/get-pending-for-pathologist?pathologistId=u1'],
  ['create', [{"caseId":"c1"}], 'POST', '/api/reports/lis-amendment-notice/create', {"caseId":"c1"}],
  ['updateStatus', ["n1","acknowledged"], 'POST', '/api/reports/lis-amendment-notice/update-status', {"id":"n1","status":"acknowledged"}],
];
const sync: CallCase[] = [
  ['getAll', [], 'GET', '/api/reports/outbound-lis-sync-queue/get-all'],
  ['getFailed', [], 'GET', '/api/reports/outbound-lis-sync-queue/get-failed'],
  ['getByCaseId', ["c1"], 'GET', '/api/reports/outbound-lis-sync-queue/get-by-case-id?caseId=c1'],
  ['enqueue', [{"caseId":"c1"}], 'POST', '/api/reports/outbound-lis-sync-queue/enqueue', {"caseId":"c1"}],
  ['markFailed', ["q1",{"errorCode":"E","errorMessage":"m","maxRetriesExceeded":false}], 'POST', '/api/reports/outbound-lis-sync-queue/mark-failed', {"id":"q1","errorCode":"E","errorMessage":"m","maxRetriesExceeded":false}],
  ['retryDispatch', ["q1"], 'POST', '/api/reports/outbound-lis-sync-queue/retry-dispatch', {"id":"q1"}],
  ['markSent', ["q1"], 'POST', '/api/reports/outbound-lis-sync-queue/mark-sent', {"id":"q1"}],
];
const results: CallCase[] = [
  ['getAll', [], 'GET', '/api/reports/outbound-result-queue/get-all'],
  ['getFailed', [], 'GET', '/api/reports/outbound-result-queue/get-failed'],
  ['getByCaseId', ["c1"], 'GET', '/api/reports/outbound-result-queue/get-by-case-id?caseId=c1'],
  ['getByInstanceAndState', ["i 1","final"], 'GET', '/api/reports/outbound-result-queue/get-by-instance-and-state?instanceId=i%201&resultState=final'],
  ['enqueue', [{"caseId":"c1"}], 'POST', '/api/reports/outbound-result-queue/enqueue', {"caseId":"c1"}],
  ['markFailed', ["q1",{"errorCode":"E","errorMessage":"m","maxRetriesExceeded":true}], 'POST', '/api/reports/outbound-result-queue/mark-failed', {"id":"q1","errorCode":"E","errorMessage":"m","maxRetriesExceeded":true}],
  ['retryDispatch', ["q1"], 'POST', '/api/reports/outbound-result-queue/retry-dispatch', {"id":"q1"}],
  ['markSent', ["q1"], 'POST', '/api/reports/outbound-result-queue/mark-sent', {"id":"q1"}],
  ['recordPdfSha256', ["q1","abc"], 'POST', '/api/reports/outbound-result-queue/record-pdf-sha256', {"id":"q1","sha256":"abc"}],
];

describe('report services (server versions)', () => {
  it.each([
    ['amendments', createHttpAmendmentService, amend],
    ['informal reviews', createHttpInformalReviewService, review],
    ['LIS amendment notices', createHttpLisAmendmentNoticeService, notice],
    ['LIS sync queue', createHttpOutboundLisSyncQueueService, sync],
    ['result queue', createHttpOutboundResultQueueService, results],
  ] as const)('%s: every method sends the verb, path and body in the contract', async (_n, make, cases) => {
    const { client, fetch } = fakeApi(200, {});
    const service = (make as (c: typeof client) => object)(client);
    expectEveryMethod(service, cases as CallCase[]);
    await expectCalls(service, fetch, cases as CallCase[]);
  });

  it('lists come out of { items }, and a refusal is a fixed code with no server text', async () => {
    const ok = fakeApi(200, { items: [{ id: 'a1' }] });
    expect(await createHttpAmendmentService(ok.client).getAll()).toEqual({ ok: true, data: [{ id: 'a1' }] });
    const no = fakeApi(403, { message: 'Smith, John may not' });
    const r = await createHttpAmendmentService(no.client).getAll();
    expect(r).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(JSON.stringify(r)).not.toContain('Smith');
  });

  it('a missing amendment is NOT_FOUND', async () => {
    expect(await createHttpAmendmentService(fakeApi(404).client).reopen('x', { userId: 'u', userName: 'U' })).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
