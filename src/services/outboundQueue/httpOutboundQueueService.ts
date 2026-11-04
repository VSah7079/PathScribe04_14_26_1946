// src/services/outboundQueue/httpOutboundQueueService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800): the API server's version of IOutboundQueueService. Four
// routes, listed in docs/architecture/OUTBOUND_QUEUE_API.md
// (HTTP_SERVICES_PATTERN.md §7). The server owns the queue, the holds, the
// schedule and the audit; the browser lists and asks. A hold's reason is a
// fixed pick-list value; the server answers with one result per ref.
// ─────────────────────────────────────────────────────────────────────────────
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import type { IOutboundQueueService } from './IOutboundQueueService';

const BASE = '/api/delivery/outbound-queue';
const route = (method: string): string => methodPath(BASE, method);
const pick = (d: { results?: unknown[] }) => d?.results ?? [];

export const createHttpOutboundQueueService = (client: ApiHttpClient): IOutboundQueueService =>
  buildHttpService<IOutboundQueueService>(client, {
    list: result('POST', () => route('list'), { body: (filter?: unknown, sort?: unknown) => ({ filter: filter ?? {}, sort: sort ?? null }) }),
    hold: result('POST', () => route('hold'), { body: (refs: string[], reason: string, note?: string) => ({ refs, reason, ...(note ? { note } : {}) }), pick }),
    release: result('POST', () => route('release'), { body: (refs: string[]) => ({ refs }), pick }),
    retry: result('POST', () => route('retry'), { body: (refs: string[], reason?: string) => ({ refs, ...(reason ? { reason } : {}) }), pick }),
    retract: result('POST', () => route('retract'), { body: (refs: string[], reason: string) => ({ refs, reason }), pick }),
    overrideRelease: result('POST', () => route('overrideRelease'), { body: (refs: string[]) => ({ refs }), pick }),
    markNotReportable: result('POST', () => route('markNotReportable'), { body: (refs: string[], reason: string, note?: string) => ({ refs, reason, ...(note ? { note } : {}) }), pick }),
  });
