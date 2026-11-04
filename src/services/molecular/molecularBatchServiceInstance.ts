// src/services/molecular/molecularBatchServiceInstance.ts
// Batch 616 (PS-500): the app's molecularBatch service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpMolecularBatchService } from './httpMolecularBatchService';
import { mockMolecularBatchService } from './mockMolecularBatchService';
import type { IMolecularBatchService } from './IMolecularBatchService';

export const molecularBatchService: IMolecularBatchService = chooseService<IMolecularBatchService>('molecular', mockMolecularBatchService, createHttpMolecularBatchService);
