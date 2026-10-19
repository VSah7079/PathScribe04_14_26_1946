import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpCytologyQaReportService } from './httpCytologyQaReportService';

// Batch 616 (PS-499): every call of ICytologyQaReportService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpCytologyQaReportService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]) => (svc(f) as unknown as Record<string, Call>)[name](...args);

const CALLS: { name: string; verb: string; path: string; body?: unknown; args: unknown[] }[] = [
  { name: 'get10PercentRandomRescreeningReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get10-percent-random-rescreening-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getDirectedHighRiskRescreeningReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-directed-high-risk-rescreening-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getCtVsPathologistCorrelationReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-ct-vs-pathologist-correlation-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getPostSignOutPeerReviewCorrelationReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-post-sign-out-peer-review-correlation-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getPrimaryVsFinalDiagnosisReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-primary-vs-final-diagnosis-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getCtStatisticalComparisonReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-ct-statistical-comparison-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getAscusHpvReflexReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-ascus-hpv-reflex-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getWorkloadTrackingReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-workload-tracking-report', body: {"scope":{"sample":1},"timezone":"timezone-1"}, args: [{ sample: 1 } as never, 'timezone-1'] },
  { name: 'getRegistryTransmissionAuditReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-registry-transmission-audit-report', body: {"scope":{"sample":1},"registryId":"registryId-1"}, args: [{ sample: 1 } as never, 'registryId-1'] },
  { name: 'getGynCytologySecondaryScreeningAuditReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-gyn-cytology-secondary-screening-audit-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getHistologyCorrelationReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-histology-correlation-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getUnscreenedBacklogReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-unscreened-backlog-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getPrimaryHpvFailsafeAuditReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-primary-hpv-failsafe-audit-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getEuComplianceMatrixReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-eu-compliance-matrix-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getHpvPositivityMonitorReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-hpv-positivity-monitor-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getMolecularQcFailureRateReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-molecular-qc-failure-rate-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getMolecularLotToLotTrendReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-molecular-lot-to-lot-trend-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getApacProficiencyTestReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-apac-proficiency-test-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
  { name: 'getFiveYearRetrospectiveLookbackReport', verb: 'POST', path: '/api/cytology/cytology-qa-report/get-five-year-retrospective-lookback-report', body: {"sample":1}, args: [{ sample: 1 } as never] },
];

describe('createHttpCytologyQaReportService', () => {
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
