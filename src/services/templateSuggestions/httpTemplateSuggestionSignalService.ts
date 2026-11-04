// src/services/templateSuggestions/httpTemplateSuggestionSignalService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of ITemplateSuggestionSignalService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/TEMPLATE_SIGNALS_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { ITemplateSuggestionSignalService } from './ITemplateSuggestionSignalService';

type Args<K extends keyof ITemplateSuggestionSignalService> = Parameters<ITemplateSuggestionSignalService[K]>;
const BASE = '/api/template-suggestions/template-suggestion-signal';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpTemplateSuggestionSignalService = (client: ApiHttpClient): ITemplateSuggestionSignalService =>
  buildHttpService<ITemplateSuggestionSignalService>(client, {
    recordSignal: result('POST', () => route('recordSignal'), { body: (signal: object) => signal }),
    getAll: result('GET', () => route('getAll')),
    getByTemplate: result('GET', (templateId: Args<'getByTemplate'>[0]) => `${route('getByTemplate')}${queryString({ templateId })}`),
    getStats: result('GET', (studyId: Args<'getStats'>[0]) => `${route('getStats')}${queryString({ studyId })}`),
  });
