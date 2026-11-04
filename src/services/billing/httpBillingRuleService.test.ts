import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpBillingRuleService } from './httpBillingRuleService';

// Batch 616 (PS-498): every call of IBillingRuleService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpBillingRuleService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);

const CALLS: { name: string; verb: string; path: string; body?: unknown; args: unknown[] }[] = [
  { name: 'getAll', verb: 'GET', path: '/api/billing/billing-rule/get-all', args: [] },
  { name: 'getVersionsForBillingCode', verb: 'GET', path: '/api/billing/billing-rule/get-versions-for-billing-code?billingCode=billingCode-1&siteId=siteId-1', args: ['billingCode-1', 'siteId-1'] },
  { name: 'getActiveRuleAt', verb: 'POST', path: '/api/billing/billing-rule/get-active-rule-at', body: {"billingCode":"billingCode-1","dateOfService":"dateOfService-1","siteId":"siteId-1","options":{"sample":1}}, args: ['billingCode-1', 'dateOfService-1', 'siteId-1', { sample: 1 } as never] },
  { name: 'createVersion', verb: 'POST', path: '/api/billing/billing-rule/create-version', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'submitForApproval', verb: 'POST', path: '/api/billing/billing-rule/submit-for-approval', body: {"billingCode":"billingCode-1","version":3,"siteId":"siteId-1","submittedBy":"submittedBy-1"}, args: ['billingCode-1', 3, 'siteId-1', 'submittedBy-1'] },
  { name: 'approveVersion', verb: 'POST', path: '/api/billing/billing-rule/approve-version', body: {"billingCode":"billingCode-1","version":3,"siteId":"siteId-1","reviewedBy":"reviewedBy-1"}, args: ['billingCode-1', 3, 'siteId-1', 'reviewedBy-1'] },
  { name: 'rejectVersion', verb: 'POST', path: '/api/billing/billing-rule/reject-version', body: {"billingCode":"billingCode-1","version":3,"siteId":"siteId-1","reviewedBy":"reviewedBy-1","rejectionReason":"rejectionReason-1"}, args: ['billingCode-1', 3, 'siteId-1', 'reviewedBy-1', 'rejectionReason-1'] },
  { name: 'retireVersion', verb: 'POST', path: '/api/billing/billing-rule/retire-version', body: {"billingCode":"billingCode-1","version":3,"effectiveTo":"effectiveTo-1","siteId":"siteId-1"}, args: ['billingCode-1', 3, 'effectiveTo-1', 'siteId-1'] },
];

describe('createHttpBillingRuleService', () => {
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
