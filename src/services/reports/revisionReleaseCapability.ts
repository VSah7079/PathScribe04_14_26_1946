// src/services/reports/revisionReleaseCapability.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649: releasing a revision of a signed surgical report needs the capability for its kind, one per distinct
// action (Pete: no blanket flags):
//   amendment   surgical:amendment:release   (the diagnosis changed; clinician notification required)
//   correction  surgical:correction:release  (no diagnostic change)
//   addendum    surgical:addendum:release    (added information)
// Checked (and audited) by mockAmendmentService.release before anything is written; the API server makes the same
// check (docs/architecture/AUTHORIZATION_API.md). Cytology revisions have their own (cytology:report:correct/addend).
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import type { AmendmentType } from '@/types/reports/AmendmentRecord';
import type { CapabilityDecision } from '../authorization/evaluateCapability';

export type RevisionEnforce = (capability: string, context?: { caseId?: string | null }) => Promise<Pick<CapabilityDecision, 'allowed'>>;

/** Whether this person may release a revision of this kind on this case (checked and audited). */
export async function enforceRevisionRelease(type: AmendmentType, caseId: string, enforce: RevisionEnforce): Promise<boolean> {
  const context = { caseId };
  switch (type) {
    case 'addendum': return (await enforce('surgical:addendum:release', context)).allowed;
    case 'correction': return (await enforce('surgical:correction:release', context)).allowed;
    default: return (await enforce('surgical:amendment:release', context)).allowed;
  }
}

/** The refusal shown to the person, in their language. */
export function revisionReleaseRefusal(type: AmendmentType): string {
  if (type === 'addendum') return i18n.t('caseActionPermissions.addendumRelease');
  if (type === 'correction') return i18n.t('caseActionPermissions.correctionRelease');
  return i18n.t('caseActionPermissions.amendmentRelease');
}

/** Whether a release error is this refusal (so a caller stops instead of sending the revision anyway). */
export function isRevisionReleaseRefusal(error: string | undefined): boolean {
  return !!error && (['addendum', 'correction', 'amendment'] as const).some(type => revisionReleaseRefusal(type) === error);
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch 649 (front end): which kinds this person may release, so the Amendment window, its entry buttons and its
// primary button grey out instead of letting the person fill the form in and be refused at the end. Presentation
// only: release() still enforces and audits. The caller supplies `has` (useCapabilities().has, already given the
// case and facility), so this stays pure.
// ─────────────────────────────────────────────────────────────────────────────
export const REVISION_KINDS: readonly AmendmentType[] = ['amendment', 'correction', 'addendum'];

export const REVISION_RELEASE_CAPABILITY: Readonly<Record<AmendmentType, string>> = {
  amendment: 'surgical:amendment:release',
  correction: 'surgical:correction:release',
  addendum: 'surgical:addendum:release',
};

export interface RevisionReleaseAvailability {
  allowed: Record<AmendmentType, boolean>;
  /** The person may release at least one kind. */
  any: boolean;
}

export function revisionReleaseAvailability(has: (capability: string) => boolean): RevisionReleaseAvailability {
  const allowed = {
    amendment: has(REVISION_RELEASE_CAPABILITY.amendment),
    correction: has(REVISION_RELEASE_CAPABILITY.correction),
    addendum: has(REVISION_RELEASE_CAPABILITY.addendum),
  };
  return { allowed, any: REVISION_KINDS.some(kind => allowed[kind]) };
}

/** The kind to show selected: the current one when permitted, else the first permitted (amendment, correction,
 *  addendum), else the current one (the window then offers no way forward). */
export function resolveRevisionKind(current: AmendmentType, availability: RevisionReleaseAvailability): AmendmentType {
  if (availability.allowed[current]) return current;
  return REVISION_KINDS.find(kind => availability.allowed[kind]) ?? current;
}

/** Why a kind is unavailable, in the person's language; undefined when it is available. */
export function revisionKindDisabledTitle(kind: AmendmentType, availability: RevisionReleaseAvailability): string | undefined {
  return availability.allowed[kind] ? undefined : revisionReleaseRefusal(kind);
}

/** Why the entry buttons are unavailable (the person may release none of the three); undefined otherwise. */
export function revisionEntryDisabledTitle(availability: RevisionReleaseAvailability): string | undefined {
  return availability.any ? undefined : i18n.t('caseActionPermissions.revisionNone');
}
