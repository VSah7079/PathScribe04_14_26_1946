// src/services/cytologyQc/cytologyQcCaseAssignmentServiceInstance.ts
// Batch 616 (PS-499): the app's cytologyQcCaseAssignment service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologyQcCaseAssignmentService } from './httpCytologyQcCaseAssignmentService';
import { mockCytologyQcCaseAssignmentService } from './mockCytologyQcCaseAssignmentService';
import type { ICytologyQcCaseAssignmentService } from './ICytologyQcCaseAssignmentService';

export const cytologyQcCaseAssignmentService: ICytologyQcCaseAssignmentService = chooseService<ICytologyQcCaseAssignmentService>('cytologyQc', mockCytologyQcCaseAssignmentService, createHttpCytologyQcCaseAssignmentService);
