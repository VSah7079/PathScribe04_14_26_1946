// src/services/deficiencies/resolutionTypeServiceInstance.ts
// Batch 616: the app's resolution types, exported from `@/services` as `resolutionTypeService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpResolutionTypeService } from './httpResolutionTypeService';
import { mockResolutionTypeService } from './mockResolutionTypeService';
import type { IResolutionTypeService } from './IDeficiencyService';

export const resolutionTypeService: IResolutionTypeService = chooseService<IResolutionTypeService>('deficiencies', mockResolutionTypeService, createHttpResolutionTypeService);
