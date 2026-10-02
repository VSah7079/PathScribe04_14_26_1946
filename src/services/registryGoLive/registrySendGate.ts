// src/services/registryGoLive/registrySendGate.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 424: the one decision every registry submission path asks before it
// queues or sends anything (screening sign-out and revisions, cancer
// dispatch, worklist resends, the synthetic test suite). Pure.
//
//   production instance, real case
//     go-live approved and current          → send, environment production
//     otherwise                             → hold REGISTRY_LIVE_NOT_APPROVED
//                                             ("held: attestation required";
//                                             resent in the catch-up on approval)
//   production instance, synthetic case      → skip: never on a live register
//   validation instance, real case           → skip: real data never goes to a
//                                             test system (not queued; audited)
//   validation instance, synthetic case
//     data-sharing agreement recorded        → send, environment test
//     otherwise                             → skip: the registry is pending
//
// Flat, not a discriminated union: this project's compiler settings don't
// narrow on a literal discriminant reliably.
// ─────────────────────────────────────────────────────────────────────────────

import type { InstanceRole } from '../deployment/deploymentInstance';
import type { RegistryLiveStatus } from './registryTemplateVersions';
import { REGISTRY_LIVE_HOLD_CODE } from './registryGoLiveRules';

export type RegistrySkipReason = 'syntheticOnProduction' | 'realCaseOnValidation' | 'registryPending';

export interface RegistrySendGate {
  action: 'send' | 'hold' | 'skip';
  /** The payload environment, for send and hold. */
  environment?: 'test' | 'production';
  /** hold: the queue entry's error code. */
  code?: string;
  skipReason?: RegistrySkipReason;
  /** hold and skip: literal English, stored on the queue entry or in the audit log. */
  message?: string;
}

export function registrySendDecision(input: {
  role: InstanceRole;
  synthetic: boolean;
  registryId: string;
  liveStatus: RegistryLiveStatus;
  agreementRecorded: boolean;
}): RegistrySendGate {
  const { registryId, liveStatus: status } = input;
  if (input.role === 'production') {
    if (input.synthetic) return { action: 'skip', skipReason: 'syntheticOnProduction', message: `Not sent: synthetic test cases never go to ${registryId}'s live register.` };
    if (status.state === 'current' || status.state === 'reapprovalDue') return { action: 'send', environment: 'production' };
    const message = status.state === 'notApproved'
      ? `Held, attestation required: go-live to ${registryId}'s live register has not been approved. Approve go-live in the registry settings; held results are resent when it is.`
      : `Held, attestation required: ${registryId} went live on template ${status.approvedVersion}; template ${status.blockingVersion!.version} (${status.blockingVersion!.changeClass} change) holds live submissions from ${status.holdsFrom} until go-live is re-approved.`;
    return { action: 'hold', environment: 'production', code: REGISTRY_LIVE_HOLD_CODE, message };
  }
  if (!input.synthetic) return { action: 'skip', skipReason: 'realCaseOnValidation', message: `Not sent: this is a validation instance, which sends only the synthetic test suite to ${registryId}'s test system, never real cases.` };
  if (!input.agreementRecorded) return { action: 'skip', skipReason: 'registryPending', message: `Not sent: ${registryId} is pending; record the data-sharing agreement before testing.` };
  return { action: 'send', environment: 'test' };
}
