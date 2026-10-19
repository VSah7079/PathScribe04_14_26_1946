// src/services/cytology/httpScreeningIntervalService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of IScreeningIntervalService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { IScreeningIntervalService } from './IScreeningIntervalService';

type P<K extends keyof IScreeningIntervalService> = Parameters<IScreeningIntervalService[K]>;
const BASE = '/api/cytology/screening-interval';

export const createHttpScreeningIntervalService = (client: ApiHttpClient): IScreeningIntervalService =>
  buildHttpService<IScreeningIntervalService>(client, {
    get: result('GET', () => `${BASE}/get`),
    save: result('POST', () => `${BASE}/save`, { body: (rules: P<'save'>[0]) => (rules) }),
  });
