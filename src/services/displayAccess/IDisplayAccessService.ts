// src/services/displayAccess/IDisplayAccessService.ts
// Batch 603: the device-binding registry for the two wall displays
// (/facility-ops-dashboard and /or-suite-dashboard).
import type { ServiceResult, ID } from '../types';
import type { DisplayKind, DisplayBindingStatus } from './displayToken';

export interface DisplayBindingSummary {
  kind: DisplayKind;
  subjectId: ID;
  tokenHint: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string;
  /** Current state ignoring any presented token: valid, expired or revoked. */
  state: 'valid' | 'expired' | 'revoked';
}

export interface IssuedDisplayToken {
  /** Shown to the administrator once; only its hash is kept. */
  token: string;
  binding: DisplayBindingSummary;
}

export interface IDisplayAccessService {
  /** Issues (or replaces) the Display Token for one display. */
  issueFacilityOpsToken(profileId: ID, validDays?: number): Promise<ServiceResult<IssuedDisplayToken>>;
  issueOrSuiteToken(terminalId: ID, validDays?: number): Promise<ServiceResult<IssuedDisplayToken>>;
  revokeFacilityOpsToken(profileId: ID): Promise<ServiceResult<DisplayBindingSummary>>;
  revokeOrSuiteToken(terminalId: ID): Promise<ServiceResult<DisplayBindingSummary>>;
  /** The server-side check: a presented token against the registry. Revoked, expired, unknown or wrong tokens are refused. */
  verify(kind: DisplayKind, subjectId: ID, token: string | null): Promise<DisplayBindingStatus>;
  getSummary(kind: DisplayKind, subjectId: ID): Promise<DisplayBindingSummary | null>;
  getAllSummaries(kind: DisplayKind): Promise<DisplayBindingSummary[]>;
}
