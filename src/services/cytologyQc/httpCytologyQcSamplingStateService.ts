// src/services/cytologyQc/httpCytologyQcSamplingStateService.ts
// Batch 672 (wiring step 3): the API server's version of ICytologyQcSamplingStateService.
// The server owns the counters (CYTOLOGY_QC_API.md): it advances them in the same transaction that
// evaluates the rule, so two sign-outs at once cannot both be "case 10". `saveAll` is kept for the
// interface; a server build should leave the counters to the server's own evaluation.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, done, value } from '../apiServer/httpServiceKit';
import type { ICytologyQcSamplingStateService } from './ICytologyQcSamplingStateService';
import type { QcSamplingState } from './resolveQcSamplingDecision';

const BASE = '/api/cytology-qc/cytology-qc-sampling-state';

export const createHttpCytologyQcSamplingStateService = (client: ApiHttpClient): ICytologyQcSamplingStateService =>
  buildHttpService<ICytologyQcSamplingStateService>(client, {
    getAll: value('GET', () => `${BASE}/get-all`, {
      pick: (d: { states?: Record<string, QcSamplingState> }) => new Map(Object.entries(d.states ?? {})),
      missing: new Map(), fallback: new Map(),
    }),
    saveAll: done('POST', () => `${BASE}/save-all`, { body: (states: Map<string, QcSamplingState>) => ({ states: Object.fromEntries(states) }) }),
  });
