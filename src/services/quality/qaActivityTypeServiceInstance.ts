// src/services/quality/qaActivityTypeServiceInstance.ts
// Batch 616: the app's qa activity types, exported from `@/services` as `qaActivityTypeService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpQaActivityTypeService } from './httpQaActivityTypeService';
import { mockQaActivityTypeService } from './mockQaActivityTypeService';
import type { IQaActivityTypeService } from './IQaActivityTypeService';

export const qaActivityTypeService: IQaActivityTypeService = chooseService<IQaActivityTypeService>('qa', mockQaActivityTypeService, createHttpQaActivityTypeService);
