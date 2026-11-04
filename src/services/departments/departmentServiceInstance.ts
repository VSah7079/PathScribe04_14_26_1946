// src/services/departments/departmentServiceInstance.ts
// Batch 616 (PS-507): the app's departmentService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpDepartmentService } from './httpDepartmentService';
import { mockDepartmentService } from './mockDepartmentService';
import type { IDepartmentService } from './IDepartmentService';

export const departmentService: IDepartmentService = chooseService<IDepartmentService>('departments', mockDepartmentService, createHttpDepartmentService);
