// src/services/cytologyQc/mockCytologyQcSamplingStateService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 501: each QC rule's sampling counters ("every Nth case", "first N
// cases"), kept between sign-outs. Browser storage in the mock, so counters
// are per browser — fine for demos and tests, not for a lab.
//
// Production: the API server owns these counters and advances them in the
// same transaction that evaluates the rule, so two pathologists signing out at
// once can't both be "case 10" (docs/architecture/CYTOLOGY_QC_API.md).
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import type { QcSamplingState } from './resolveQcSamplingDecision';
import type { ICytologyQcSamplingStateService } from './ICytologyQcSamplingStateService';

const KEY = 'cytologyQcSamplingStates';

export type { ICytologyQcSamplingStateService };

export const mockCytologyQcSamplingStateService: ICytologyQcSamplingStateService = {
  async getAll() {
    return new Map(Object.entries(storageGet<Record<string, QcSamplingState>>(KEY, {})));
  },
  async saveAll(states) {
    storageSet(KEY, Object.fromEntries(states));
  },
};
