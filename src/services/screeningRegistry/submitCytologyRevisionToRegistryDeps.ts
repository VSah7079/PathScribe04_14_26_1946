// src/services/screeningRegistry/submitCytologyRevisionToRegistryDeps.ts
// Batch 419: the real services submitCytologyRevisionToRegistry uses (the sign-out's registry deps, plus the records).
import type { CytologyRevisionRegistryDeps } from './submitCytologyRevisionToRegistry';
import { signOutCytologyCaseDeps } from '../cytology/signOutCytologyCaseDeps';
import { mockCytologySignOutRecordService } from '../cytology/mockCytologySignOutRecordService';
import { mockCytologyReviewRecordService } from '../cytology/mockCytologyReviewRecordService';

/* eslint-disable @typescript-eslint/no-explicit-any */
const d = signOutCytologyCaseDeps;
export const submitCytologyRevisionToRegistryDeps: CytologyRevisionRegistryDeps = {
  getRegistrySettings: d.getRegistrySettings,
  getRegistryConfig: d.getRegistryConfig,
  registryQueue: d.registryQueue,
  dispatchInterfaceMessage: d.dispatchInterfaceMessage,
  logAudit: d.logAudit,
  sendGate: d.sendGate,
  updateCase: d.updateCase,
  now: d.now,
  newId: d.newId,
  getCaseSignOutRecords: caseId => mockCytologySignOutRecordService.getByCaseId(caseId) as any,
  getCaseReviews: caseId => mockCytologyReviewRecordService.getByCaseId(caseId) as any,
};
