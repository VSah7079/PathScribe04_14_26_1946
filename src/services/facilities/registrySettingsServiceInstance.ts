// src/services/facilities/registrySettingsServiceInstance.ts
// Batch 616 (PS-484): the app's registrySettingsService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpRegistrySettingsService } from './httpRegistrySettingsService';
import { mockRegistrySettingsService } from './mockRegistrySettingsService';
import type { IRegistrySettingsService } from './IRegistrySettingsService';

export const registrySettingsService: IRegistrySettingsService = chooseService<IRegistrySettingsService>('facilities', mockRegistrySettingsService, createHttpRegistrySettingsService);
