// src/services/cancerRegistry/cancerRegistryDemoSeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 456 (demo baseline): the cancer registry queue starts with
// submissions, so the Registry Exceptions worklist (Quality & Compliance)
// and the transmission audit have something to show after a Full Reset.
// Cases signed out by the Desert Valley lab (DVMC organisation), reported to
// the NAACCR (US) registry in the test environment: four from Metro General
// Hospital (c1), one from Westview Surgery Center (c4), the client whose
// prostate biopsy was amended. Dates are relative to today.
//
//   S26-4405  DCIS, right lumpectomy, signed out today: rejected,
//             recoverable (laterality not supplied). Needs action: resend.
//   S26-4490  invasive carcinoma, right mastectomy, five days ago: sent,
//             no answer in 72 hours (acknowledgement overdue).
//   S26-4633  melanoma in situ, right cheek: accepted, then the registry
//             revised the diagnosis date (revised after acceptance; Mark
//             reviewed).
//   S26-4412  prostate biopsy (Westview, c4): v1 accepted; after the
//             amendment (Grade Group 1 → 2) a v2 CORRECTION, accepted with a
//             warning. Only the latest version counts, so neither is on
//             the worklist.
//   S26-4630  invasive carcinoma, left breast core biopsy: accepted.
//
// The ids and hashes come from the real header builder, so the rows behave
// exactly like submissions the sign-out made.
// ─────────────────────────────────────────────────────────────────────────────

import type { CancerRegistryOutboundQueueEntry } from '@/types/case/CancerRegistryOutboundQueueEntry';
import type { RegistryAckOutcome, RegistryAcknowledgement, RegistryFinding, RegistryRevision } from '../registrySubmission/registryAcknowledgement';
import { buildRegistrySubmissionHeader, type PriorRegistrySubmission, type RegistrySubmissionKind } from '../registrySubmission/registrySubmissionHeader';
import { sha256Hex } from '../registrySubmission/sha256';
import { latestRegistryTemplateVersion, registryTemplateHistory } from '../registryGoLive/registryTemplateVersions';

const HOUR = 3_600_000;
const hoursAgo = (h: number) => new Date(Date.now() - h * HOUR).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);

const REGISTRY = 'naaccr_us';
const METRO_GENERAL = 'c1';
const WESTVIEW = 'c4';
const templateVersion = latestRegistryTemplateVersion(registryTemplateHistory('cancer', REGISTRY), new Date())?.version;

const STATUS_JSON: Record<RegistryAckOutcome, string> = {
  accepted: 'ACCEPTED', acceptedWithWarnings: 'ACCEPTED_WITH_WARNINGS', rejectedRecoverable: 'REJECTED_RECOVERABLE', rejectedFatal: 'REJECTED_FATAL',
};

const header = (caseId: string, signedOutAt: string, kind: RegistrySubmissionKind, prior: PriorRegistrySubmission[] = [], facilityId = METRO_GENERAL) =>
  buildRegistrySubmissionHeader({ facilityId, caseId, specimenId: 'case', registryId: REGISTRY, signOutTimestamp: signedOutAt, kind, environment: 'test', templateVersion }, prior);

/** The interface engine's normalised JSON answer, kept raw as the worklist shows it. */
const ack = (submissionGuid: string, outcome: RegistryAckOutcome, responseCode: string, receivedAt: string, findings: RegistryFinding[] = []): RegistryAcknowledgement => ({
  submissionGuid, outcome, findings, format: 'statusJson', responseCode, receivedAt,
  raw: JSON.stringify({ submissionGuid, status: STATUS_JSON[outcome], responseCode, findings }, null, 2),
});

const sent = (id: string, caseId: string, submission: CancerRegistryOutboundQueueEntry['submission'], at: string): CancerRegistryOutboundQueueEntry => ({
  id, caseId, registryId: REGISTRY, submission, contentHash: sha256Hex(`demo|${id}`),
  status: 'SENT', queuedAt: at, lastAttemptAt: at, sentAt: at, retryCount: 0, maxRetriesExceeded: false, registryStatus: 'awaitingAck',
});

// ── S26-4405: rejected, recoverable ─────────────────────────────────────────
const h4405 = header('S26-4405', hoursAgo(1), 'signOut');
const e4405: CancerRegistryOutboundQueueEntry = {
  ...sent('crq-demo-4405', 'S26-4405', h4405, hoursAgo(1)),
  registryStatus: 'rejectedRecoverable',
  acknowledgements: [ack(h4405.submissionGuid, 'rejectedRecoverable', 'AE', hoursAgo(0.5), [
    { severity: 'CRITICAL_REJECT', code: 'NAACCR-410', tier: 2, location: 'Tumor/laterality',
      message: 'Laterality (NAACCR #410) is required for a paired organ (breast, C50.x) and was not supplied.' },
    { severity: 'WARNING', code: 'NAACCR-3845', tier: 3, location: 'Tumor/gradePathological',
      message: 'Grade Pathological (NAACCR #3845) is blank; the report text states intermediate nuclear grade.' },
  ])],
};

// ── S26-4490: sent, no answer for five days ─────────────────────────────────
const h4490 = header('S26-4490', daysAgo(5), 'signOut');
const e4490: CancerRegistryOutboundQueueEntry = { ...sent('crq-demo-4490', 'S26-4490', h4490, daysAgo(5)), registryStatus: 'ackOverdue' };

// ── S26-4633: accepted, then revised by the registry ────────────────────────
const h4633 = header('S26-4633', daysAgo(157), 'signOut');
const revisedDiagnosisDate = daysAgo(172).slice(0, 10);
const revision4633: RegistryRevision = {
  receivedAt: daysAgo(2), previousStatus: 'ACCEPTED', responseCode: 'AA',
  payloadHash: sha256Hex(`demo|revision|S26-4633|${revisedDiagnosisDate}`),
  updatedFields: [{ field: 'dateOfDiagnosis', value: revisedDiagnosisDate }],
  raw: JSON.stringify({
    event: 'REGISTRY_RESPONSE_UPDATED', status: 'REVISED', submissionGuid: h4633.submissionGuid, registryId: REGISTRY,
    previousStatus: 'ACCEPTED', updatedFields: [{ field: 'dateOfDiagnosis', value: revisedDiagnosisDate }],
    note: 'Consolidated with an earlier outside shave biopsy of the same lesion.',
  }, null, 2),
};
const e4633: CancerRegistryOutboundQueueEntry = {
  ...sent('crq-demo-4633', 'S26-4633', h4633, daysAgo(157)),
  registryStatus: 'accepted',
  acknowledgements: [ack(h4633.submissionGuid, 'accepted', 'AA', daysAgo(156))],
  registryRevisions: [revision4633],
};

// ── S26-4412: v1 accepted, v2 correction accepted with a warning ────────────
const h4412v1 = header('S26-4412', daysAgo(5), 'signOut', [], WESTVIEW);
const e4412v1: CancerRegistryOutboundQueueEntry = {
  ...sent('crq-demo-4412-v1', 'S26-4412', h4412v1, daysAgo(5)),
  registryStatus: 'accepted',
  acknowledgements: [ack(h4412v1.submissionGuid, 'accepted', 'AA', hoursAgo(5 * 24 - 2))],
};
const h4412v2 = header('S26-4412', daysAgo(1), 'correction', [{ registryId: REGISTRY, status: 'SENT', registryStatus: 'accepted', submission: h4412v1 }], WESTVIEW);
const e4412v2: CancerRegistryOutboundQueueEntry = {
  ...sent('crq-demo-4412-v2', 'S26-4412', h4412v2, daysAgo(1)),
  registryStatus: 'acceptedWithWarnings',
  acknowledgements: [ack(h4412v2.submissionGuid, 'acceptedWithWarnings', 'AA', hoursAgo(22), [
    { severity: 'WARNING', code: 'NAACCR-3839', tier: 3, location: 'Tumor/gleasonPatternsPathological',
      message: 'Correction changes Grade Group from 1 to 2; Gleason Patterns Clinical (NAACCR #3838) left as originally reported.' },
  ])],
};

// ── S26-4630: accepted ──────────────────────────────────────────────────────
const h4630 = header('S26-4630', daysAgo(37), 'signOut');
const e4630: CancerRegistryOutboundQueueEntry = {
  ...sent('crq-demo-4630', 'S26-4630', h4630, daysAgo(37)),
  registryStatus: 'accepted',
  acknowledgements: [ack(h4630.submissionGuid, 'accepted', 'AA', daysAgo(36))],
};

export const CANCER_REGISTRY_DEMO_QUEUE: CancerRegistryOutboundQueueEntry[] = [e4405, e4490, e4633, e4412v1, e4412v2, e4630];
