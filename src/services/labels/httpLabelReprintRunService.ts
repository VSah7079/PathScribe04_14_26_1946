// src/services/labels/httpLabelReprintRunService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of ILabelReprintRunService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/LABEL_REPRINT_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; the server decides permission.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, done, list } from '../apiServer/httpServiceKit';
import type { ILabelReprintRunService } from './ILabelReprintRunService';

type P<K extends keyof ILabelReprintRunService> = Parameters<ILabelReprintRunService[K]>;
const BASE = '/api/labels/label-reprint-run';

export const createHttpLabelReprintRunService = (client: ApiHttpClient): ILabelReprintRunService =>
  buildHttpService<ILabelReprintRunService>(client, {
    list: list('GET', () => `${BASE}/list`),
    save: done('POST', () => `${BASE}/save`, { body: (run: P<'save'>[0]) => (run) }),
  });
