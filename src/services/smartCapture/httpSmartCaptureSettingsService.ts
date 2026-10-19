// src/services/smartCapture/httpSmartCaptureSettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ISmartCaptureSettingsService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/SIGNATURES_SMART_CAPTURE_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ISmartCaptureSettingsService } from './ISmartCaptureSettingsService';

type P<K extends keyof ISmartCaptureSettingsService> = Parameters<ISmartCaptureSettingsService[K]>;
const BASE = '/api/smart-capture/smart-capture-settings';

export const createHttpSmartCaptureSettingsService = (client: ApiHttpClient): ISmartCaptureSettingsService =>
  buildHttpService<ISmartCaptureSettingsService>(client, {
    getSettings: result('GET', () => `${BASE}/get-settings`),
    setPrototypeEnabled: result('POST', () => `${BASE}/set-prototype-enabled`, { body: (enabled: P<'setPrototypeEnabled'>[0]) => ({ enabled }) }),
    setChecklistItem: result('POST', () => `${BASE}/set-checklist-item`, { body: (id: P<'setChecklistItem'>[0], ticked: P<'setChecklistItem'>[1]) => ({ id, ticked }) }),
    setProductionActivated: result('POST', () => `${BASE}/set-production-activated`, { body: (on: P<'setProductionActivated'>[0]) => ({ on }) }),
  });
