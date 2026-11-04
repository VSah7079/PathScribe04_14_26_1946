// src/services/systemConfig/systemConfigServiceInstance.ts
// Batch 617 (PS-514): the app's systemConfig service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSystemConfigService } from './httpSystemConfigService';
import { mockSystemConfigService } from './mockSystemConfigService';
import type { ISystemConfigService } from './ISystemConfigService';

export const systemConfigService: ISystemConfigService = chooseService<ISystemConfigService>('systemConfig', mockSystemConfigService, createHttpSystemConfigService);
