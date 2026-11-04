// src/services/cytology/snomedCervicalHistologySeverityMappingServiceInstance.ts
// Batch 616 (PS-499): the app's snomedCervicalHistologySeverityMapping service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSnomedCervicalHistologySeverityMappingService } from './httpSnomedCervicalHistologySeverityMappingService';
import { mockSnomedCervicalHistologySeverityMappingService } from './mockSnomedCervicalHistologySeverityMappingService';
import type { ISnomedCervicalHistologySeverityMappingService } from './ISnomedCervicalHistologySeverityMappingService';

export const snomedCervicalHistologySeverityMappingService: ISnomedCervicalHistologySeverityMappingService = chooseService<ISnomedCervicalHistologySeverityMappingService>('cytology', mockSnomedCervicalHistologySeverityMappingService, createHttpSnomedCervicalHistologySeverityMappingService);
