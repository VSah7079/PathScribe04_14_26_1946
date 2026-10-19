// src/services/cytology/httpCytologyScreeningHoursService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of ICytologyScreeningHoursService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ICytologyScreeningHoursService } from './ICytologyScreeningHoursService';

type P<K extends keyof ICytologyScreeningHoursService> = Parameters<ICytologyScreeningHoursService[K]>;
const BASE = '/api/cytology/cytology-screening-hours';

export const createHttpCytologyScreeningHoursService = (client: ApiHttpClient): ICytologyScreeningHoursService =>
  buildHttpService<ICytologyScreeningHoursService>(client, {
    forDay: result('POST', () => `${BASE}/for-day`, { body: (userId: P<'forDay'>[0], date: P<'forDay'>[1], timezone: P<'forDay'>[2]) => ({ userId, date, timezone }) }),
    currentDays: result('POST', () => `${BASE}/current-days`, { body: (userId: P<'currentDays'>[0], timezone: P<'currentDays'>[1]) => ({ userId, timezone }) }),
    signOff: result('POST', () => `${BASE}/sign-off`, { body: (user: P<'signOff'>[0], input: P<'signOff'>[1], timezone: P<'signOff'>[2]) => ({ user, input, timezone }) }),
    getAll: result('GET', () => `${BASE}/get-all`),
  });
