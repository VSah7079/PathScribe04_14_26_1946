// src/services/quality/qaSupervisionAssignmentServiceInstance.ts
// Batch 616: the app's qa supervision assignments, exported from `@/services` as `qaSupervisionAssignmentService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpQaSupervisionAssignmentService } from './httpQaSupervisionAssignmentService';
import { mockQaSupervisionAssignmentService } from './mockQaSupervisionAssignmentService';
import type { IQaSupervisionAssignmentService } from './IQaSupervisionAssignmentService';

export const qaSupervisionAssignmentService: IQaSupervisionAssignmentService = chooseService<IQaSupervisionAssignmentService>('qa', mockQaSupervisionAssignmentService, createHttpQaSupervisionAssignmentService);
