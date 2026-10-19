// src/services/intraop/intraopCriticalResultServiceInstance.ts
// Batch 617 (PS-514): the app's intraopCriticalResult service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpIntraopCriticalResultService } from './httpIntraopCriticalResultService';
import { mockIntraopCriticalResultService } from './mockIntraopCriticalResultService';
import type { IIntraopCriticalResultService } from './IIntraopCriticalResultService';

export const intraopCriticalResultService: IIntraopCriticalResultService = chooseService<IIntraopCriticalResultService>('intraop', mockIntraopCriticalResultService, createHttpIntraopCriticalResultService);
