// src/services/cytology/httpCytologyProficiencyTestResultService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of ICytologyProficiencyTestResultService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ICytologyProficiencyTestResultService } from './ICytologyProficiencyTestResultService';

type P<K extends keyof ICytologyProficiencyTestResultService> = Parameters<ICytologyProficiencyTestResultService[K]>;
const BASE = '/api/cytology/cytology-proficiency-test-result';

export const createHttpCytologyProficiencyTestResultService = (client: ApiHttpClient): ICytologyProficiencyTestResultService =>
  buildHttpService<ICytologyProficiencyTestResultService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    add: result('POST', () => `${BASE}/add`, { body: (result: P<'add'>[0]) => (result) }),
  });
