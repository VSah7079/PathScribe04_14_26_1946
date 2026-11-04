// src/services/billing/rvuCodeMapServiceInstance.ts
// Batch 616 (PS-498): the app's rvuCodeMap service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpRvuCodeMapService } from './httpRvuCodeMapService';
import { mockRvuCodeMapService } from './mockRvuCodeMapService';
import type { IRvuCodeMapService } from './IRvuCodeMapService';

export const rvuCodeMapService: IRvuCodeMapService = chooseService<IRvuCodeMapService>('billing', mockRvuCodeMapService, createHttpRvuCodeMapService);
