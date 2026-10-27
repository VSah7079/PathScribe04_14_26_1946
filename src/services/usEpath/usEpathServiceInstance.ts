// src/services/usEpath/usEpathServiceInstance.ts
// Batch 620 (part E, PS-800): the app's US ePath profiles, exported from `@/services` as `usEpathService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpUsEpathService } from './httpUsEpathService';
import { mockUsEpathService } from './mockUsEpathService';
import type { IUsEpathService } from './IUsEpathService';

export const usEpathService: IUsEpathService = chooseService<IUsEpathService>('usEpath', mockUsEpathService, createHttpUsEpathService);
