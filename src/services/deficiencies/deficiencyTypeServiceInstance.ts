// src/services/deficiencies/deficiencyTypeServiceInstance.ts
// Batch 616: the app's deficiency types, exported from `@/services` as `deficiencyTypeService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpDeficiencyTypeService } from './httpDeficiencyTypeService';
import { mockDeficiencyTypeService } from './mockDeficiencyTypeService';
import type { IDeficiencyTypeService } from './IDeficiencyService';

export const deficiencyTypeService: IDeficiencyTypeService = chooseService<IDeficiencyTypeService>('deficiencies', mockDeficiencyTypeService, createHttpDeficiencyTypeService);
