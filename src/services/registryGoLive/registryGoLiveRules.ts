// src/services/registryGoLive/registryGoLiveRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 423 (Registry Engine SRS v2.1, step 7): the rules for switching a
// registry from its test system to the live register. Pure.
//
// The same shape as the lab's other approvals:
//   • Synoptic template publishing (templatePublishingRules.ts): one
//     preparer, approvals counted under the site's two settings, Allow
//     Self-Approval and Required Reviewers (1–3). Go-live reuses those
//     settings' normalisation and the same counting rule, with its own
//     defaults: self-approval ON and one approval (Pete, Oct 1 2026: a small
//     lab must be able to go live with one person). A larger lab turns
//     self-approval off or raises the count, as it can for templates.
//   • Report sign-out (services/auth/signerConfirmation.ts): every approval
//     re-confirms the approver's credentials right before it is saved
//     (password, or the identity provider's re-sign-in), through the same
//     confirmation, lockout and one-time-use checks.
//
// What it adds: automated pre-checks, test evidence, the capacities the
// approver acts in (Site Administrator, Lab Director or delegated Lab
// Director designee, recorded on the approval and in the permanent audit
// statement), and a Lab Director capacity among the approvals.
// ─────────────────────────────────────────────────────────────────────────────

import {
  countingApprovals, normalizeGovernanceSettings, REQUIRED_REVIEWERS_MAX, REQUIRED_REVIEWERS_MIN,
  type TemplateGovernanceSettings,
} from '../templates/templatePublishingRules';
import type { RegistryDomain, RegistryTemplateVersion } from './registryTemplateVersions';

// ── Governance settings (the template review settings' shape) ───────────────

export type RegistryGoLiveGovernance = TemplateGovernanceSettings;
export const REGISTRY_GO_LIVE_APPROVALS_MIN = REQUIRED_REVIEWERS_MIN;
export const REGISTRY_GO_LIVE_APPROVALS_MAX = REQUIRED_REVIEWERS_MAX;
export const DEFAULT_REGISTRY_GO_LIVE_GOVERNANCE: RegistryGoLiveGovernance = { allowSelfApproval: true, requiredReviewers: 1 };

export function normalizeRegistryGoLiveGovernance(raw: Partial<RegistryGoLiveGovernance> | null | undefined): RegistryGoLiveGovernance {
  return normalizeGovernanceSettings({ ...DEFAULT_REGISTRY_GO_LIVE_GOVERNANCE, ...(raw ?? {}) });
}

export function registryGoLiveGovernanceChangeDetail(previous: RegistryGoLiveGovernance, saved: RegistryGoLiveGovernance): string | null {
  const parts: string[] = [];
  if (previous.allowSelfApproval !== saved.allowSelfApproval) parts.push(`Allow go-live self-approval: ${previous.allowSelfApproval ? 'Enabled' : 'Disabled'} → ${saved.allowSelfApproval ? 'Enabled' : 'Disabled'}`);
  if (previous.requiredReviewers !== saved.requiredReviewers) parts.push(`Required go-live approvals: ${previous.requiredReviewers} → ${saved.requiredReviewers}`);
  return parts.length ? parts.join('; ') : null;
}

// ── The record ───────────────────────────────────────────────────────────────

export type RegistryGoLiveCapacity = 'siteAdministrator' | 'labDirector' | 'labDirectorDesignee';
export const REGISTRY_GO_LIVE_CAPACITIES: readonly RegistryGoLiveCapacity[] = ['siteAdministrator', 'labDirector', 'labDirectorDesignee'];
const DIRECTOR_CAPACITIES: readonly RegistryGoLiveCapacity[] = ['labDirector', 'labDirectorDesignee'];

export interface RegistryGoLiveEvidence {
  /** Batch 424: synthetic test submissions on this template version the registry accepted, from the
   *  validation record imported from the validation instance (Batch 423 counted this instance's queue). */
  acceptedTestSubmissions: number;
  /** Batch 424: the imported validation record's digest, tying the approval to it. */
  validationDigest?: string;
  /** The registry's own reference for the passed test (sign-off letter, ticket, email). */
  reference: string;
  /** For a registry PathScribe hasn't verified: the lab confirmed codes and format against the registry's specification. */
  specConfirmedByLab: boolean;
}

export interface RegistryGoLiveApproval {
  userId: string;
  name: string;
  at: string;
  capacities: RegistryGoLiveCapacity[];
  /** The re-entered credentials, as the signature check recorded them. */
  stepUp: { method: 'password' | 'sso' | 'biometric'; confirmationId: string; confirmedAt: string };
}

export type RegistryGoLiveRecordStatus = 'inReview' | 'live' | 'withdrawn' | 'ended';

export interface RegistryGoLiveRecord {
  id: string;
  domain: RegistryDomain;
  registryId: string;
  templateVersion: string;
  status: RegistryGoLiveRecordStatus;
  preparedBy: { id: string; name: string };
  preparedAt: string;
  /** Who prepared it (the template rule's "authors"), for the self-approval setting. */
  editorIds: string[];
  evidence: RegistryGoLiveEvidence;
  /** The pre-checks as they stood when it was prepared. */
  prechecks: RegistryGoLivePrecheck[];
  approvals: RegistryGoLiveApproval[];
  /** Set when it went live: the settings in force and the permanent audit statement. */
  liveAt?: string;
  governanceAtLive?: RegistryGoLiveGovernance;
  auditStatement?: string;
  /** Withdrawn before going live, or ended by a return to the test system. */
  closedAt?: string;
  closedBy?: string;
}

// ── Pre-checks ───────────────────────────────────────────────────────────────

export const REGISTRY_GO_LIVE_MIN_TEST_ACCEPTS = 1;

// Batch 424: testAccepted became validationRecord (the record from the validation instance), and
// agreementRecorded and overridesReviewed are new.
export type RegistryGoLivePrecheckId = 'templateCurrent' | 'specificationConfirmed' | 'codesMapped' | 'identifierHold'
  | 'agreementRecorded' | 'validationRecord' | 'overridesReviewed' | 'testEvidence';
export interface RegistryGoLivePrecheck {
  id: RegistryGoLivePrecheckId;
  status: 'passed' | 'failed' | 'notApplicable';
  /** Values for the check's text. */
  params?: Record<string, string | number>;
}

export interface RegistryGoLivePrecheckInput {
  domain: RegistryDomain;
  definition: { specStatus: 'verified' | 'configurable'; patientIdentifierFormatId?: string; resultCoding?: 'builtIn' | 'mappingTable' | 'text' };
  templateVersion: string;
  latest: RegistryTemplateVersion | undefined;
  /** Screening, mapping-table registries: categories still without the registry's code. */
  unmappedCodes?: number;
  /** Screening: whether results without the national identifier are held. */
  requirePatientIdentifier?: boolean;
  evidence: RegistryGoLiveEvidence;
  /** Batch 424: the data-sharing agreement (BAA, DUA) is recorded. */
  agreementRecorded: boolean;
  /** Batch 424: problems with the imported validation record; 'missing' when there is none. */
  validationProblems: string[] | 'missing';
  /** Batch 424: local changes a later template version touched, not yet confirmed. */
  localChangesNeedingReview: number;
}

export function registryGoLivePrechecks(input: RegistryGoLivePrecheckInput): RegistryGoLivePrecheck[] {
  const { definition, evidence } = input;
  const pass = (ok: boolean): RegistryGoLivePrecheck['status'] => (ok ? 'passed' : 'failed');
  return [
    { id: 'templateCurrent', status: pass(!!input.latest && input.latest.version === input.templateVersion), params: { version: input.templateVersion, latest: input.latest?.version ?? '' } },
    { id: 'specificationConfirmed', status: pass(definition.specStatus === 'verified' || evidence.specConfirmedByLab) },
    input.domain === 'screening' && definition.resultCoding === 'mappingTable'
      ? { id: 'codesMapped', status: pass((input.unmappedCodes ?? 0) === 0), params: { missing: input.unmappedCodes ?? 0 } }
      : { id: 'codesMapped', status: 'notApplicable' },
    input.domain === 'screening' && definition.patientIdentifierFormatId
      ? { id: 'identifierHold', status: pass(!!input.requirePatientIdentifier) }
      : { id: 'identifierHold', status: 'notApplicable' },
    { id: 'agreementRecorded', status: pass(input.agreementRecorded) },
    { id: 'validationRecord', status: pass(input.validationProblems !== 'missing' && input.validationProblems.length === 0),
      params: { count: evidence.acceptedTestSubmissions, min: REGISTRY_GO_LIVE_MIN_TEST_ACCEPTS, version: input.templateVersion } },
    { id: 'overridesReviewed', status: pass(input.localChangesNeedingReview === 0), params: { count: input.localChangesNeedingReview } },
    { id: 'testEvidence', status: pass(!!evidence.reference.trim()) },
  ];
}

export const registryGoLivePrechecksPass = (checks: RegistryGoLivePrecheck[]) => checks.every(c => c.status !== 'failed');

/** Synthetic test submissions on this registry and template version that the registry accepted
 *  (Batch 424: only synthetic cases count; real data never goes to a test system). */
export function acceptedSyntheticSubmissions<E extends { caseId: string; registryId: string; registryStatus?: string; submission?: { environment?: string; templateVersion?: string } }>(
  entries: E[], registryId: string, templateVersion: string,
): E[] {
  return entries.filter(e => e.registryId === registryId && e.caseId.startsWith('SYN-') && e.submission?.environment === 'test' && e.submission.templateVersion === templateVersion
    && (e.registryStatus === 'accepted' || e.registryStatus === 'acceptedWithWarnings'));
}
export const countAcceptedTestSubmissions = (
  entries: { caseId: string; registryId: string; registryStatus?: string; submission?: { environment?: string; templateVersion?: string } }[],
  registryId: string, templateVersion: string,
) => acceptedSyntheticSubmissions(entries, registryId, templateVersion).length;

// ── Adapter state (Batch 424) ────────────────────────────────────────────────

/**
 * Where a registry connection stands on this instance:
 *   validation instance: pending (no data-sharing agreement recorded: nothing is
 *     sent) → testing (the synthetic suite may run) → validated (a validation
 *     record exported for the latest template)
 *   production instance: pending (no current go-live approval: real results are
 *     held) → live
 */
export type RegistryAdapterState = 'pending' | 'testing' | 'validated' | 'live';
export function registryAdapterState(input: { role: 'production' | 'validation'; agreementRecorded: boolean; validatedLatest: boolean; liveCurrent: boolean }): RegistryAdapterState {
  if (input.role === 'production') return input.liveCurrent ? 'live' : 'pending';
  if (!input.agreementRecorded) return 'pending';
  return input.validatedLatest ? 'validated' : 'testing';
}

// ── Approving ────────────────────────────────────────────────────────────────

export type RegistryGoLiveApproveRefusal = 'notInReview' | 'noCapacity' | 'conflictingCapacities' | 'selfApproval' | 'alreadyApproved';

/** Before the credential prompt: may this person approve this record in these capacities? */
export function checkRegistryGoLiveApproval(
  record: Pick<RegistryGoLiveRecord, 'status' | 'editorIds' | 'approvals'>,
  approver: { id: string },
  capacities: RegistryGoLiveCapacity[],
  governance: RegistryGoLiveGovernance,
): RegistryGoLiveApproveRefusal | null {
  if (record.status !== 'inReview') return 'notInReview';
  if (!capacities.length || capacities.some(c => !REGISTRY_GO_LIVE_CAPACITIES.includes(c))) return 'noCapacity';
  if (capacities.includes('labDirector') && capacities.includes('labDirectorDesignee')) return 'conflictingCapacities';
  if (!governance.allowSelfApproval && record.editorIds.includes(approver.id)) return 'selfApproval';
  if (record.approvals.some(a => a.userId === approver.id)) return 'alreadyApproved';
  return null;
}

export interface RegistryGoLiveProgress {
  /** Approvals that count (one per person; none from the preparer unless self-approval is allowed). */
  counted: number;
  required: number;
  /** A Lab Director, or a delegated designee, is among the counted approvals. */
  hasDirector: boolean;
  goesLive: boolean;
}

export function registryGoLiveProgress(record: Pick<RegistryGoLiveRecord, 'editorIds' | 'approvals'>, governance: RegistryGoLiveGovernance): RegistryGoLiveProgress {
  const counting = record.approvals.filter(a => governance.allowSelfApproval || !record.editorIds.includes(a.userId));
  const counted = countingApprovals({ status: 'in_review', editorIds: record.editorIds, approvals: record.approvals }, governance);
  const hasDirector = counting.some(a => a.capacities.some(c => DIRECTOR_CAPACITIES.includes(c)));
  return { counted, required: governance.requiredReviewers, hasDirector, goesLive: counted >= governance.requiredReviewers && hasDirector };
}

// ── The permanent audit statement (literal English) ─────────────────────────

const CAPACITY_TEXT: Record<RegistryGoLiveCapacity, string> = {
  siteAdministrator: 'Site Administrator',
  labDirector: 'Lab Director',
  labDirectorDesignee: 'delegated Lab Director designee',
};
const METHOD_TEXT: Record<RegistryGoLiveApproval['stepUp']['method'], string> = {
  password: 'password re-entry', sso: 'identity provider re-sign-in', biometric: 'biometric confirmation',
};

function capacityPhrase(capacities: RegistryGoLiveCapacity[]): string {
  const names = capacities.map(c => CAPACITY_TEXT[c]);
  return names.length > 1 ? `in dual capacity as ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : `as ${names[0]}`;
}

/**
 * "Live Register switch for csms_uk (template v2026.4.1) executed by Pete Nimmo
 * (3) acting in dual capacity as Site Administrator and delegated Lab Director
 * designee, authorized via step-up credential verification (password re-entry)
 * on 2026-10-01T15:00:00.000Z." One clause per approval when there are several.
 */
export function registryGoLiveAuditStatement(record: Pick<RegistryGoLiveRecord, 'registryId' | 'templateVersion' | 'preparedBy'>, approvals: RegistryGoLiveApproval[], liveAt: string): string {
  const who = (a: RegistryGoLiveApproval) =>
    `${a.name} (${a.userId}) acting ${capacityPhrase(a.capacities)}${a.userId === record.preparedBy.id ? ', who also prepared the request,' : ''} authorized via step-up credential verification (${METHOD_TEXT[a.stepUp.method]}) on ${a.at}`;
  const head = `Live Register switch for ${record.registryId} (template ${record.templateVersion})`;
  if (approvals.length === 1) return `${head} executed by ${who(approvals[0])}.`;
  return `${head} executed on ${liveAt}, approved by ${approvals.map(who).join('; and by ')}.`;
}

// ── Holding live submissions ─────────────────────────────────────────────────

export const REGISTRY_LIVE_HOLD_CODE = 'REGISTRY_LIVE_NOT_APPROVED';
