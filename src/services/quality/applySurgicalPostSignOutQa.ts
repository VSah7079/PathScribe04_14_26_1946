// src/services/quality/applySurgicalPostSignOutQa.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-324. The real, post-sign-out orchestration wiring the two new
// generic-engine consumers into an actual surgical case sign-out:
//   1. Post-sign-out peer review SELECTION (PS-117's generic engine +
//      this ticket's own subspecialty risk-weighting layer).
//   2. Biopsy-to-resection correlation CANDIDATE DETECTION
//      (resolveSurgicalBiopsyToResectionCorrelationCandidates.ts).
// Neither one performs the actual review/comparison itself — both are
// real, mechanical "flag it for a human" side effects, matching every
// other real boundary this session has drawn between automatable
// case-selection and non-automatable diagnostic judgment.
//
// Isolation from useSignOutWorkflow.ts's own knownVersionRef machinery:
// this runs fire-and-forget alongside the sign-out's own version-checked
// writes, so it never uses knownVersionRef.current (that would risk a
// spurious ConcurrencyConflictError on the sign-out's critical writes).
// PS-71 (Batch 458): it no longer saves without a version either. It
// decides what to add (the peer-review flag, the new correlation
// candidates), then saves through updateCaseWithRetry: the case is read,
// the additions are applied to THAT read and saved with its version; if
// the sign-out (or anyone) saved in between, it reads again and re-applies
// them, so nothing they saved is overwritten. A save that still conflicts
// after the retries is logged and dropped (a background flag, never the
// sign-out itself).
// ─────────────────────────────────────────────────────────────────────────────

import { getEffectiveBiopsyResectionRule } from './biopsyResectionCorrelationSettings';
import { caseRouter } from '@/services/cases/CaseRouter';
import { intraoperativeService } from '@/services';
import { mockSpecimenDictionaryService } from '@/services/specimenDictionary/mockSpecimenDictionaryService';
import { mockQaActivityTypeService, SURGICAL_PEER_REVIEW_ACTIVITY_TYPE_ID } from './mockQaActivityTypeService';
import { mockSurgicalPeerReviewRiskWeightService } from './mockSurgicalPeerReviewRiskWeightService';
import { resolveQaCaseSelectionContext } from './resolveQaCaseSelectionContext';
import { evaluateQaTargetedSelectionRule } from './evaluateQaTargetedSelectionRule';
import { resolveSurgicalPeerReviewSelectionForCase } from './resolveSurgicalPeerReviewSelectionForCase';
import {
  resolveSurgicalBiopsyToResectionCorrelationCandidates,
  type SurgicalBiopsySpecimenInfo,
} from './resolveSurgicalBiopsyToResectionCorrelationCandidates';
import type { Case } from '@/types/case/Case';
import type { Specimen } from '@/types/case/Specimen';
import { updateCaseWithRetry, type CaseWriteDeps } from '@/services/cases/caseWrite';

type SurgicalCandidateEntry = { candidateCaseId: string; candidateSpecimenId: string; detectedAt: string; siteMatchStatus: unknown };

/** The flag and candidates decided for the case, applied to `current`
 *  (the case as read for the save). Null when it already has them all. */
export function applySurgicalQaAdditions(
  current: Case,
  additions: { peerFlag?: { specimenId: string; flag: { reason: string; flaggedAt: string } }; candidates: Map<string, SurgicalCandidateEntry[]> },
): Partial<Case> | null {
  let changed = false;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const specimens = (current.specimens ?? []).map(s => {
    let next: any = s;
    const pf = additions.peerFlag;
    if (pf && s.id === pf.specimenId && !s.surgicalPeerReview?.postSignOutPeerReviewFlag) {
      next = { ...next, surgicalPeerReview: { ...next.surgicalPeerReview, postSignOutPeerReviewFlag: pf.flag } };
    }
    const entries = additions.candidates.get(s.id) ?? [];
    if (entries.length) {
      const existing: any[] = next.surgicalPeerReview?.biopsyToResectionCandidates ?? [];
      const fresh = entries.filter(n => !existing.some(e => e.candidateCaseId === n.candidateCaseId && e.candidateSpecimenId === n.candidateSpecimenId));
      if (fresh.length) next = { ...next, surgicalPeerReview: { ...next.surgicalPeerReview, biopsyToResectionCandidates: [...existing, ...fresh] } };
    }
    if (next !== s) changed = true;
    return next as Specimen;
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return changed ? { specimens } : null;
}

const caseWriteDeps: CaseWriteDeps = {
  getCase: id => caseRouter.getCase(id),
  updateCase: (id, updates, expectedVersion) => caseRouter.updateCase(id, updates, expectedVersion),
};

/** Real, per this file's own header: a specimen counts as "surgical"
 *  for biopsy-to-resection correlation purposes when its dictionary
 *  entry is anything OTHER than Cytology/FNA — the direct complement
 *  of the exact check CytologyScreeningPage.tsx's own histology-
 *  correlation detection already uses to identify a NON-cytology
 *  specimen, reused here rather than a second, differently-drawn
 *  line. A specimen with no resolvable dictionary entry is treated as
 *  surgical by default — same real "don't silently hide a real
 *  candidate" posture that file's own comment already documents for
 *  its own, inverse case. */
function isSurgicalSpecimen(specimen: Specimen, dictById: Map<string, { type: string }>): boolean {
  const entry = specimen.specimenDictionaryEntryId ? dictById.get(specimen.specimenDictionaryEntryId) : undefined;
  return !(entry && (entry.type === 'Cytology' || entry.type === 'FNA'));
}

/** When the case was signed out, if it was. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const signedOutAtOf = (c: any): string | undefined => c?.finalizedAt ?? undefined;

function toBiopsySpecimenInfo(caseId: string, specimen: Specimen, signedOutAt?: string): SurgicalBiopsySpecimenInfo | undefined {
  if (!specimen.receivedAt && !specimen.collectedAt) return undefined; // no real date to window against
  return {
    caseId,
    specimenId: specimen.id,
    receivedAt: specimen.receivedAt,
    // Batch 453: the window starts at collection by default (configurable).
    collectedAt: specimen.collectedAt,
    signedOutAt,
    bodySite: specimen.collection?.bodySite,
    laterality: specimen.collection?.laterality,
  };
}

/**
 * Real, per direct guidance (PS-324): runs both real post-sign-out QA
 * side effects for one just-signed-out surgical case. Deliberately
 * takes only `caseId` — re-fetches everything else fresh rather than
 * trusting a caller's possibly-stale `Case` object, since this always
 * runs after the case's own real sign-out state transition has
 * already been persisted.
 */
export async function applySurgicalPostSignOutQa(caseId: string): Promise<void> {
  const caseRes = await caseRouter.getCase(caseId);
  if (!caseRes) return;
  const freshCase = caseRes as Case;
  const specimens = freshCase.specimens ?? [];
  if (specimens.length === 0) return;

  let peerFlag: { specimenId: string; flag: { reason: string; flaggedAt: string } } | undefined;
  const candidatesBySpecimen = new Map<string, SurgicalCandidateEntry[]>();

  // ── 1. Post-sign-out peer review selection (PS-117 + PS-324 weighting) ──
  const representativeSpecimen = specimens[0];
  if (representativeSpecimen && !representativeSpecimen.surgicalPeerReview?.postSignOutPeerReviewFlag) {
    const [activityTypesRes, weightsRes, intraopRes] = await Promise.all([
      mockQaActivityTypeService.getAll(),
      mockSurgicalPeerReviewRiskWeightService.getAll(),
      intraoperativeService.getAll(),
    ]);
    const peerReviewActivityType = activityTypesRes.ok
      ? activityTypesRes.data.find(t => t.id === SURGICAL_PEER_REVIEW_ACTIVITY_TYPE_ID && t.active)
      : undefined;

    if (peerReviewActivityType && intraopRes.ok) {
      const context = resolveQaCaseSelectionContext(caseId, intraopRes.data);
      const targeted = evaluateQaTargetedSelectionRule(peerReviewActivityType.targetedSelectionRule, context);
      const weights = weightsRes.ok ? weightsRes.data : [];
      const selected = targeted || resolveSurgicalPeerReviewSelectionForCase(
        peerReviewActivityType.samplingPercentage, weights, freshCase.subspecialtyId,
      );

      if (selected) {
        const flaggedAt = new Date().toISOString();
        peerFlag = { specimenId: representativeSpecimen.id, flag: { reason: targeted ? 'targeted_high_risk' : 'random_selection', flaggedAt } };
      }
    }
  }

  // ── 2. Biopsy-to-resection correlation candidate detection ──────────────
  const dictRes = await mockSpecimenDictionaryService.getAll();
  const dictById = new Map((dictRes.ok ? dictRes.data : []).map(e => [e.id, e]));
  const thisCaseSurgicalSpecimens = specimens.filter(s => isSurgicalSpecimen(s, dictById));

  if (thisCaseSurgicalSpecimens.length > 0) {
    const allCasesRes = await caseRouter.getAll();
    if (allCasesRes.ok) {
      const otherPatientSpecimens: SurgicalBiopsySpecimenInfo[] = [];
      for (const c of allCasesRes.data) {
        if (c.id === caseId || c.patient?.id !== freshCase.patient?.id) continue;
        for (const sp of c.specimens ?? []) {
          if (!isSurgicalSpecimen(sp, dictById)) continue;
          const info = toBiopsySpecimenInfo(c.id, sp, signedOutAtOf(c));
          if (info) otherPatientSpecimens.push(info);
        }
      }

      const thisCaseInfos = thisCaseSurgicalSpecimens
        .map(s => toBiopsySpecimenInfo(caseId, s, signedOutAtOf(freshCase)))
        .filter((s): s is SurgicalBiopsySpecimenInfo => s !== undefined);

      // Batch 453: the configured window for this case's facility.
      const rule = await getEffectiveBiopsyResectionRule(freshCase.order?.facilityId);
      const candidates = resolveSurgicalBiopsyToResectionCorrelationCandidates(
        [...thisCaseInfos, ...otherPatientSpecimens],
        rule,
      );

      // Real, deliberate scope: only ever write NEW candidates onto
      // THIS case's own specimens — a historical other-patient case
      // already had its own chance to detect and record this same
      // pair from its own sign-out, matching CytologyScreeningPage.tsx's
      // own "update only the current specimen" convention exactly.
      const relevantToThisCase = candidates.filter(c => c.earlierCaseId === caseId || c.laterCaseId === caseId);
      if (relevantToThisCase.length > 0) {
        const now = new Date().toISOString();
        for (const s of specimens) {
          const ownCandidates = relevantToThisCase.filter(c =>
            (c.earlierCaseId === caseId && c.earlierSpecimenId === s.id) ||
            (c.laterCaseId === caseId && c.laterSpecimenId === s.id),
          );
          if (ownCandidates.length === 0) continue;
          const existing = s.surgicalPeerReview?.biopsyToResectionCandidates ?? [];
          const newEntries = ownCandidates
            .map(c => {
              const isEarlier = c.earlierCaseId === caseId && c.earlierSpecimenId === s.id;
              const candidateCaseId = isEarlier ? c.laterCaseId : c.earlierCaseId;
              const candidateSpecimenId = isEarlier ? c.laterSpecimenId : c.earlierSpecimenId;
              return { candidateCaseId, candidateSpecimenId, detectedAt: now, siteMatchStatus: c.siteMatchStatus };
            })
            .filter(n => !existing.some(e => e.candidateCaseId === n.candidateCaseId && e.candidateSpecimenId === n.candidateSpecimenId));
          if (newEntries.length) candidatesBySpecimen.set(s.id, newEntries);
        }
      }
    }
  }

  if (peerFlag || candidatesBySpecimen.size > 0) {
    // PS-71 (Batch 458): applied to the case as read for the save, with its
    // version; re-applied to the newer case on a conflict (header above).
    try {
      const r = await updateCaseWithRetry(caseId, current => applySurgicalQaAdditions(current, { peerFlag, candidates: candidatesBySpecimen }), caseWriteDeps);
      if (r.ok === false && r.reason === 'conflict') console.error(`[PS-71] Surgical post-sign-out QA flags for ${caseId} not saved: the case kept changing (${r.attempts} tries).`);
    } catch (e) {
      console.error('[PS-324] Could not persist surgical post-sign-out QA flags — a real, non-blocking background write, never the sign-out itself:', e);
    }
  }
}
