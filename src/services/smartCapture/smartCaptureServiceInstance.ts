// src/services/smartCapture/smartCaptureServiceInstance.ts
// Batch 617 (PS-514): the app's smartCapture service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSmartCaptureService } from './httpSmartCaptureService';
import { mockSmartCaptureService } from './smartCaptureServices';
import type { ISmartCaptureService } from './ISmartCaptureService';

export const smartCaptureService: ISmartCaptureService = chooseService<ISmartCaptureService>('smartCapture', mockSmartCaptureService, createHttpSmartCaptureService);
