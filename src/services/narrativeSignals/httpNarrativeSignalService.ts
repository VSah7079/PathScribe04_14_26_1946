// src/services/narrativeSignals/httpNarrativeSignalService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of INarrativeSignalService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/TEMPLATE_SIGNALS_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { INarrativeSignalService } from './INarrativeSignalService';

type Args<K extends keyof INarrativeSignalService> = Parameters<INarrativeSignalService[K]>;
const BASE = '/api/narrative-signals/narrative-signal';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpNarrativeSignalService = (client: ApiHttpClient): INarrativeSignalService =>
  buildHttpService<INarrativeSignalService>(client, {
    recordSignals: result('POST', () => route('recordSignals'), { body: (signals: object[]) => ({ signals }) }),
    getAll: result('GET', () => route('getAll')),
    getByTemplate: result('GET', (reportTemplateId: Args<'getByTemplate'>[0]) => `${route('getByTemplate')}${queryString({ reportTemplateId })}`),
    getByStudy: result('GET', (studyId: Args<'getByStudy'>[0]) => `${route('getByStudy')}${queryString({ studyId })}`),
    getAccepted: result('GET', (reportTemplateId: Args<'getAccepted'>[0]) => `${route('getAccepted')}${queryString({ reportTemplateId })}`),
    getStats: result('GET', (studyId: Args<'getStats'>[0]) => `${route('getStats')}${queryString({ studyId })}`),
  });
