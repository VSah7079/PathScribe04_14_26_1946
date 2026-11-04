// src/services/cases/caseServiceInstance.ts
// Batch 615 (PS-481, PS-482): the app's case service, exported from
// `@/services` as `caseService`. The mock in the demo; the API server's with an address.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCaseService } from './httpCaseService';
import { mockCaseService } from './mockCaseService';
import type { ICaseService } from './ICaseService';

export const caseService: ICaseService = chooseService<ICaseService>('cases', mockCaseService, createHttpCaseService);
