// src/services/cytology/cytologyWorkloadLedgerServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyWorkloadLedger service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyWorkloadLedgerService } from './httpCytologyWorkloadLedgerService';
import { mockCytologyWorkloadLedgerService } from './mockCytologyWorkloadLedgerService';
import type { ICytologyWorkloadLedgerService } from './ICytologyWorkloadLedgerService';

export const cytologyWorkloadLedgerService: ICytologyWorkloadLedgerService = chooseService<ICytologyWorkloadLedgerService>('cytology', mockCytologyWorkloadLedgerService, createHttpCytologyWorkloadLedgerService);
