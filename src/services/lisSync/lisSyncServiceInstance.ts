// src/services/lisSync/lisSyncServiceInstance.ts
// Batch 617 (PS-514): the app's lisSync service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpLisSyncService } from './httpLisSyncService';
import { mockLisSyncService } from './mockLisSyncService';
import type { ILisSyncService } from './ILisSyncService';

export const lisSyncService: ILisSyncService = chooseService<ILisSyncService>('lisSync', mockLisSyncService, createHttpLisSyncService);
