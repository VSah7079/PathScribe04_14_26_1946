// src/services/quality/IPeerReviewSettingsService.ts
// Batch 617 (PS-514): the interface, moved out of the mock so the mock and the server version share it.
import type { ServiceResult } from '../types';
import type { PeerReviewGateSettings } from '@/types/quality/PeerReview';

export interface IPeerReviewSettingsService {
  get(): Promise<ServiceResult<PeerReviewGateSettings>>;
  save(settings: PeerReviewGateSettings): Promise<ServiceResult<PeerReviewGateSettings>>;
  /** Whether sign-out waits for the review on a case from this facility and subspecialty. */
  gateOnFor(facilityId?: string, subspecialtyId?: string): Promise<boolean>;
}
