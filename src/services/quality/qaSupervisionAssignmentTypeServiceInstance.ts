// src/services/quality/qaSupervisionAssignmentTypeServiceInstance.ts
// Batch 616: the app's qa supervision assignment types, exported from `@/services` as `qaSupervisionAssignmentTypeService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpQaSupervisionAssignmentTypeService } from './httpQaSupervisionAssignmentTypeService';
import { mockQaSupervisionAssignmentTypeService } from './mockQaSupervisionAssignmentTypeService';
import type { IQaSupervisionAssignmentTypeService } from './IQaSupervisionAssignmentTypeService';

export const qaSupervisionAssignmentTypeService: IQaSupervisionAssignmentTypeService = chooseService<IQaSupervisionAssignmentTypeService>('qa', mockQaSupervisionAssignmentTypeService, createHttpQaSupervisionAssignmentTypeService);
