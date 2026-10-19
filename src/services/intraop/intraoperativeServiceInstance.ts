// src/services/intraop/intraoperativeServiceInstance.ts
// Batch 616: the app's intraoperative entries, exported from `@/services` as `intraoperativeService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpIntraoperativeService } from './httpIntraoperativeService';
import { mockIntraoperativeService } from './mockIntraoperativeService';
import type { IIntraoperativeService } from './IIntraoperativeService';

export const intraoperativeService: IIntraoperativeService = chooseService<IIntraoperativeService>('intraop', mockIntraoperativeService, createHttpIntraoperativeService);
