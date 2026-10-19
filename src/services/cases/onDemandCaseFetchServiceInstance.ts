// src/services/cases/onDemandCaseFetchServiceInstance.ts
// Batch 617 (PS-514): the app's onDemandCaseFetchService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpOnDemandCaseFetchService } from './httpOnDemandCaseFetchService';
import { mockOnDemandCaseFetchService } from './mockOnDemandCaseFetchService';
import type { IOnDemandCaseFetchService } from './IOnDemandCaseFetchService';

export const onDemandCaseFetchService: IOnDemandCaseFetchService = chooseService<IOnDemandCaseFetchService>('cases', mockOnDemandCaseFetchService, createHttpOnDemandCaseFetchService);
