// src/services/printSettings/facilityPrintSettingsServiceInstance.ts
// Batch 617 (PS-514): the app's facilityPrintSettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpFacilityPrintSettingsService } from './httpFacilityPrintSettingsService';
import { mockFacilityPrintSettingsService } from './mockFacilityPrintSettingsService';
import type { IFacilityPrintSettingsService } from './IFacilityPrintSettingsService';

export const facilityPrintSettingsService: IFacilityPrintSettingsService = chooseService<IFacilityPrintSettingsService>('printSettings', mockFacilityPrintSettingsService, createHttpFacilityPrintSettingsService);
