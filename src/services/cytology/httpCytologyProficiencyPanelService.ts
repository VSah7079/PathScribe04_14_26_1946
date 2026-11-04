// src/services/cytology/httpCytologyProficiencyPanelService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ICytologyProficiencyPanelService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ICytologyProficiencyPanelService } from './mockCytologyProficiencyPanelService';

type P<K extends keyof ICytologyProficiencyPanelService> = Parameters<ICytologyProficiencyPanelService[K]>;
const BASE = '/api/cytology/cytology-proficiency-panel';

export const createHttpCytologyProficiencyPanelService = (client: ApiHttpClient): ICytologyProficiencyPanelService =>
  buildHttpService<ICytologyProficiencyPanelService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    submit: result('POST', () => `${BASE}/submit`, { body: (draft: P<'submit'>[0], user: P<'submit'>[1]) => ({ draft, user }) }),
    applySimulatedResult: result('POST', () => `${BASE}/apply-simulated-result`, { body: (id: P<'applySimulatedResult'>[0], user: P<'applySimulatedResult'>[1]) => ({ id, user }) }),
  });
