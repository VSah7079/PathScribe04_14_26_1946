// src/services/digitalPathology/aiStalledResultSettingsServiceInstance.ts
// Batch 616: the app's ai stalled-result settings, exported from `@/services` as `aiStalledResultSettingsService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpAiStalledResultSettingsService } from './httpAiStalledResultSettingsService';
import { mockAiStalledResultSettingsService } from './mockAiStalledResultSettingsService';
import type { IAiStalledResultSettingsService } from './IAiStalledResultSettingsService';

export const aiStalledResultSettingsService: IAiStalledResultSettingsService = chooseService<IAiStalledResultSettingsService>('dp', mockAiStalledResultSettingsService, createHttpAiStalledResultSettingsService);
