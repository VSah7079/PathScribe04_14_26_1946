// src/services/digitalPathology/aiScreeningResultServiceInstance.ts
// Batch 616: the app's ai screening results, exported from `@/services` as `aiScreeningResultService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpAiScreeningResultService } from './httpAiScreeningResultService';
import { mockAiScreeningResultService } from './mockAiScreeningResultService';
import type { IAiScreeningResultService } from './IAiScreeningResultService';

export const aiScreeningResultService: IAiScreeningResultService = chooseService<IAiScreeningResultService>('dp', mockAiScreeningResultService, createHttpAiScreeningResultService);
