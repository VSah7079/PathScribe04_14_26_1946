// src/services/stainQc/httpStainQcService.ts
// Batch 763: the API server's version of IStainQcService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md §7; calls listed in docs/architecture/STAIN_QC_API.md).
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { IStainQcService } from './IStainQcService';

type P<K extends keyof IStainQcService> = Parameters<IStainQcService[K]>;
const BASE = '/api/stain-qc/stain-qc';

export const createHttpStainQcService = (client: ApiHttpClient): IStainQcService =>
  buildHttpService<IStainQcService>(client, {
    getSettings: result('GET', () => `${BASE}/get-settings`),
    saveSettings: result('POST', () => `${BASE}/save-settings`, { body: (s: P<'saveSettings'>[0]) => s }),
    getCheckpoint: result('GET', () => `${BASE}/get-checkpoint`),
    signOffRun: result('POST', () => `${BASE}/sign-off-run`, { body: (batchId: P<'signOffRun'>[0], outcomes: P<'signOffRun'>[1], stainerEquipmentId: P<'signOffRun'>[2]) => ({ batchId, outcomes, stainerEquipmentId }) }),
    decideImage: result('POST', () => `${BASE}/decide-image`, { body: (stainId: P<'decideImage'>[0], outcome: P<'decideImage'>[1], reason: P<'decideImage'>[2]) => ({ stainId, outcome, reason }) }),
  });
