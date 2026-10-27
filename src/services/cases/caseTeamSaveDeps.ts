// src/services/cases/caseTeamSaveDeps.ts
// Batch 441: the real services saveCaseTeam uses.
import type { SaveCaseTeamDeps } from './saveCaseTeam';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { userService } from '../users/userServiceInstance';
import { roleService } from '../roles/roleServiceInstance';
import { participationTypeService } from '../participationTypes/participationTypeServiceInstance';
import { auditService as defaultAuditService } from '../auditlog/auditServiceInstance';
import { caseRouter } from './CaseRouter';

export const caseTeamSaveDeps: SaveCaseTeamDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  listStaff: async () => { const r = await userService.getAll(); return r.ok ? r.data : []; },
  listRoles: async () => { const r = await roleService.getAll(); return r.ok ? r.data : []; },
  listParticipationTypes: async () => { const r = await participationTypeService.getAll(); return r.ok ? r.data : []; },
  // PS-71 (Batch 458): versioned (was: updateCase(caseId, updates), no version).
  getCase: caseId => caseRouter.getCase(caseId),
  updateCase: (caseId, updates, expectedVersion) => caseRouter.updateCase(caseId, updates, expectedVersion),
  // Batch 651: a saved team change is audited.
  auditService: defaultAuditService,
  actorName: async userId => {
    const r = await userService.getById(userId);
    return r.ok ? [r.data.firstName, r.data.lastName].filter(Boolean).join(' ') || userId : userId;
  },
};
