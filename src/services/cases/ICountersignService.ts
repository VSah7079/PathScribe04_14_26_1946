// src/services/cases/ICountersignService.ts
import { ServiceResult } from '../types';
import type { CountersignRecord } from '@/types/case/CountersignRecord';

export interface ICountersignService {
  getAll(): Promise<ServiceResult<CountersignRecord[]>>;
  getForCase(caseId: string): Promise<ServiceResult<CountersignRecord | null>>;
  /** Called when a resident's sign-out is intercepted — creates the
   *  pending record and snapshots current answers for later delta
   *  comparison. */
  release(input: {
    caseId: string;
    subspecialtyId?: string;
    residentId: string;
    residentName: string;
    releasedAnswersSnapshot: Record<string, Record<string, string | string[]>>;
  }): Promise<ServiceResult<CountersignRecord>>;
  /** Called when the attending actually finalizes a case that was
   *  pending countersign — computes the real delta against the
   *  snapshot and marks the record complete. */
  countersign(input: {
    caseId: string;
    attendingId: string;
    attendingName: string;
    currentAnswersByInstance: Record<string, Record<string, string | string[]>>;
    attendingFeedback?: string;
  }): Promise<ServiceResult<CountersignRecord>>;
}
