// src/services/registrySubmission/registrySubmissionHeader.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 419 (Registry Engine SRS v2.1, FR-008.4, FR-008.5, FR-008.8). The
// header every registry payload carries, for both domains. Pure.
//
//   masterTransactionId  One per (facility, case, specimen, registry): every
//                        version of the same result links back to it.
//   submissionVersion    1 for the first submission; each correction or
//                        addendum takes the next number.
//   submissionGuid       Derived from facility, case, specimen, sign-out time
//                        and version (the SRS formula), so the same report
//                        always gets the same id. A resend of an unchanged
//                        report keeps it and sets isDuplicateRetry, so the
//                        registry can drop the duplicate.
//   messageType          NEW for the first submission the registry receives;
//                        CORRECTION when the diagnosis changed; AMENDMENT for
//                        an addendum.
//   environment          'test' or 'production', from the lab's registry
//                        settings (default 'test'): the interface engine maps
//                        it to the wire format's test flag (HL7 MSH-11 'T',
//                        FHIR meta.security TEST), so a test result never
//                        reaches a live register.
// ─────────────────────────────────────────────────────────────────────────────

import { sha256Hex } from './sha256';

export type RegistryMessageType = 'NEW' | 'CORRECTION' | 'AMENDMENT';
export type RegistryEnvironment = 'test' | 'production';
/** What caused this submission. */
export type RegistrySubmissionKind = 'signOut' | 'correction' | 'addendum';

export interface RegistrySubmissionHeader {
  submissionGuid: string;
  submissionVersion: number;
  masterTransactionId: string;
  messageType: RegistryMessageType;
  environment: RegistryEnvironment;
  isDuplicateRetry: boolean;
  /** The version this one replaces, when there is one. */
  previousSubmissionGuid?: string;
  /** The specimen the result is for ('case' for a case-level cancer report). */
  specimenId: string;
  /** Batch 421: what caused this submission (a resend of a new version keeps it). */
  kind?: RegistrySubmissionKind;
  /** Batch 423: the registry template version (vYYYY.Q.X) the payload was built to; go-live counts
   *  only test submissions the registry accepted on the version being approved. */
  templateVersion?: string;
}

/** A GUID-shaped id (8-4-4-4-12) from the hash of the parts. Version nibble 8 (RFC 9562, custom). */
function guidFrom(parts: string[]): string {
  const hex = sha256Hex(parts.join('|'));
  const v = `${hex.slice(0, 12)}8${hex.slice(13, 16)}${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 32)}`;
  return `${v.slice(0, 8)}-${v.slice(8, 12)}-${v.slice(12, 16)}-${v.slice(16, 20)}-${v.slice(20, 32)}`;
}

export function registryMasterTransactionId(p: { facilityId: string; caseId: string; specimenId: string; registryId: string }): string {
  return guidFrom(['master', p.facilityId, p.caseId, p.specimenId, p.registryId]);
}

export function registrySubmissionGuid(p: { facilityId: string; caseId: string; specimenId: string; signOutTimestamp: string; submissionVersion: number }): string {
  return guidFrom(['submission', p.facilityId, p.caseId, p.specimenId, p.signOutTimestamp, String(p.submissionVersion)]);
}

/** A prior queue entry for the same result, as far as the header needs it. */
export interface PriorRegistrySubmission {
  registryId: string;
  status: string;
  /** Batch 421: what the registry said; a rejected version is one it doesn't hold. */
  registryStatus?: string;
  submission?: Pick<RegistrySubmissionHeader, 'submissionGuid' | 'submissionVersion' | 'specimenId'>;
}

export function buildRegistrySubmissionHeader(
  input: {
    facilityId: string; caseId: string; specimenId: string; registryId: string;
    signOutTimestamp: string; kind: RegistrySubmissionKind; environment?: RegistryEnvironment;
    templateVersion?: string;
  },
  prior: PriorRegistrySubmission[],
): RegistrySubmissionHeader {
  const mine = prior.filter(p => p.registryId === input.registryId && p.submission && p.submission.specimenId === input.specimenId);
  const latest = mine.reduce<PriorRegistrySubmission | undefined>((best, p) => (!best || p.submission!.submissionVersion > best.submission!.submissionVersion ? p : best), undefined);
  const submissionVersion = (latest?.submission?.submissionVersion ?? 0) + 1;
  // The registry only holds a result it was sent and didn't reject. Until then, whatever caused this submission, it is NEW.
  const registryHasIt = mine.some(p => p.status === 'SENT' && !(p.registryStatus ?? '').startsWith('rejected'));
  const messageType: RegistryMessageType = !registryHasIt ? 'NEW' : input.kind === 'addendum' ? 'AMENDMENT' : 'CORRECTION';
  return {
    submissionGuid: registrySubmissionGuid({ ...input, submissionVersion }),
    submissionVersion,
    masterTransactionId: registryMasterTransactionId(input),
    messageType,
    environment: input.environment ?? 'test',
    isDuplicateRetry: false,
    ...(latest ? { previousSubmissionGuid: latest.submission!.submissionGuid } : {}),
    specimenId: input.specimenId,
    kind: input.kind,
    ...(input.templateVersion ? { templateVersion: input.templateVersion } : {}),
  };
}

/** A resend of the same, unchanged submission: same id, marked as a duplicate retry. */
export function retryRegistrySubmissionHeader(header: RegistrySubmissionHeader): RegistrySubmissionHeader {
  return { ...header, isDuplicateRetry: true };
}

/** Batch 421: a fingerprint of what a payload says, leaving out what changes on every build
 *  (messageId, timestamp) and the header itself. Two builds with the same fingerprint are the
 *  same report: a resend reuses the submission id (FR-008.5); a different one is a new version. */
export function registryContentHash(payload: object): string {
  const stable = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(stable);
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.keys(v as object).sort()
        .filter(k => k !== 'messageId' && k !== 'timestamp' && k !== 'submission' && (v as any)[k] !== undefined)
        .map(k => [k, stable((v as any)[k])]));
    }
    return v;
  };
  return sha256Hex(JSON.stringify(stable(payload)));
}
