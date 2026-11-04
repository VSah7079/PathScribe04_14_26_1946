// src/services/authorization/defaultAuthorizationService.ts
// PS-355 (Batch 369): the app's authorization service, wired to the role,
// user and audit services of this build. Exported from `@/services` as
// `authorizationService`; tests build their own with createAuthorizationService.

import { roleService as defaultRoleService } from '../roles/roleServiceInstance';
import { userService as defaultUserService } from '../users/userServiceInstance';
import { auditService as defaultAuditService } from '../auditlog/auditServiceInstance';
import { chooseService } from '../apiServer/serviceSelection';
import { createAuthorizationService, type IAuthorizationService } from './authorizationService';
import { createHttpAuthorizationService } from './httpAuthorizationService';

// Batch 616 (PS-484): with an API server address the checks are put to the server
// (httpAuthorizationService.ts); without one (the demo) they run here on the mock data.
const mockAuthorizationService = createAuthorizationService({
  roleService: defaultRoleService,
  userService: defaultUserService,
  auditService: defaultAuditService,
  // Batch 653: a check that names only a case is judged against the case's own facility.
  // Imported on first use: the case service itself calls this one.
  caseFacility: async (caseId) => {
    const { caseService } = await import('../cases/caseServiceInstance');
    const c = await caseService.getCase(caseId);
    return c?.order?.facilityId ?? null;
  },
});

export const authorizationService: IAuthorizationService = chooseService<IAuthorizationService>('authorization', mockAuthorizationService, createHttpAuthorizationService);
