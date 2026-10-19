// src/services/abnormalDetection/abnormalDetectionSignalServiceInstance.ts
// Batch 617 (PS-514): the app's abnormalDetectionSignalService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpAbnormalDetectionSignalService } from './httpAbnormalDetectionSignalService';
import { mockAbnormalDetectionSignalService } from './mockAbnormalDetectionSignalService';
import type { IAbnormalDetectionSignalService } from './IAbnormalDetectionSignalService';

export const abnormalDetectionSignalService: IAbnormalDetectionSignalService = chooseService<IAbnormalDetectionSignalService>('abnormalDetection', mockAbnormalDetectionSignalService, createHttpAbnormalDetectionSignalService);
