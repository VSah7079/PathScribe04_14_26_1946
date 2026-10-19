// src/services/cytology/staffCytologyQcOverrideServiceInstance.ts
// Batch 616 (PS-499): the app's staffCytologyQcOverride service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpStaffCytologyQcOverrideService } from './httpStaffCytologyQcOverrideService';
import { mockStaffCytologyQcOverrideService } from './mockStaffCytologyQcOverrideService';
import type { IStaffCytologyQcOverrideService } from './IStaffCytologyQcOverrideService';

export const staffCytologyQcOverrideService: IStaffCytologyQcOverrideService = chooseService<IStaffCytologyQcOverrideService>('cytology', mockStaffCytologyQcOverrideService, createHttpStaffCytologyQcOverrideService);
