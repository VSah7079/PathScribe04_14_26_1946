// src/services/roles/roleServiceInstance.ts
// Batch 616 (PS-484): the app's roleService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpRoleService } from './httpRoleService';
import { mockRoleService } from './mockRoleService';
import type { IRoleService } from './IRoleService';

export const roleService: IRoleService = chooseService<IRoleService>('roles', mockRoleService, createHttpRoleService);
