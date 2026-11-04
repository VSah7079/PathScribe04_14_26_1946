// src/services/printSettings/httpPrintSettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IPrintSettingsService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DELIVERY_PRINTING_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';

import type { IPrintSettingsService } from './IPrintSettingsService';

type P<K extends keyof IPrintSettingsService> = Parameters<IPrintSettingsService[K]>;
const BASE = '/api/print-settings/print-settings';

export const createHttpPrintSettingsService = (client: ApiHttpClient): IPrintSettingsService =>
  buildHttpService<IPrintSettingsService>(client, {
    get: result('GET', () => `${BASE}/get`),
    update: result('POST', () => `${BASE}/update`, { body: (patch: P<'update'>[0]) => (patch) }),
    reset: result('POST', () => `${BASE}/reset`),
  });
