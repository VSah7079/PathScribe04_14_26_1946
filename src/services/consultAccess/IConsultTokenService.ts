// src/services/consultAccess/IConsultTokenService.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-290 — External Consult / Second-Opinion Access.
//
// What is real and what isn't (Batch 522):
//   - Real: the token is 256 random bits from the platform's cryptographic
//     generator and only its SHA-256 fingerprint is stored
//     (consultTokenCrypto.ts); the link carries it after `#`, out of server
//     logs; the consultant sees only the link's scope (consultLinkRules.ts);
//     issuing, revoking and the cross-case list each need a capability;
//     Batch 669: the consultant sees a masked patient (initials, birth year)
//     unless the issuer ticked the audited opt-in, which needs its own
//     capability (case:consult-link:reveal-identity);
//     creation, every view, every refusal, expiry and revocation are audited.
//   - Not yet: a server that checks the token. This mock keeps the links in
//     the issuing browser, so a link opens only where it was issued (a
//     demo). The PathScribe API server takes this over to the contract in
//     docs/architecture/CONSULT_ACCESS_API.md (built by the India team).
//     Until then, don't send a link to a real outside party.
// ─────────────────────────────────────────────────────────────────────────────

import { ServiceResult, ID } from '../types';
import { consultLinkLifetime } from './consultLinkLifetime';

export interface ConsultTokenScope {
  caseId: string;
  /** Cached, PHI-free display value — real, existing AccessionMetadata.
   *  accessionNumber. Carried here (not re-looked-up) so the issued-links
   *  list and the audit trail can both show/log a real accession without
   *  either component needing its own case fetch just to render a label. */
  caseAccessionNumber: string;
  /** Optional fine-grained narrowing — undefined/empty means full-case
   *  access, per the spec's own "defaulting to full case context." Real
   *  StainOrder.id values (a "slide" in this app's own data model), not a
   *  separate identifier space. */
  slideIds?: string[];
}

export type ConsultTokenStatus = 'Active' | 'Expired' | 'Revoked';

export interface ConsultToken {
  id: ID;
  /** Batch 522: the SHA-256 fingerprint of the bearer token (consultTokenCrypto.ts).
   *  The token itself is never stored; issue() returns it once. */
  tokenHash: string;
  scope: ConsultTokenScope;
  issuedByUserId: string;
  issuedByName: string;
  issuedAt: string;
  expiresAt: string;
  isActive: boolean;
  revokedAt?: string;
  revokedByUserId?: string;
  revokedByName?: string;
  /** Batch 522: when the link's expiry was recorded in the audit log (once). */
  expiryRecordedAt?: string;
  /** Free text — who this was issued to. There is no real external-
   *  identity model anywhere in this codebase to attach it to instead
   *  (confirmed by direct search before building this). */
  consultantIdentifier: string;
  consultantOrganization?: string;
  note?: string;
  /** Batch 669 (access-11): the issuer opted in to showing the consultant the patient's full name and
   *  date of birth (needs case:consult-link:reveal-identity). Absent or false: the page shows a masked identity. */
  revealIdentity?: boolean;
  lastAccessedAt?: string;
  accessCount: number;
  /** Batch 669 (consultLinkLifetime.ts): when a Signed opinion was accepted on this link. A Draft never sets it. */
  signedAt?: string;
  /** Batch 669: opens counted since the signature (the Signed submit itself is not one). */
  viewsAfterSignature?: number;
}

export type NewConsultToken = Pick<
  ConsultToken,
  'scope' | 'issuedByUserId' | 'issuedByName' | 'consultantIdentifier' | 'consultantOrganization' | 'note' | 'revealIdentity'
> & {
  /** Caller-supplied override of the default 24h/72h-weekend lifespan —
   *  see computeDefaultConsultTokenExpiry.ts. Optional; issue() applies
   *  the real default when omitted. */
  expiresAt?: string;
};

/** Phase 1 (Hybrid) payload — free-text opinion + structured metadata,
 *  per spec §3. Phase 2 (mapping a diagnosticCategory selection directly
 *  into the real concordance engine, recordAiHumanConcordance.ts's own
 *  shape) is a deliberate, disclosed scope cut for this pass — see this
 *  domain's own README. */
export type ConsultOpinionSignedStatus = 'Draft' | 'Signed';

export interface ConsultOpinion {
  id: ID;
  tokenId: ID;
  caseId: string;
  consultantIdentifier: string;
  diagnosticCategory?: string;
  signedStatus: ConsultOpinionSignedStatus;
  opinionText: string;
  submittedAt: string;
  /** Batch 439 (PS-148): the pathologist's assessment of this opinion against
   *  the case, recorded once (see outsideConsultRules.ts). */
  assessment?: import('./outsideConsultRules').OutsideConsultAssessment;
  assessmentNote?: string;
  assessedBy?: { userId: string; userName: string };
  assessedAt?: string;
  /** The report was already released when assessed (a major discordance then recommends a CAPA). */
  assessedAfterRelease?: boolean;
  qaRecordId?: string;
}

/** Batch 522: what the consultant sends. The case, the link and the
 *  consultant come from the token, never from the page. */
export interface ConsultOpinionDraft {
  diagnosticCategory?: string;
  signedStatus: ConsultOpinionSignedStatus;
  opinionText: string;
}

/** issue()'s answer: the link record and, this once, its bearer token. */
export type IssuedConsultLink = ConsultToken & { token: string };

export interface IConsultTokenService {
  /** Needs case:consult-link:issue. The answer is the only place the token appears. */
  issue(draft: NewConsultToken): Promise<ServiceResult<IssuedConsultLink>>;
  getByCaseId(caseId: string): Promise<ServiceResult<ConsultToken[]>>;
  /** Batch 522: every link on every case, newest first, for Audit Log → Consult links.
   *  Needs audit:consult-links:view. */
  listAll(): Promise<ServiceResult<ConsultToken[]>>;
  /** Looks a bearer token up by its fingerprint, without any internal
   *  session or case-access check: the token is the whole authorization for
   *  this read. Unknown, expired and revoked all answer the same
   *  CONSULT_LINK_INVALID (don't confirm which); the audit entry records
   *  which it was. Records no view (openConsult does). */
  resolve(token: string): Promise<ServiceResult<ConsultToken>>;
  /** Needs case:consult-link:revoke. The person revoking is the signed-in user.
   *  An expired or already-revoked link answers CONSULT_LINK_NOT_ACTIVE. */
  revoke(id: ID): Promise<ServiceResult<ConsultToken>>;
  /** Batch 522: the consultant opens the link. Checks the token, builds what
   *  they may see (consultLinkRules.buildConsultCaseView) and records the
   *  view, once per call. Any failure is the one CONSULT_LINK_INVALID. */
  openConsult(token: string): Promise<ServiceResult<import('./consultLinkRules').ConsultCaseView>>;
  /** Batch 669 (access-11): someone with case:consult-link:reveal-identity but not :issue reviews the
   *  unmasked patient demographics a link's consultant would see. Audited as a reveal. Needs the capability;
   *  refusals CONSULT_REVEAL_NOT_PERMITTED, NOT_FOUND. */
  previewIdentity(linkId: ID): Promise<ServiceResult<import('./consultIdentityMask').ConsultPatientView>>;
  /** Batch 522: the consultant sends an opinion. The token is checked again,
   *  so a link revoked or expired meanwhile takes nothing. Refusals:
   *  CONSULT_LINK_INVALID, OPINION_REQUIRED, OPINION_ALREADY_SIGNED. */
  submitOpinion(token: string, draft: ConsultOpinionDraft): Promise<ServiceResult<ConsultOpinion>>;
  getOpinionsByCaseId(caseId: string): Promise<ServiceResult<ConsultOpinion[]>>;
  /** Batch 439 (PS-148): the pathologist assesses a signed opinion against
   *  the case (agrees / minor difference / major discordance), once. Needs
   *  case:outside-consult:assess. Writes an "Outside Consult Correlation" QA
   *  record; a major discordance on a released report recommends a CAPA. */
  assessOpinion(id: ID, input: { assessment: import('./outsideConsultRules').OutsideConsultAssessment; note?: string }): Promise<ServiceResult<ConsultOpinion>>;
}

/** Batch 669: a link whose post-signature window or views are used up reads as Expired (consultLinkLifetime.ts). */
export function resolveConsultTokenStatus(t: Pick<ConsultToken, 'isActive' | 'expiresAt' | 'signedAt' | 'viewsAfterSignature'>): ConsultTokenStatus {
  if (!t.isActive) return 'Revoked';
  if (consultLinkLifetime(t).state !== 'open') return 'Expired';
  return 'Active';
}

/** Batch 515 (PS-290): returned by issue/revoke when the person lacks case:consult-link:issue / :revoke
 *  (Batch 522: and by listAll without audit:consult-links:view). */
export const CONSULT_LINK_NOT_PERMITTED = 'CONSULT_LINK_NOT_PERMITTED';

/** Batch 522: the service's refusal codes; screens translate them. */
export const CONSULT_LINK_INVALID = 'CONSULT_LINK_INVALID';
export const CONSULT_LINK_NOT_ACTIVE = 'CONSULT_LINK_NOT_ACTIVE';
/** Batch 669: the issuer asked to show the full identity without case:consult-link:reveal-identity. No link is created. */
export const CONSULT_REVEAL_NOT_PERMITTED = 'CONSULT_REVEAL_NOT_PERMITTED';
export const CONSULT_CASE_REQUIRED = 'CONSULT_CASE_REQUIRED';
export const CONSULTANT_REQUIRED = 'CONSULTANT_REQUIRED';
