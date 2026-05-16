// firestoreCaseService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Firestore implementation stub — Phase 2.
//
// TODO: Implement using Firestore collection 'cases'.
// Cases are written by the LIS sync Cloud Function, not by the client directly.
// This service is read-only from the client perspective.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { Case } from '../../types/case/Case';
import type { PathologyCase, CaseFilterParams, ICaseService } from './ICaseService';

export const firestoreCaseService: ICaseService = {

  async getCase(_caseId: string): Promise<Case | undefined> {
    throw new Error('firestoreCaseService.getCase — not yet implemented');
  },

  async getAll(_params?: CaseFilterParams): Promise<ServiceResult<PathologyCase[]>> {
    throw new Error('firestoreCaseService.getAll — not yet implemented');
  },

  async listCasesForUser(_userId: string): Promise<Case[]> {
    throw new Error('firestoreCaseService.listCasesForUser — not yet implemented');
  },

  async updateCase(_caseId: string, _updates: Partial<Case>): Promise<void> {
    throw new Error('firestoreCaseService.updateCase — not yet implemented');
  },
};
