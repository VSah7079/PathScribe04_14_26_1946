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
//   - One signed opinion per link. A signed opinion is final; drafts may be
//     sent until then.
//   - An expired link is recorded once, as its own audit event.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { ConsultToken, ConsultOpinion, ConsultOpinionSignedStatus } from './IConsultTokenService';
import { resolveConsultTokenStatus } from './IConsultTokenService';
import { CONSULT_TOKEN_PATTERN } from './consultTokenCrypto';

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
  patient: { lastName: string; firstName: string; dateOfBirth?: string };
  specimens: ConsultSpecimenView[];
  slides: ConsultSlideView[];
  /** The number of slides the link names; 0 for the whole case. */
  scopedSlideCount: number;
  expiresAt: string;
  /** A signed opinion has been sent on this link, so it takes no more. */
  opinionSigned: boolean;
}

export function buildConsultCaseView(caseRecord: Case, link: ConsultToken, opinions: readonly ConsultOpinion[]): ConsultCaseView {
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
    patient: {
      lastName: caseRecord.patient?.lastName ?? '',
      firstName: caseRecord.patient?.firstName ?? '',
      ...(caseRecord.patient?.dateOfBirth ? { dateOfBirth: caseRecord.patient.dateOfBirth } : {}),
    },
    specimens,
    slides,
    scopedSlideCount: link.scope.slideIds?.length ?? 0,
    expiresAt: link.expiresAt,
    opinionSigned: opinions.some(o => o.tokenId === link.id && o.signedStatus === 'Signed'),
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
export function unrecordedExpiries<T extends Pick<ConsultToken, 'isActive' | 'expiresAt' | 'expiryRecordedAt'>>(links: readonly T[], now: Date): T[] {
  return links.filter(l => l.isActive && !l.expiryRecordedAt && new Date(l.expiresAt).getTime() <= now.getTime());
}

/** Audit Log → Consult links: the active links only, or every link. */
export function consultLinksShown<T extends Pick<ConsultToken, 'isActive' | 'expiresAt'>>(links: readonly T[], activeOnly: boolean): T[] {
  return activeOnly ? links.filter(l => resolveConsultTokenStatus(l) === 'Active') : [...links];
}

/** Newest first, by issue time. */
export function newestConsultLinksFirst<T extends Pick<ConsultToken, 'issuedAt'>>(links: readonly T[]): T[] {
  return [...links].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}
