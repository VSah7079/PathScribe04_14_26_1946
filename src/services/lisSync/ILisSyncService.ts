// src/services/lisSync/ILisSyncService.ts
// Batch 617 (PS-514): the contract of the "Data as of / Check now" indicator: when PathScribe last
// looked at the LIS for a case and whether the LIS has moved on since. The mock simulates the
// round-trip; the API server's version asks the real interface engine (docs/architecture/INTERFACE_ENGINE_API.md).
import type { ServiceResult } from '../types';

export interface LisSyncPendingFlag {
  id: string;
  name: string;
  lisCode: string;
  tagClass: 'COMPUTATIONAL' | 'ADMINISTRATIVE';
  severity: 1 | 2 | 3 | 4 | 5;
  specimenId?: string;
}

export interface LisSyncState {
  lastCheckedAt: string;
  pendingUpdate?: {
    availableSince: string;
    newFlags: LisSyncPendingFlag[];
    summary: string;
  };
}

export interface ILisSyncService {
  getSyncState(caseId: string): Promise<ServiceResult<LisSyncState | null>>;
  /** Checks the LIS now. The caller applies `newFlags` onto the case record. */
  checkNow(caseId: string): Promise<ServiceResult<{ lastCheckedAt: string; newFlags: LisSyncPendingFlag[] }>>;
}
