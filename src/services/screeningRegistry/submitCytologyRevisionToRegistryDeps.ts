// src/services/screeningRegistry/submitCytologyRevisionToRegistryDeps.ts
// Batch 419: the real services submitCytologyRevisionToRegistry uses (the sign-out's registry deps, plus the records).
import type { CytologyRevisionRegistryDeps } from './submitCytologyRevisionToRegistry';
import { signOutCytologyCaseDeps } from '../cytology/signOutCytologyCaseDeps';
import { cytologySignOutRecordService } from '../cytology/cytologySignOutRecordServiceInstance';
import { cytologyReviewRecordService } from '../cytology/cytologyReviewRecordServiceInstance';

const d = signOutCytologyCaseDeps;
export const submitCytologyRevisionToRegistryDeps: CytologyRevisionRegistryDeps = {
  getRegistrySettings: d.getRegistrySettings,
  getRegistryConfig: d.getRegistryConfig,
  registryQueue: d.registryQueue,
  dispatchInterfaceMessage: d.dispatchInterfaceMessage,
  logAudit: d.logAudit,
  sendGate: d.sendGate,
  batchProgram: d.batchProgram,
  getCase: d.getCase,
  updateCase: d.updateCase,
  now: d.now,
  newId: d.newId,
  getCaseSignOutRecords: caseId => cytologySignOutRecordService.getByCaseId(caseId) as any,
  getCaseReviews: caseId => cytologyReviewRecordService.getByCaseId(caseId) as any,
};
