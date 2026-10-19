// src/services/printSettings/printSettingsServiceInstance.ts
// Batch 617 (PS-514): the app's printSettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpPrintSettingsService } from './httpPrintSettingsService';
import { mockPrintSettingsService } from './mockPrintSettingsService';
import type { IPrintSettingsService } from './IPrintSettingsService';

export const printSettingsService: IPrintSettingsService = chooseService<IPrintSettingsService>('printSettings', mockPrintSettingsService, createHttpPrintSettingsService);
