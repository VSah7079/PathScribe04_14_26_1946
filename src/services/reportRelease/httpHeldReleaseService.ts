// src/services/reportRelease/httpHeldReleaseService.ts
// Batch 672 (wiring step 3): the API server's version of IHeldReleaseService (shared HTTP kit,
// HTTP_SERVICES_PATTERN.md §7). The server releases held reports on its own schedule
// (RELEASE_SWEEP_SERVER_JOB.md); the browser only adds, lists and settles one.
// `settle` answers true only when this call moved it on; false when it was no longer held,
// when it is unknown, or when the call failed.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result, value } from '../apiServer/httpServiceKit';
import type { IHeldReleaseService } from './IHeldReleaseService';

type P<K extends keyof IHeldReleaseService> = Parameters<IHeldReleaseService[K]>;
const BASE = '/api/report-release/held-release';

export const createHttpHeldReleaseService = (client: ApiHttpClient): IHeldReleaseService =>
  buildHttpService<IHeldReleaseService>(client, {
    add: result('POST', () => `${BASE}/add`, { body: (held: P<'add'>[0]) => held }),
    getAll: result('GET', () => `${BASE}/get-all`),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    settle: value('POST', () => `${BASE}/settle`, {
      body: (id: P<'settle'>[0], status: P<'settle'>[1], at: P<'settle'>[2]) => ({ id, status, at }),
      pick: (d: { settled: boolean }) => d.settled === true, missing: false, fallback: false,
    }),
  });
