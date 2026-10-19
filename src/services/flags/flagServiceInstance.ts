// src/services/flags/flagServiceInstance.ts
// Batch 616: the app's case flags service, exported from `@/services` as `flagService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFlagService } from './httpFlagService';
import { mockFlagService } from './mockFlagService';
import type { IFlagService } from './IFlagService';

export const flagService: IFlagService = chooseService<IFlagService>('flags', mockFlagService, createHttpFlagService);
