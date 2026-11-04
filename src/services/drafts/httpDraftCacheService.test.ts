import { describe, expect, it } from 'vitest';
import { expectCalls, expectEveryMethod, fakeApi, type CallCase } from '../apiServer/httpTestHelpers';
import { createHttpDraftCacheService } from './httpDraftCacheService';

const cases: CallCase[] = [
  ['saveDraft', ['u 1', 'e/1', { a: 1 }], 'POST', '/api/drafts/draft-cache/save-draft', {"userId": "u 1", "entityId": "e/1", "payload": {"a": 1}}],
  ['getDraft', ['u1', 'e1'], 'GET', '/api/drafts/draft-cache/get-draft?userId=u1&entityId=e1'],
  ['clearDraft', ['u1', 'e1'], 'POST', '/api/drafts/draft-cache/clear-draft', {"userId": "u1", "entityId": "e1"}],
  ['clearAllDraftsForUser', ['u1'], 'POST', '/api/drafts/draft-cache/clear-all-drafts-for-user', {"userId": "u1"}],
];
describe('createHttpDraftCacheService', () => {
  it('sends the contract calls', async () => {
    const { client, fetch } = fakeApi(200, {});
    const s = createHttpDraftCacheService(client);
    expectEveryMethod(s, cases); await expectCalls(s, fetch, cases);
  });
  it('no draft is { ok: true, data: null }; a refusal stays a refusal', async () => {
    expect(await createHttpDraftCacheService(fakeApi(404).client).getDraft('u', 'e')).toEqual({ ok: true, data: null });
    expect(await createHttpDraftCacheService(fakeApi(403).client).getDraft('u', 'e')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await createHttpDraftCacheService(fakeApi(200, { entityId: 'e', payload: 1, savedAt: 't', userId: 'u' }).client).getDraft('u', 'e')).toMatchObject({ ok: true, data: { entityId: 'e' } });
  });
});
