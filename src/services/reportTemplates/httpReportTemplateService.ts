// src/services/reportTemplates/httpReportTemplateService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IReportTemplateService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/REPORT_TEMPLATES_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IReportTemplateService } from './IReportTemplateService';

type Args<K extends keyof IReportTemplateService> = Parameters<IReportTemplateService[K]>;
const BASE = '/api/report-templates/report-template';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpReportTemplateService = (client: ApiHttpClient): IReportTemplateService =>
  buildHttpService<IReportTemplateService>(client, {
    getAll: result('GET', () => route('getAll')),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    create: result('POST', () => route('create'), { body: (template: object) => template }),
    update: result('POST', () => route('update'), { body: (id: string, changes: object) => ({ id, changes }) }),
    save: result('POST', () => route('save'), { body: (template: { id: string }) => template }),
    publish: result('POST', () => route('publish'), { body: (id: Args<'publish'>[0]) => ({ id }) }),
    clone: result('POST', () => route('clone'), { body: (id: string, name: string) => ({ id, name }) }),
    remove: result('POST', () => route('remove'), { body: (id: Args<'remove'>[0]) => ({ id }) }),
    archive: result('POST', () => route('archive'), { body: (id: Args<'archive'>[0]) => ({ id }) }),
    getBySubspecialty: result('GET', (subspecialtyId: Args<'getBySubspecialty'>[0]) => `${route('getBySubspecialty')}${queryString({ subspecialtyId })}`),
  });
