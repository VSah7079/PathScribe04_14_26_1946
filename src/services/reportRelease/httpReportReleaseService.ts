// src/services/reportRelease/httpReportReleaseService.ts
// Batch 616 (PS-483): the API server's report release buffer (the delay between sign-out and release,
// and the recall inside it). Contract: REPORTS_API.md section 3. The SERVER owns the clock: the browser
// asks, the server answers with the expiry, and the server releases at expiry whether or not a browser is open.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, required, result, value } from '../apiServer/httpServiceKit';
import type { IReportReleaseService, ReleaseBufferResolution } from './IReportReleaseService';

type Performer = { userId: string; userName: string };

type Args<K extends keyof IReportReleaseService> = Parameters<IReportReleaseService[K]>;
const BASE = '/api/report-release/report-release';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpReportReleaseService(client: ApiHttpClient): IReportReleaseService {
  const routes = buildHttpService<IReportReleaseService>(client, {
    resolveBufferForCase: required('POST', () => route('resolveBufferForCase'), { body: (c: { order?: unknown; originHospitalId?: string }) => ({ order: c.order, originHospitalId: c.originHospitalId }) }),
    getOrgDefault: result('GET', () => route('getOrgDefault')),
    setOrgDefault: result('POST', () => route('setOrgDefault'), { body: (config: unknown) => config }),
    startBuffer: required('POST', () => route('startBuffer'), { body: (caseId: string, input: unknown, by: Performer) => ({ caseId, ...(input as object), performedBy: by }), pick: (d: { releaseBufferExpiresAt: string }) => ({ ok: true as const, releaseBufferExpiresAt: d.releaseBufferExpiresAt }) }),
    recall: required('POST', () => route('recall'), { body: (caseId: string, by: Performer) => ({ caseId, performedBy: by }), pick: () => ({ ok: true as const }) }),
    checkAndReleaseIfExpired: value('POST', () => route('checkAndReleaseIfExpired'), { body: (caseId: Args<'checkAndReleaseIfExpired'>[0]) => ({ caseId }), missing: { released: false }, fallback: { released: false } }),
  });
  // A refusal is the interface's own { ok: false, reason } (the reason is the server's fixed code), not a thrown error.
  const refusal = (e: unknown): { ok: false; reason: string } => ({ ok: false, reason: (e as { code?: string })?.code ?? 'UNAVAILABLE' });
  return {
    ...routes,
    async resolveBufferForCase(c): Promise<ReleaseBufferResolution> { return routes.resolveBufferForCase(c); },
    async startBuffer(...a) { try { return await routes.startBuffer(...a); } catch (e) { return refusal(e); } },
    async recall(...a) { try { return await routes.recall(...a); } catch (e) { return refusal(e); } },
  };
}
