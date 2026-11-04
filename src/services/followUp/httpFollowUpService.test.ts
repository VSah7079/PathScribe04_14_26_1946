import { describe, expect, it } from 'vitest';
import { fakeApi, reply } from '../apiServer/httpTestHelpers';
import { vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpFollowUpService } from './httpFollowUpService';

const actor = { id: 'u-1', name: 'Dr Path' };
const ref = { key: 'surgical:c 1:s1', caseId: 'c 1', accession: 'S26-1', facilityId: 'f1' };

/** A fake server that records every call (verb, path, body). */
function server(status: number, body: unknown) {
  const f = vi.fn().mockImplementation(async () => reply(status, body));
  const client = createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' });
  const last = () => {
    const [url, init] = f.mock.calls[f.mock.calls.length - 1] as [string, RequestInit];
    return { url: url.replace('https://api.test', ''), method: init.method, body: init.body ? JSON.parse(String(init.body)) : undefined };
  };
  return { svc: createHttpFollowUpService(client), last, f };
}

describe('createHttpFollowUpService (command-based)', () => {
  it('lists with the server-computed status and settings', async () => {
    const { svc, last } = server(200, { items: [{ key: 'k', status: 'overdue', facilityId: 'f1' }], settings: { enterprise: { warningDays: 30, clinicianEmailEnabled: false, emailSubject: '', emailBody: '', source: 'enterprise' }, facilities: { f1: { warningDays: 10, clinicianEmailEnabled: true, emailSubject: '', emailBody: '', source: 'facility' } } } });
    const loaded = await svc.loadItems({ allCases: true });
    expect(last()).toMatchObject({ url: '/api/follow-up/follow-up/load-items', method: 'GET' });
    expect(loaded.items[0]).toMatchObject({ key: 'k', status: 'overdue' });
    expect(loaded.settingsFor('f1').warningDays).toBe(10);
    expect(loaded.settingsFor('other').warningDays).toBe(30);
  });

  it('an unavailable server lists nothing', async () => {
    const { svc } = server(503, {});
    expect((await svc.loadItems()).items).toEqual([]);
  });

  it('reads the mark on a case, null when there is none', async () => {
    const found = server(200, { id: 'fue-c1', caseId: 'c1' });
    expect(await found.svc.getExpectation('c1')).toMatchObject({ caseId: 'c1' });
    expect(found.last()).toMatchObject({ url: '/api/follow-up/follow-up/get-expectation?caseId=c1', method: 'GET' });
    expect(await server(404, {}).svc.getExpectation('c1')).toBeNull();
  });

  it('marking sends only the choice: no window, no actor, no time', async () => {
    const { svc, last } = server(200, { id: 'fue-c1', caseId: 'c1' });
    expect(await svc.markExpected('c 1', {}, actor)).toEqual({ ok: true, data: { id: 'fue-c1', caseId: 'c1' } });
    expect(last()).toEqual({ url: '/api/follow-up/follow-up/mark-expected', method: 'POST', body: { caseId: 'c 1', afterSignOut: false } });
    await svc.markExpected('c1', { afterSignOut: true }, actor);
    expect(last().body).toEqual({ caseId: 'c1', afterSignOut: true });
  });

  it('recording an outcome sends the value and note only', async () => {
    const { svc, last } = server(200, { key: ref.key, clinicianContacts: [], alertsSent: {} });
    expect((await svc.recordDisposition(ref, 'other', '  declined by letter ', actor)).ok).toBe(true);
    expect(last()).toEqual({ url: '/api/follow-up/follow-up/record-disposition', method: 'POST', body: { key: ref.key, value: 'other', note: 'declined by letter' } });
    await svc.recordDisposition(ref, 'patientDeclined', undefined, actor);
    expect(last().body).toEqual({ key: ref.key, value: 'patientDeclined' });
  });

  it('reopening sends the key only', async () => {
    const { svc, last } = server(200, { key: ref.key, clinicianContacts: [], alertsSent: {} });
    expect((await svc.reopen(ref, actor)).ok).toBe(true);
    expect(last()).toEqual({ url: '/api/follow-up/follow-up/reopen', method: 'POST', body: { key: ref.key } });
  });

  it('the clinician email sends the reviewed text only', async () => {
    const { svc, last } = server(200, { key: ref.key, clinicianContacts: [{ to: 'a@b.org' }], alertsSent: {} });
    const draft = { to: 'a@b.org', subject: 'S', body: 'B' };
    expect((await svc.emailClinician(ref, draft, actor)).ok).toBe(true);
    expect(last()).toEqual({ url: '/api/follow-up/follow-up/email-clinician', method: 'POST', body: { key: ref.key, ...draft } });
  });

  it('never sends a user id, a name, a status or a whole record', async () => {
    const { svc, f } = server(200, {});
    await svc.markExpected('c1', { afterSignOut: true }, actor);
    await svc.recordDisposition(ref, 'lostToFollowUp', undefined, actor);
    await svc.reopen(ref, actor);
    await svc.emailClinician(ref, { to: 'a@b.org', subject: 'S', body: 'B' }, actor);
    for (const [, init] of f.mock.calls as [string, RequestInit][]) {
      const text = String(init.body ?? '');
      expect(text).not.toMatch(/u-1|Dr Path|status|recordedBy|markedBy|window|clinicianContacts|alertsSent/);
    }
  });

  it('a refusal becomes the interface refusal with the server code in camel case', async () => {
    expect(await server(403, { error: 'NOT_PERMITTED' }).svc.recordDisposition(ref, 'other', 'x', actor)).toEqual({ ok: false, reason: 'notPermitted' });
    expect(await server(422, { error: 'NO_SURGICAL_SPECIMEN' }).svc.markExpected('c1', {}, actor)).toMatchObject({ ok: false });
    expect(await server(409, { error: 'NOT_OPEN' }).svc.emailClinician(ref, { to: 'a@b.org', subject: 'S', body: 'B' }, actor)).toMatchObject({ ok: false });
  });

  it('has a route for every method of the interface', () => {
    const { client } = fakeApi();
    expect(Object.keys(createHttpFollowUpService(client)).sort()).toEqual(['emailClinician', 'getExpectation', 'loadItems', 'markExpected', 'recordDisposition', 'reopen']);
  });
});
