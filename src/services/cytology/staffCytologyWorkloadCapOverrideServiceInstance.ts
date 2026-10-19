// src/services/cytology/staffCytologyWorkloadCapOverrideServiceInstance.ts
// Batch 616 (PS-499): the app's staffCytologyWorkloadCapOverride service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpStaffCytologyWorkloadCapOverrideService } from './httpStaffCytologyWorkloadCapOverrideService';
import { mockStaffCytologyWorkloadCapOverrideService } from './mockStaffCytologyWorkloadCapOverrideService';
import type { IStaffCytologyWorkloadCapOverrideService } from './IStaffCytologyWorkloadCapOverrideService';

export const staffCytologyWorkloadCapOverrideService: IStaffCytologyWorkloadCapOverrideService = chooseService<IStaffCytologyWorkloadCapOverrideService>('cytology', mockStaffCytologyWorkloadCapOverrideService, createHttpStaffCytologyWorkloadCapOverrideService);
