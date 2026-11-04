// src/services/cancerRegistry/cancerRegistrySettingsServiceInstance.ts
// Batch 616 (PS-504): the app's cancerRegistrySettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCancerRegistrySettingsService } from './httpCancerRegistrySettingsService';
import { mockCancerRegistrySettingsService } from './mockCancerRegistrySettingsService';
import type { ICancerRegistrySettingsService } from './ICancerRegistrySettingsService';

export const cancerRegistrySettingsService: ICancerRegistrySettingsService = chooseService<ICancerRegistrySettingsService>('cancerRegistry', mockCancerRegistrySettingsService, createHttpCancerRegistrySettingsService);
