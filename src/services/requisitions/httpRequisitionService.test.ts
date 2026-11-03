import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpRequisitionService } from './httpRequisitionService';

// Batch 762: every call of IRequisitionService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpRequisitionService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<unknown>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);

const CALLS: { name: string; kind: string; verb: string; path: string; body?: unknown; args: unknown[]; missing: unknown; fallback: unknown }[] = [
  { name: 'getSources', kind: 'result', verb: 'GET', path: '/api/requisitions/requisition/get-sources', args: [], missing: undefined, fallback: undefined },
  { name: 'saveSource', kind: 'result', verb: 'POST', path: '/api/requisitions/requisition/save-source', body: { sample: 1 }, args: [{ sample: 1 } as never], missing: undefined, fallback: undefined },
  { name: 'recordIngestion', kind: 'result', verb: 'POST', path: '/api/requisitions/requisition/record-ingestion', body: { sourceId: 's1', files: [] }, args: [{ sourceId: 's1', files: [] }], missing: undefined, fallback: undefined },
  { name: 'getInbox', kind: 'result', verb: 'GET', path: '/api/requisitions/requisition/get-inbox', args: [], missing: undefined, fallback: undefined },
  { name: 'linksForCase', kind: 'result', verb: 'POST', path: '/api/requisitions/requisition/links-for-case', body: { accession: 'S26-1' }, args: [{ accession: 'S26-1' }], missing: undefined, fallback: undefined },
  { name: 'findCasesToLink', kind: 'result', verb: 'GET', path: '/api/requisitions/requisition/find-cases-to-link?query=Smith', args: ['Smith'], missing: undefined, fallback: undefined },
  { name: 'reassociate', kind: 'result', verb: 'POST', path: '/api/requisitions/requisition/reassociate', body: { unmatchedId: 'u1', accession: 'S26-1', how: 'search' }, args: ['u1', 'S26-1', 'search'], missing: undefined, fallback: undefined },
  { name: 'discard', kind: 'result', verb: 'POST', path: '/api/requisitions/requisition/discard', body: { unmatchedId: 'u1', reason: 'other' }, args: ['u1', 'other'], missing: undefined, fallback: undefined },
  { name: 'getExpectations', kind: 'result', verb: 'GET', path: '/api/requisitions/requisition/get-expectations', args: [], missing: undefined, fallback: undefined },
  { name: 'saveExpectation', kind: 'result', verb: 'POST', path: '/api/requisitions/requisition/save-expectation', body: { sample: 1 }, args: [{ sample: 1 } as never], missing: undefined, fallback: undefined },
  { name: 'sweepMissing', kind: 'result', verb: 'POST', path: '/api/requisitions/requisition/sweep-missing', args: [], missing: undefined, fallback: undefined },
  { name: 'getMissing', kind: 'result', verb: 'GET', path: '/api/requisitions/requisition/get-missing', args: [], missing: undefined, fallback: undefined },
  { name: 'missingForCase', kind: 'result', verb: 'POST', path: '/api/requisitions/requisition/missing-for-case', body: { caseId: 'c1' }, args: [{ caseId: 'c1' }], missing: undefined, fallback: undefined },
  { name: 'waiveMissing', kind: 'result', verb: 'POST', path: '/api/requisitions/requisition/waive-missing', body: { caseId: 'c1', reason: 'other', note: 'n' }, args: ['c1', 'other', 'n'], missing: undefined, fallback: undefined },
  { name: 'openDocument', kind: 'result', verb: 'POST', path: '/api/requisitions/requisition/open-document', body: { linkId: 'l1' }, args: [{ linkId: 'l1' }], missing: undefined, fallback: undefined },
];

const answer = (c: { kind: string }) => (c.kind === 'list' ? { items: [{ id: 'r1' }] } : { id: 'r1' });
const expected = (c: { kind: string }) => (c.kind === 'list' ? [{ id: 'r1' }] : { id: 'r1' });

describe('createHttpRequisitionService', () => {
  it('has a call for every method of the interface', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(CALLS.map(c => c.name).sort());
  });
  it.each(CALLS)('$name sends $verb $path and returns the data', async (c) => {
    const f = vi.fn().mockResolvedValue(reply(200, answer(c)));
    const r = await call(f, c.name, c.args);
    if (c.kind === 'result') expect(r).toMatchObject({ ok: true, data: { id: 'r1' } });
    else if (c.kind === 'done') expect(r).toBeUndefined();
    else expect(r).toEqual(expected(c));
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe(`https://api.test${c.path}`);
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe(c.verb);
    if (c.body === undefined) expect(init.body === undefined || init.body === '{}').toBe(true);
    else expect(JSON.parse(init.body as string)).toEqual(c.body);
  });
  it.each(CALLS)('$name turns a 403 and a 404 into the fixed answer', async (c) => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, { message: 'Smith, J. MRN 123' })).mockResolvedValueOnce(reply(404, {}));
    if (c.kind === 'result') {
      expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
      expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_FOUND' });
    } else if (c.kind === 'done' || c.kind === 'required') {
      await expect(call(f, c.name, c.args)).rejects.toMatchObject({ code: 'NOT_PERMITTED' });
      await expect(call(f, c.name, c.args)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    } else {
      expect(await call(f, c.name, c.args)).toEqual(c.fallback);
      expect(await call(f, c.name, c.args)).toEqual(c.missing);
    }
  });
});
