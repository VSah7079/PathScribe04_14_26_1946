import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpServiceChargeService } from './httpServiceChargeService';

// Batch 616 (PS-498): every call of IServiceChargeService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpServiceChargeService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);

const CALLS: { name: string; verb: string; path: string; body?: unknown; args: unknown[] }[] = [
  { name: 'saveCharge', verb: 'POST', path: '/api/billing/service-charge/save-charge', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getChargesForCase', verb: 'GET', path: '/api/billing/service-charge/get-charges-for-case?caseId=caseId-1', args: ['caseId-1'] },
  { name: 'listRuleReferenceKeys', verb: 'GET', path: '/api/billing/service-charge/list-rule-reference-keys', args: [] },
  { name: 'findActiveChargeForSource', verb: 'GET', path: '/api/billing/service-charge/find-active-charge-for-source?caseId=caseId-1&specimenId=specimenId-1&blockId=blockId-1&billingCode=billingCode-1', args: ['caseId-1', 'specimenId-1', 'blockId-1', 'billingCode-1'] },
  { name: 'submitForApproval', verb: 'POST', path: '/api/billing/service-charge/submit-for-approval', body: {"chargeId":"chargeId-1","submittedBy":"submittedBy-1","actorRole":"actorRole-1"}, args: ['chargeId-1', 'submittedBy-1', 'actorRole-1'] },
  { name: 'approveCharge', verb: 'POST', path: '/api/billing/service-charge/approve-charge', body: {"chargeId":"chargeId-1","approvedBy":"approvedBy-1","bypassAuthorized":true,"actorRole":"actorRole-1"}, args: ['chargeId-1', 'approvedBy-1', true, 'actorRole-1'] },
  { name: 'rejectCharge', verb: 'POST', path: '/api/billing/service-charge/reject-charge', body: {"chargeId":"chargeId-1","reviewedBy":"reviewedBy-1","rejectionReason":"rejectionReason-1","actorRole":"actorRole-1"}, args: ['chargeId-1', 'reviewedBy-1', 'rejectionReason-1', 'actorRole-1'] },
  { name: 'holdCharge', verb: 'POST', path: '/api/billing/service-charge/hold-charge', body: {"chargeId":"chargeId-1","heldBy":"heldBy-1"}, args: ['chargeId-1', 'heldBy-1'] },
  { name: 'releaseHold', verb: 'POST', path: '/api/billing/service-charge/release-hold', body: {"chargeId":"chargeId-1","releasedBy":"releasedBy-1"}, args: ['chargeId-1', 'releasedBy-1'] },
  { name: 'listByApprovalStatus', verb: 'GET', path: '/api/billing/service-charge/list-by-approval-status?statuses=a1&statuses=b2', args: [['a1', 'b2']] },
];

describe('createHttpServiceChargeService', () => {
  it('has a call for every method of the interface', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(CALLS.map(c => c.name).sort());
  });
  it.each(CALLS)('$name sends $verb $path and returns the data', async (c) => {
    const f = vi.fn().mockResolvedValue(reply(200, { id: 'r1' }));
    const r = await call(f, c.name, c.args);
    expect(r).toMatchObject({ ok: true, data: { id: 'r1' } });
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe(`https://api.test${c.path}`);
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe(c.verb);
    if (c.body === undefined) expect(init.body === undefined || init.body === '{}').toBe(true);
    else expect(JSON.parse(init.body as string)).toEqual(c.body);
  });
  it.each(CALLS)('$name turns a 403 and a 404 into fixed codes', async (c) => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, { message: 'Smith, J. MRN 123' })).mockResolvedValueOnce(reply(404, {}));
    expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
