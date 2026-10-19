// src/services/grossingHardware/grossingHardwareProfileServiceInstance.ts
// Batch 616: the app's grossing hardware profiles, exported from `@/services` as `grossingHardwareProfileService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpGrossingHardwareProfileService } from './httpGrossingHardwareProfileService';
import { mockGrossingHardwareProfileService } from './mockGrossingHardwareProfileService';
import type { IGrossingHardwareProfileService } from './IGrossingHardwareProfileService';

export const grossingHardwareProfileService: IGrossingHardwareProfileService = chooseService<IGrossingHardwareProfileService>('grossing', mockGrossingHardwareProfileService, createHttpGrossingHardwareProfileService);
