// src/services/cases/caseTeamSaveDeps.ts
// Batch 441: the real services saveCaseTeam uses.
import type { SaveCaseTeamDeps } from './saveCaseTeam';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockUserService } from '../users/mockUserService';
import { mockRoleService } from '../roles/mockRoleService';
import { mockParticipationTypeService } from '../participationTypes/mockParticipationTypeService';
import { caseRouter } from './CaseRouter';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const caseTeamSaveDeps: SaveCaseTeamDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  listStaff: async () => { const r = await mockUserService.getAll(); return r.ok ? r.data : []; },
  listRoles: async () => { const r = await mockRoleService.getAll(); return r.ok ? r.data : []; },
  listParticipationTypes: async () => { const r = await mockParticipationTypeService.getAll(); return r.ok ? r.data : []; },
  // PS-71 (Batch 458): versioned (was: updateCase(caseId, updates), no version).
  getCase: caseId => caseRouter.getCase(caseId),
  updateCase: (caseId, updates, expectedVersion) => caseRouter.updateCase(caseId, updates, expectedVersion),
};
