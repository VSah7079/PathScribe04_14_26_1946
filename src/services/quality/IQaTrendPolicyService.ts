// src/services/quality/IQaTrendPolicyService.ts
// Batch 617 (PS-514): the interface, moved out of the mock so the mock and the server version share it.
import type { ServiceResult } from '../types';
import type { QaTrendPolicySettings } from '@/types/quality/QaTrend';

export interface IQaTrendPolicyService {
  get(): Promise<ServiceResult<QaTrendPolicySettings>>;
  /** Refused with the first problem (qaTrendPolicyProblem) when any policy can't work. */
  save(settings: QaTrendPolicySettings, labName?: (id: string) => string): Promise<ServiceResult<QaTrendPolicySettings>>;
}
