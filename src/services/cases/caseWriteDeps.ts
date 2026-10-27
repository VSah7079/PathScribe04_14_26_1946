// src/services/cases/caseWriteDeps.ts
// Batch 458 (PS-71): the real services behind caseWrite.ts, for screens.
import { caseRouter } from './CaseRouter';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { auditService } from '../auditlog/auditServiceInstance';
import type { CaseWriteDeps, OverwriteDeps } from './caseWrite';

export const caseWriteDeps: CaseWriteDeps = {
  getCase: id => caseRouter.getCase(id),
  updateCase: (id, updates, expectedVersion) => caseRouter.updateCase(id, updates, expectedVersion),
};

export const caseOverwriteDeps: OverwriteDeps = {
  ...caseWriteDeps,
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  logAudit: event => auditService.logEvent(event),
};
