// src/services/cases/countersignServiceInstance.ts
// Batch 617 (PS-514): the app's countersignService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCountersignService } from './httpCountersignService';
import { mockCountersignService } from './mockCountersignService';
import type { ICountersignService } from './ICountersignService';

export const countersignService: ICountersignService = chooseService<ICountersignService>('cases', mockCountersignService, createHttpCountersignService);
