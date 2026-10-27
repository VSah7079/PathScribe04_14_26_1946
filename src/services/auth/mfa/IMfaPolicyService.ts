// src/services/auth/mfa/IMfaPolicyService.ts
// Batch 675 (access-14): where an organisation's second-factor policy is kept on a server deployment.
// The organisation comes from the sign-in token on the server, never from the browser.
//   get   any signed-in person in the organisation (the sign-in check needs it)
//   save  needs config:session-security:manage, checked by the server; the server writes the policy and
//         its audit entry in one transaction (MFA_POLICY_ENABLED / MFA_POLICY_DISABLED / MFA_STEPUP_CHANGED)
// Contract: docs/architecture/ACCESS_SESSION_API.md §5.
import type { ServiceResult } from '../../types';
import type { MfaPolicy } from './mfaPolicy';

export interface IMfaPolicyService {
  get(): Promise<ServiceResult<MfaPolicy>>;
  /** Only the fields given change. A refusal comes back as ok:false with error 'forbidden'. */
  save(next: Partial<MfaPolicy>): Promise<ServiceResult<MfaPolicy>>;
}
