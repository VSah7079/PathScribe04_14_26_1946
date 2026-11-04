// src/services/consultAccess/consultLinkRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 522 (PS-290): the decisions behind an outside consult link, kept pure
// so they are tested directly and the API server can match them
// (docs/architecture/CONSULT_ACCESS_API.md).
//
//   - The link carries its token after `#`, never in the path. A browser does
//     not send the part after `#` to any server, so the token stays out of
//     web-server, proxy and CDN logs and out of the Referer header.
//   - What the consultant sees is built here, not in the page: the case's
//     accession and patient, and only the specimens and slides the link
//     covers (minimum necessary). A slide-scoped link shows only the
//     specimens those slides come from.
//   - Batch 669 (access-11): the patient is MASKED by default (initials, birth
//     year only); the full name and date of birth only when the link was issued
//     with the audited identity opt-in (consultIdentityMask.ts).
//   - One signed opinion per link. A signed opinion is final; drafts may be
//     sent until then. Batch 669: a Signed opinion no longer closes the link at
//     once; it opens 3 more views / 48 hours (consultLinkLifetime.ts).
//   - An expired link is recorded once, as its own audit event.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { ConsultToken, ConsultOpinion, ConsultOpinionSignedStatus } from './IConsultTokenService';
import { resolveConsultTokenStatus } from './IConsultTokenService';
import { CONSULT_TOKEN_PATTERN } from './consultTokenCrypto';
import { consultPatientView, type ConsultPatientView } from './consultIdentityMask';
import { consultLinkLifetime } from './consultLinkLifetime';

/** The address sent to the consultant. */
export function consultLinkUrl(origin: string, token: string): string {
  return `${origin}/consult#${token}`;
}

/** The token from the page address: after `#` (Batch 522 links), else from the path (links issued before). */
export function consultTokenFromLocation(pathToken: string | undefined, hash: string): string | null {
  const fromHash = hash.replace(/^#/, '').trim();
  const token = fromHash || pathToken?.trim() || '';
  return token || null;
}

/** Whether a string has the shape of a Batch 522 token (older links are looked up as they are). */
export const looksLikeConsultToken = (token: string) => CONSULT_TOKEN_PATTERN.test(token);

export interface ConsultSlideView { id: string; label: string }
export interface ConsultSpecimenView { id: string; label: string; description: string }

/** What the outside consultant sees: nothing outside the link's scope. */
export interface ConsultCaseView {
  linkId: string;
  accessionNumber: string;
  /** Batch 669 (access-11): masked unless the link was issued with the identity opt-in (consultIdentityMask.ts). */
  patient: ConsultPatientView;
  specimens: ConsultSpecimenView[];
  slides: ConsultSlideView[];
  /** The number of slides the link names; 0 for the whole case. */
  scopedSlideCount: number;
  expiresAt: string;
  /** A signed opinion has been sent on this link, so it takes no more. */
  opinionSigned: boolean;
  /** Batch 669: after a signature, what is left of the link (views, hours) for the banner; null before one. The server works these out. */
  lifetime: { remainingViews: number; hoursRemaining: number } | null;
}

export function buildConsultCaseView(caseRecord: Case, link: ConsultToken, opinions: readonly ConsultOpinion[], now: Date = new Date()): ConsultCaseView {
  const life = consultLinkLifetime(link, now);
  const named = link.scope.slideIds?.length ? new Set(link.scope.slideIds) : null;
  const specimens: ConsultSpecimenView[] = [];
  const slides: ConsultSlideView[] = [];
  for (const sp of caseRecord.specimens ?? []) {
    let inScope = !named;
    for (const block of sp.blocks ?? []) {
      for (const stain of block.stains ?? []) {
        if (named && !named.has(stain.id)) continue;
        inScope = true;
        slides.push({ id: stain.id, label: `${sp.label}-${block.label} · ${stain.stainName}` });
      }
    }
    if (inScope) specimens.push({ id: sp.id, label: sp.label, description: sp.description ?? '' });
  }
  return {
    linkId: link.id,
    accessionNumber: caseRecord.accession?.accessionNumber ?? link.scope.caseAccessionNumber,
    patient: consultPatientView(caseRecord.patient, link.revealIdentity),
    specimens,
    slides,
    scopedSlideCount: link.scope.slideIds?.length ?? 0,
    expiresAt: link.expiresAt,
    opinionSigned: opinions.some(o => o.tokenId === link.id && o.signedStatus === 'Signed'),
    lifetime: life.signed ? { remainingViews: life.remainingViews ?? 0, hoursRemaining: life.hoursRemaining } : null,
  };
}

export type ConsultOpinionProblem = 'OPINION_REQUIRED' | 'OPINION_ALREADY_SIGNED';

/** Why an opinion can't be accepted on this link, or null. */
export function consultOpinionProblem(
  draft: { opinionText: string; signedStatus: ConsultOpinionSignedStatus },
  linkOpinions: readonly Pick<ConsultOpinion, 'signedStatus'>[],
): ConsultOpinionProblem | null {
  if (linkOpinions.some(o => o.signedStatus === 'Signed')) return 'OPINION_ALREADY_SIGNED';
  if (!draft.opinionText.trim()) return 'OPINION_REQUIRED';
  return null;
}

/** Links past their expiry whose expiry hasn't been recorded yet (revoked links ended earlier, so they're not counted). */
export function unrecordedExpiries<T extends Pick<ConsultToken, 'isActive' | 'expiresAt' | 'expiryRecordedAt' | 'signedAt' | 'viewsAfterSignature'>>(links: readonly T[], now: Date): T[] {
  return links.filter(l => l.isActive && !l.expiryRecordedAt && consultLinkLifetime(l, now).state !== 'open');
}

/** Audit Log → Consult links: the active links only, or every link. */
export function consultLinksShown<T extends Pick<ConsultToken, 'isActive' | 'expiresAt' | 'signedAt' | 'viewsAfterSignature'>>(links: readonly T[], activeOnly: boolean): T[] {
  return activeOnly ? links.filter(l => resolveConsultTokenStatus(l) === 'Active') : [...links];
}

/** Newest first, by issue time. */
export function newestConsultLinksFirst<T extends Pick<ConsultToken, 'issuedAt'>>(links: readonly T[]): T[] {
  return [...links].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

/** Batch 669 (access-11): the confirmation a consultant sees after sending. A signed opinion is
 *  recorded and returned; a draft is only saved and has NOT been returned to the requester. */
export function consultSubmitConfirmationKey(signedStatus: ConsultOpinionSignedStatus): string {
  return signedStatus === 'Signed'
    ? 'externalConsultViewPage.opinionSubmittedConfirmation'
    : 'externalConsultViewPage.draftSavedConfirmation';
}
