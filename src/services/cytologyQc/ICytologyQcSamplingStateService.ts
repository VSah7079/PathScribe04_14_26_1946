// src/services/cytologyQc/ICytologyQcSamplingStateService.ts
// Batch 672: the interface of the QC sampling counters (it lived in the mock's file until now).
import type { QcSamplingState } from './resolveQcSamplingDecision';

export interface ICytologyQcSamplingStateService {
  getAll(): Promise<Map<string, QcSamplingState>>;
  saveAll(states: Map<string, QcSamplingState>): Promise<void>;
}
