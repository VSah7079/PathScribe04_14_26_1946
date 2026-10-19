// src/services/lisIngestion/httpLisStagingQueueService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of ILisStagingQueueService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/LIS_INGESTION_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, done, list, methodPath } from '../apiServer/httpServiceKit';
import type { ILisStagingQueueService } from './mockLisStagingQueueService';
const BASE = '/api/lis-ingestion/lis-staging-queue';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpLisStagingQueueService = (client: ApiHttpClient): ILisStagingQueueService =>
  buildHttpService<ILisStagingQueueService>(client, {
    load: list('GET', () => route('load')),
    save: done('POST', () => route('save'), { body: (queue: unknown[]) => queue }),
  });
