// src/services/assistPolling/httpAssistPollingService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IAssistPollingService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_SERVICES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, done, required, result } from '../apiServer/httpServiceKit';
import type { IAssistPollingService } from './mockAssistPollingService';

type P<K extends keyof IAssistPollingService> = Parameters<IAssistPollingService[K]>;
const BASE = '/api/assist-polling/assist-polling';

export const createHttpAssistPollingService = (client: ApiHttpClient): IAssistPollingService =>
  buildHttpService<IAssistPollingService>(client, {
    getState: required('GET', () => `${BASE}/get-state`),
    saveState: done('POST', () => `${BASE}/save-state`, { body: (state: P<'saveState'>[0]) => (state) }),
    saveSettings: result('POST', () => `${BASE}/save-settings`, { body: (settings: P<'saveSettings'>[0]) => (settings) }),
  });
