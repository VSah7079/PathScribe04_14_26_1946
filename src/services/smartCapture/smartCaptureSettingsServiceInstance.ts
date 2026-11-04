// src/services/smartCapture/smartCaptureSettingsServiceInstance.ts
// Batch 617 (PS-514): the app's smartCaptureSettings service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSmartCaptureSettingsService } from './httpSmartCaptureSettingsService';
import { mockSmartCaptureSettingsService } from './smartCaptureServices';
import type { ISmartCaptureSettingsService } from './ISmartCaptureSettingsService';

export const smartCaptureSettingsService: ISmartCaptureSettingsService = chooseService<ISmartCaptureSettingsService>('smartCapture', mockSmartCaptureSettingsService, createHttpSmartCaptureSettingsService);
