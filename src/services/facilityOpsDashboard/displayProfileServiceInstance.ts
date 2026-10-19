// src/services/facilityOpsDashboard/displayProfileServiceInstance.ts
// Batch 616: the app's display profiles, exported from `@/services` as `displayProfileService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpDisplayProfileService } from './httpDisplayProfileService';
import { mockDisplayProfileService } from './mockDisplayProfileService';
import type { IDisplayProfileService } from './IDisplayProfileService';

export const displayProfileService: IDisplayProfileService = chooseService<IDisplayProfileService>('intraop', mockDisplayProfileService, createHttpDisplayProfileService);
