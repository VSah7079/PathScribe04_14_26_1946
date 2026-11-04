// src/services/feedback/httpFeedbackSettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IFeedbackSettingsService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CONFIG_DICTIONARIES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result, value } from '../apiServer/httpServiceKit';

import type { IFeedbackSettingsService } from './IFeedbackSettingsService';

type P<K extends keyof IFeedbackSettingsService> = Parameters<IFeedbackSettingsService[K]>;
const BASE = '/api/feedback/feedback-settings';

export const createHttpFeedbackSettingsService = (client: ApiHttpClient): IFeedbackSettingsService =>
  buildHttpService<IFeedbackSettingsService>(client, {
    get: result('GET', () => `${BASE}/get`),
    save: result('POST', () => `${BASE}/save`, { body: (settings: P<'save'>[0]) => (settings) }),
    qaButtonShown: value('POST', () => `${BASE}/qa-button-shown`, { missing: false, fallback: false }),
  });
