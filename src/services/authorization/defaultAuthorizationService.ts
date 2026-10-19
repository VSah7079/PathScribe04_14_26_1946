// src/services/authorization/defaultAuthorizationService.ts
// PS-355 (Batch 369): the app's authorization service, wired to the role,
// user and audit services of this build. Exported from `@/services` as
// `authorizationService`; tests build their own with createAuthorizationService.

import { mockRoleService } from '../roles/mockRoleService';
import { mockUserService } from '../users/mockUserService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { chooseService } from '../apiServer/serviceSelection';
import { createAuthorizationService, type IAuthorizationService } from './authorizationService';
import { createHttpAuthorizationService } from './httpAuthorizationService';

// Batch 616 (PS-484): with an API server address the checks are put to the server
// (httpAuthorizationService.ts); without one (the demo) they run here on the mock data.
const mockAuthorizationService = createAuthorizationService({
  roleService: mockRoleService,
  userService: mockUserService,
  auditService: mockAuditService,
});

export const authorizationService: IAuthorizationService = chooseService<IAuthorizationService>('authorization', mockAuthorizationService, createHttpAuthorizationService);
