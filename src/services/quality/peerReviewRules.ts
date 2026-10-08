// src/services/quality/peerReviewRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-144 (Batch 439): the decisions behind peer review before sign-out.
// Pure; tested in peerReviewRules.test.ts. See types/quality/PeerReview.ts
// for Pete's decisions.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PeerReviewGateSettings, PeerReviewOverride, PeerReviewOverrideReason, PeerReviewRequest, PersonRef,
} from '@/types/quality/PeerReview';
import type { QaActivityRecord, QaDiscordanceSeverity } from '@/types/quality/QaActivityRecord';
import type { RecordedClinicalHistoryEntry } from '@/types/clinicalHistory/RecordedClinicalHistoryEntry';
import { roleIdsForNames, type CatalogRole } from '../roles/systemRoles';

const PATHOLOGIST_ROLE_ID = 'pathologist';

export const PRE_SIGN_OUT_PEER_REVIEW_ACTIVITY_TYPE_ID = 'qa-activity-pre-signout-peer-review';

// ── Malignancy in text ──────────────────────────────────────────────────────

const MALIGNANT_TERM = /\b(adenocarcinoma|carcinoma|sarcoma|lymphoma|melanoma|leuka?emia|myeloma|mesothelioma|seminoma|glioblastoma|neuroblastoma|blastoma|malignan\w*|metastat\w*|metastas[ie]s)\b/gi;
/** A term preceded (in the same clause) by one of these is not an established malignancy. */
const NOT_ESTABLISHED = /\b(no|not|negative for|without|free of|absence of|no evidence of|rule out|r\/o|ruled out|suspicious for|suspect|possible|cannot exclude|to exclude)\b[^.;:]*$/i;

/**
 * Whether diagnosis text states an established malignancy. Negated and
 * tentative mentions ("negative for carcinoma", "rule out lymphoma",
 * "suspicious for melanoma") don't count. Used on prior cases' diagnoses
 * and the order's clinical indication, never as the only signal for the
 * current case (that is the pathologist's own confirmed finding).
 */
export function statesMalignancy(text: string | undefined | null): boolean {
  if (!text) return false;
  for (const m of text.matchAll(MALIGNANT_TERM)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 60), m.index ?? 0);
    if (!NOT_ESTABLISHED.test(before)) return true;
  }
  return false;
}

/** Whether text mentions a malignancy at all, even to rule it out ("r/o lymphoma"): the clinician was considering one. */
export function mentionsMalignancy(text: string | undefined | null): boolean {
  return !!text && new RegExp(MALIGNANT_TERM.source, 'i').test(text);
}

export interface PriorCaseForMalignancy {
  id: string;
  abnormalDetectionStatus?: { severity: 'Abnormal' | 'Critical' | 'Malignant' } | null;
  diagnostic?: { primaryDiagnosis?: string };
}

export function priorCaseIsMalignant(c: PriorCaseForMalignancy): boolean {
  return c.abnormalDetectionStatus?.severity === 'Malignant' || statesMalignancy(c.diagnostic?.primaryDiagnosis);
}

export type FirstTimeMalignancyReason = 'not-malignant' | 'prior-malignant-case' | 'known-from-history' | 'first-time';

/**
 * Pete (Oct 2): "first-time malignancy" is judged from the patient's prior
 * cases. Also not first-time when the order's clinical history records a
 * known malignancy (category MAL_STAGE) or its indication states one.
 */
export function firstTimeMalignancy(input: {
  malignantNow: boolean;
  priorCases: readonly PriorCaseForMalignancy[];
  clinicalIndication?: string;
  clinicalHistory?: readonly RecordedClinicalHistoryEntry[];
}): { firstTime: boolean; reason: FirstTimeMalignancyReason; priorMalignantCaseIds: string[] } {
  if (!input.malignantNow) return { firstTime: false, reason: 'not-malignant', priorMalignantCaseIds: [] };
  const priorMalignantCaseIds = input.priorCases.filter(priorCaseIsMalignant).map(c => c.id);
  if (priorMalignantCaseIds.length > 0) return { firstTime: false, reason: 'prior-malignant-case', priorMalignantCaseIds };
  const knownFromHistory = (input.clinicalHistory ?? []).some(e => e.categoryCode === 'MAL_STAGE') || statesMalignancy(input.clinicalIndication);
  if (knownFromHistory) return { firstTime: false, reason: 'known-from-history', priorMalignantCaseIds: [] };
  return { firstTime: true, reason: 'first-time', priorMalignantCaseIds: [] };
}

/** Whether the case is malignant now: the pathologist's confirmed finding, or one found this session. */
export function malignantNow(
  caseData: { abnormalDetectionStatus?: { severity: string } | null },
  findings: ReadonlyArray<{ severity: string }> = [],
): boolean {
  return caseData.abnormalDetectionStatus?.severity === 'Malignant' || findings.some(f => f.severity === 'Malignant');
}

// ── Settings ────────────────────────────────────────────────────────────────

export const DEFAULT_PEER_REVIEW_GATE_SETTINGS: PeerReviewGateSettings = { orgDefault: false, facilities: {}, subspecialties: {} };

/** Most specific wins: subspecialty (department), then facility, then the organisation (off by default). */
export function peerReviewGateOn(settings: PeerReviewGateSettings, facilityId?: string, subspecialtyId?: string): boolean {
  if (subspecialtyId && settings.subspecialties[subspecialtyId] !== undefined) return settings.subspecialties[subspecialtyId];
  if (facilityId && settings.facilities[facilityId] !== undefined) return settings.facilities[facilityId];
  return settings.orgDefault;
}

export type GateChoice = 'inherit' | 'on' | 'off';

/** The facilities the gate is set for: performing labs (a case's lab is resolved from its ordering facility). */
export function performingLabs(facilities: ReadonlyArray<{ id: string; name: string; roles?: readonly string[] }>): { id: string; name: string }[] {
  return facilities.filter(f => (f.roles ?? []).includes('performing_lab')).map(f => ({ id: f.id, name: f.name }));
}

/** A facility's or department's own setting, for the Configuration screen. */
export function gateChoice(settings: PeerReviewGateSettings, kind: 'facilities' | 'subspecialties', id: string): GateChoice {
  const v = settings[kind][id];
  return v === undefined ? 'inherit' : v ? 'on' : 'off';
}

/** The settings with one facility's or department's choice applied ('inherit' removes its own setting). */
export function withGateChoice(settings: PeerReviewGateSettings, kind: 'facilities' | 'subspecialties', id: string, choice: GateChoice): PeerReviewGateSettings {
  const next = { ...settings[kind] };
  if (choice === 'inherit') delete next[id]; else next[id] = choice === 'on';
  return { ...settings, [kind]: next };
}

/** What changed, in literal English for the audit log; null when nothing did. */
export function peerReviewGateSettingsChange(before: PeerReviewGateSettings, after: PeerReviewGateSettings): string | null {
  const parts: string[] = [];
  const onOff = (v: boolean | undefined) => (v === undefined ? 'inherits' : v ? 'on' : 'off');
  if (before.orgDefault !== after.orgDefault) parts.push(`organisation default ${onOff(before.orgDefault)} → ${onOff(after.orgDefault)}`);
  for (const [label, a, b] of [['facility', before.facilities, after.facilities], ['department', before.subspecialties, after.subspecialties]] as const) {
    for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (a[id] !== b[id]) parts.push(`${label} ${id} ${onOff(a[id])} → ${onOff(b[id])}`);
    }
  }
  return parts.length ? `Peer review sign-out gate: ${parts.join('; ')}.` : null;
}

// ── Requests ────────────────────────────────────────────────────────────────

/** A case past sign-out (or in its release buffer): a peer review is no longer asked for from the report page. */
const SIGNED_OUT_STATUSES: ReadonlySet<string> = new Set(['finalized', 'closed', 'pending-release']);
export const caseSignedOut = (status: string | undefined) => !!status && SIGNED_OUT_STATUSES.has(status);

export const isOpen = (r: Pick<PeerReviewRequest, 'status'>) => r.status === 'pending' || r.status === 'disagreement';

/** The case's latest request that wasn't withdrawn. */
export function currentRequest(requests: readonly PeerReviewRequest[], caseId: string): PeerReviewRequest | undefined {
  return requests
    .filter(r => r.caseId === caseId && r.status !== 'withdrawn')
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
}

/**
 * Pathologists who can review: active, holding the Pathologist role, and not
 * the signer. Staff records store role names ("Pathologist"), matched to the
 * role catalog by name (roles/systemRoles.roleIdsForNames).
 */
export function peerReviewerOptions(
  staff: ReadonlyArray<{ id: string; firstName: string; lastName: string; roles: readonly string[]; status?: string }>,
  primaryPathologistId: string,
  roleCatalog: readonly CatalogRole[],
): PersonRef[] {
  return staff
    .filter(s => s.status !== 'Inactive' && s.id !== primaryPathologistId && roleIdsForNames(s.roles, roleCatalog).includes(PATHOLOGIST_ROLE_ID))
    .map(s => ({ userId: s.id, userName: `${s.firstName} ${s.lastName}`.trim() || s.id }))
    .sort((a, b) => a.userName.localeCompare(b.userName));
}

export type PeerReviewProblem =
  | 'REVIEWER_REQUIRED' | 'REVIEWER_IS_SIGNER' | 'ALREADY_REQUESTED'
  | 'NOT_PENDING' | 'NOT_REVIEWER' | 'DIAGNOSIS_REQUIRED' | 'SEVERITY_REQUIRED'
  | 'NOT_IN_DISAGREEMENT' | 'NOT_A_PARTY' | 'CONSENSUS_DIAGNOSIS_REQUIRED' | 'RESOLUTION_NOTE_REQUIRED'
  | 'REASON_REQUIRED' | 'NOT_REQUESTER' | 'OVERRIDE_REASON_REQUIRED';

export function requestProblem(
  existing: readonly PeerReviewRequest[],
  input: { caseId: string; primaryPathologistId: string; reviewerId: string },
): PeerReviewProblem | null {
  if (!input.reviewerId.trim()) return 'REVIEWER_REQUIRED';
  if (input.reviewerId === input.primaryPathologistId) return 'REVIEWER_IS_SIGNER';
  if (existing.some(r => r.caseId === input.caseId && isOpen(r))) return 'ALREADY_REQUESTED';
  return null;
}

export type ReviewerRead =
  | { agrees: true; notes?: string }
  | { agrees: false; diagnosis: string; severity?: QaDiscordanceSeverity; notes?: string };

export function readProblem(request: PeerReviewRequest, actorId: string, read: ReviewerRead): PeerReviewProblem | null {
  if (request.status !== 'pending') return 'NOT_PENDING';
  if (actorId !== request.reviewer.userId) return 'NOT_REVIEWER';
  if (read.agrees === false) {
    if (!read.diagnosis.trim()) return 'DIAGNOSIS_REQUIRED';
    if (!read.severity) return 'SEVERITY_REQUIRED';
  }
  return null;
}

export type Resolution =
  | { result: 'consensus-reached'; consensusDiagnosis: string; note?: string }
  | { result: 'unresolved'; note: string };

/** Either pathologist records how the disagreement ended. */
export function resolutionProblem(request: PeerReviewRequest, actorId: string, resolution: Resolution): PeerReviewProblem | null {
  if (request.status !== 'disagreement') return 'NOT_IN_DISAGREEMENT';
  if (actorId !== request.reviewer.userId && actorId !== request.primaryPathologist.userId) return 'NOT_A_PARTY';
  if (resolution.result === 'consensus-reached' && !resolution.consensusDiagnosis.trim()) return 'CONSENSUS_DIAGNOSIS_REQUIRED';
  if (resolution.result === 'unresolved' && !resolution.note.trim()) return 'RESOLUTION_NOTE_REQUIRED';
  return null;
}

export function withdrawProblem(request: PeerReviewRequest, actorId: string, reason: string): PeerReviewProblem | null {
  if (request.status !== 'pending') return 'NOT_PENDING';
  if (actorId !== request.primaryPathologist.userId) return 'NOT_REQUESTER';
  if (!reason.trim()) return 'REASON_REQUIRED';
  return null;
}

export const OVERRIDE_REASONS: readonly PeerReviewOverrideReason[] = ['immediate-surgery', 'immediate-treatment', 'other-urgent-care'];
export const RETROSPECTIVE_REVIEW_HOURS = 24;

export function overrideProblem(reason: string | undefined, note: string | undefined): PeerReviewProblem | null {
  if (!reason || !OVERRIDE_REASONS.includes(reason as PeerReviewOverrideReason)) return 'OVERRIDE_REASON_REQUIRED';
  if (reason === 'other-urgent-care' && !note?.trim()) return 'REASON_REQUIRED';
  return null;
}

export function retrospectiveDueAt(at: Date): string {
  return new Date(at.getTime() + RETROSPECTIVE_REVIEW_HOURS * 3600000).toISOString();
}

// ── The sign-out gate ───────────────────────────────────────────────────────

export type PeerReviewGateState =
  | 'not-required'   // nothing calls for a review
  | 'clear'          // the review is complete
  | 'overridden'     // signed out ahead of it for urgent care; owed within 24 hours
  | 'needs-request'  // a first-time malignancy with no review asked for yet
  | 'pending'        // waiting for the reviewer
  | 'disagreement';  // waiting for consensus or an unresolved record

/** Where the case stands. A review someone asked for counts even without the trigger. */
export function peerReviewState(input: {
  firstTime: boolean;
  request?: PeerReviewRequest;
  overrides: readonly PeerReviewOverride[];
}): PeerReviewGateState {
  const { request } = input;
  if (request?.status === 'completed') return 'clear';
  if (!input.firstTime && !request) return 'not-required';
  if (input.overrides.length > 0) return 'overridden';
  if (!request) return 'needs-request';
  return request.status === 'disagreement' ? 'disagreement' : 'pending';
}

/** Whether sign-out stops here: only when the gate is on and the review isn't done. */
export function peerReviewBlocksSignOut(gateOn: boolean, state: PeerReviewGateState): boolean {
  return gateOn && (state === 'needs-request' || state === 'pending' || state === 'disagreement');
}

// ── The QA record a completed review writes ─────────────────────────────────

/**
 * Concordant, or discordant with consensus reached / unresolved. The
 * reviewed pathologist is the primary (PS-147 will trend on this);
 * recordedBy is the reviewer. The CAPA engine reads `consensus`:
 * reached → nothing; unresolved → a recommendation.
 */
export function qaRecordForCompletedReview(
  request: PeerReviewRequest,
  meta: { caseType: string; subspecialtyId?: string; primaryDiagnosis?: string },
): Omit<QaActivityRecord, 'id' | 'recordedAt'> {
  const agreed = request.result === 'concordant';
  return {
    activityTypeId: PRE_SIGN_OUT_PEER_REVIEW_ACTIVITY_TYPE_ID,
    caseId: request.caseId,
    caseType: meta.caseType,
    subspecialtyId: meta.subspecialtyId,
    fieldValues: {
      trigger: request.trigger,
      primaryDiagnosis: meta.primaryDiagnosis ?? '',
      reviewerDiagnosis: agreed ? (meta.primaryDiagnosis ?? '') : (request.reviewerDiagnosis ?? ''),
      ...(request.consensusDiagnosis ? { consensusDiagnosis: request.consensusDiagnosis } : {}),
    },
    outcome: agreed ? 'concordant' : 'discordant',
    ...(agreed ? {} : {
      severity: request.disagreementSeverity,
      consensus: request.result === 'unresolved' ? 'unresolved' as const : 'consensus-reached' as const,
    }),
    comments: [request.reviewerNotes, request.resolutionNote].filter(Boolean).join(' ') || undefined,
    recordedBy: request.reviewer,
    reviewedPathologist: request.primaryPathologist,
    postSignOut: false,
  };
}
