// src/services/quality/peerReviewStatus.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-144 (Batch 439): where one case stands on peer review — is it a
// first-time malignancy (from the patient's prior cases), is the gate on for
// its facility and department, what has been asked for, and does sign-out
// stop. The report page's banner and the sign-out gate both read this, so
// they can't disagree. Dependencies are passed in (tested without mocks).
// ─────────────────────────────────────────────────────────────────────────────

import type { PeerReviewOverride, PeerReviewRequest } from '@/types/quality/PeerReview';
import type { RecordedClinicalHistoryEntry } from '@/types/clinicalHistory/RecordedClinicalHistoryEntry';
import {
  currentRequest, firstTimeMalignancy, malignantNow, peerReviewBlocksSignOut, peerReviewState,
  type FirstTimeMalignancyReason, type PeerReviewGateState, type PriorCaseForMalignancy,
} from './peerReviewRules';

export interface CaseForPeerReview {
  id: string;
  /** The case's tenant (a legacy id an enterprise facility lists); the fallback when the ordering facility names no lab. */
  originHospitalId?: string;
  subspecialtyId?: string;
  patient?: { id?: string };
  abnormalDetectionStatus?: { severity: 'Abnormal' | 'Critical' | 'Malignant'; confirmedAt?: string } | null;
  /** facilityId: the ordering facility; the gate is set per performing lab. */
  order?: { facilityId?: string; clinicalIndication?: string; clinicalHistory?: RecordedClinicalHistoryEntry[] };
}

export interface PeerReviewStatusDeps {
  getForCase(caseId: string): Promise<{ requests: PeerReviewRequest[]; overrides: PeerReviewOverride[] }>;
  gateOnFor(facilityId?: string, subspecialtyId?: string): Promise<boolean>;
  /** The lab that performs (and signs out) cases for an ordering facility. */
  performingLabFor(orderingFacilityId: string | undefined, tenantId: string | undefined): Promise<string | undefined>;
  /** Every case of this patient and the identities confirmed to be the same person. */
  priorCases(patientId: string, excludeCaseId: string): Promise<PriorCaseForMalignancy[]>;
}

export interface PeerReviewStatus {
  state: PeerReviewGateState;
  gateOn: boolean;
  blocksSignOut: boolean;
  firstTime: boolean;
  reason: FirstTimeMalignancyReason;
  request?: PeerReviewRequest;
  overrides: PeerReviewOverride[];
}

export async function loadPeerReviewStatus(
  caseData: CaseForPeerReview,
  findings: ReadonlyArray<{ severity: string }>,
  deps: PeerReviewStatusDeps,
): Promise<PeerReviewStatus> {
  const malignant = malignantNow(caseData, findings);
  const [{ requests, overrides }, gateOn, priorCases] = await Promise.all([
    deps.getForCase(caseData.id),
    deps.performingLabFor(caseData.order?.facilityId, caseData.originHospitalId).then(labId => deps.gateOnFor(labId, caseData.subspecialtyId)),
    malignant && caseData.patient?.id ? deps.priorCases(caseData.patient.id, caseData.id) : Promise.resolve([]),
  ]);
  const first = firstTimeMalignancy({
    malignantNow: malignant,
    priorCases,
    clinicalIndication: caseData.order?.clinicalIndication,
    clinicalHistory: caseData.order?.clinicalHistory,
  });
  const request = currentRequest(requests, caseData.id);
  const state = peerReviewState({ firstTime: first.firstTime, request, overrides });
  return {
    state, gateOn, blocksSignOut: peerReviewBlocksSignOut(gateOn, state),
    firstTime: first.firstTime, reason: first.reason, request, overrides,
  };
}
