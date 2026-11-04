// src/services/registryGoLive/registryGoLive.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 423 (Registry Engine SRS v2.1, step 7), reworked in Batch 424 around
// two PathScribe instances (Pete, Oct 1 2026): testing happens on a
// validation instance with synthetic data only; production sends real
// results only to live registers, once go-live is approved there. The rules
// are in registryGoLiveRules.ts, registrySendGate.ts, registryOverlay.ts and
// registryValidationRecord.ts; this file checks permissions, reads and writes
// the stores, and audits.
//
// On a validation instance
//   recordRegistryAgreement      the data-sharing agreement (BAA, DUA): the
//                                registry leaves Pending (manage capability)
//   runRegistryTestSuite         the synthetic suite to the registry's test
//                                system (registry:test-suite:run)
//   exportRegistryValidation     once enough synthetic submissions were
//                                accepted on the latest template: the
//                                validation record file (manage capability)
// On a production instance
//   importRegistryValidation     that file, checked (manage capability)
//   requestRegistryGoLive        pre-checks + evidence (manage capability)
//   approveRegistryGoLive        capacities + re-entered credentials
//                                (registry:live-register:approve); when the
//                                required approvals are in it goes live and
//                                the held backlog is resent (catch-up)
//   stopRegistryLiveReporting    live → held again (manage capability)
// Either
//   add/removeRegistryAdapterRule, confirmRegistryLocalChanges   the local
//                                overlay (manage capability)
//   saveRegistryGoLiveGovernance the approval settings
//                                (config:registry-go-live:manage)
//   registrySendGate             what every submission path asks first
// ─────────────────────────────────────────────────────────────────────────────

import type { SignatureConfirmation } from '../auth/signerConfirmation';
import type { InstanceRole } from '../deployment/deploymentInstance';
import type { IRegistryGoLiveService, RegistryAgreement, StoredValidationRecord } from './IRegistryGoLiveService';
import {
  acceptedSyntheticSubmissions, checkRegistryGoLiveApproval, registryAdapterState, registryGoLiveAuditStatement,
  registryGoLiveGovernanceChangeDetail, registryGoLivePrechecks, registryGoLivePrechecksPass, registryGoLiveProgress,
  REGISTRY_GO_LIVE_MIN_TEST_ACCEPTS, REGISTRY_LIVE_HOLD_CODE,
  type RegistryAdapterState, type RegistryGoLiveApproval, type RegistryGoLiveApproveRefusal, type RegistryGoLiveCapacity,
  type RegistryGoLiveGovernance, type RegistryGoLivePrecheck, type RegistryGoLivePrecheckInput, type RegistryGoLiveProgress, type RegistryGoLiveRecord,
} from './registryGoLiveRules';
import {
  latestRegistryTemplateVersion, registryLiveStatus, registryTemplateHistory,
  type RegistryDomain, type RegistryLiveStatus, type RegistryTemplateElement, type RegistryTemplateVersion,
} from './registryTemplateVersions';
import {
  customisedElements, laterVersion, localChangesNeedingReview, registryLocalChanges,
  type RegistryAdapterRule, type RegistryLocalChange, type RegistryLocalChangeReview,
} from './registryOverlay';
import { registrySendDecision, type RegistrySendGate } from './registrySendGate';
import { buildValidationRecord, checkValidationRecord, validationRecordFileName, type ValidationRecordProblem } from './registryValidationRecord';
import type { SyntheticSubmission } from './syntheticTestSuite';

type Actor = { id: string; name: string };

/** What the pre-checks and the overlay read from the registry's configuration. */
export interface RegistryGoLiveSetup {
  definition?: RegistryGoLivePrecheckInput['definition'];
  unmappedCodes?: number;
  requirePatientIdentifier?: boolean;
  /** Screening: the lab's code mappings and identifier hold, with their baseline stamps (the overlay). */
  screeningOverlay?: { codeMappings: any[]; requirePatientIdentifier?: boolean; identifierHoldBaselineVersion?: string };
}

export type StepUpResult =
  | { ok: true; stepUp: RegistryGoLiveApproval['stepUp'] }
  | { ok: false; reason: string };

type QueueEntry = { id: string; caseId: string; registryId: string; status?: string; errorCode?: string; registryStatus?: string; submission?: { environment?: string; templateVersion?: string; submissionGuid?: string } };

export interface RegistryGoLiveDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  store: IRegistryGoLiveService;
  instance: { role: InstanceRole; release: string };
  readSetup: (domain: RegistryDomain, registryId: string) => Promise<RegistryGoLiveSetup>;
  /** The domain's registry queue. */
  queueEntries: (domain: RegistryDomain) => Promise<QueueEntry[]>;
  /** The signature check report sign-out uses, for the action 'registry-go-live'. */
  verifyStepUp: (confirmation: SignatureConfirmation, recordId: string) => Promise<StepUpResult>;
  /** Screening: re-stamp the lab's code mappings and identifier hold to a template version (confirming them). */
  restampScreening: (registryId: string, version: string) => Promise<unknown>;
  /** The synthetic suite for a registry, through its real builders. */
  buildSuite: (domain: RegistryDomain, registryId: string) => Promise<SyntheticSubmission[]>;
  /** Queue and send one synthetic submission to the registry's test system. */
  sendSynthetic: (domain: RegistryDomain, registryId: string, item: SyntheticSubmission, templateVersion: string) => Promise<{ ok: boolean; error?: string }>;
  /** The catch-up: resend every submission held for want of a go-live approval (needs registry:submission:resend). */
  releaseHeld: (domain: RegistryDomain, registryId: string, user: Actor) => Promise<{ resent: number; stillHeld: number }>;
  logAudit: (event: any) => unknown;
  now: () => Date;
  newId: () => string;
}

export const REGISTRY_MANAGE_CAPABILITY: Record<RegistryDomain, string> = {
  screening: 'config:screening-registry:manage',
  cancer: 'config:cancer-registry:manage',
};

const audit = (deps: Pick<RegistryGoLiveDeps, 'logAudit'>, user: Actor | string, event: string, detail: string) =>
  deps.logAudit({ type: 'user', event, detail, user: typeof user === 'string' ? user : user.name || user.id, caseId: null, confidence: null });

const liveRecordOf = (records: RegistryGoLiveRecord[]) => records.find(r => r.status === 'live');
const openRequestOf = (records: RegistryGoLiveRecord[]) => records.find(r => r.status === 'inReview');
const okData = async <T,>(p: Promise<{ ok: boolean; data?: T }>, fallback: T): Promise<T> => { const r = await p; return r.ok && r.data !== undefined ? r.data : fallback; };

async function governanceOf(deps: Pick<RegistryGoLiveDeps, 'store'>): Promise<RegistryGoLiveGovernance> {
  return okData(deps.store.getGovernance() as any, { allowSelfApproval: true, requiredReviewers: 1 });
}

/** The overlay, its review state and the live status that depends on it. */
async function overlayOf(deps: Pick<RegistryGoLiveDeps, 'store' | 'readSetup' | 'now'>, domain: RegistryDomain, registryId: string, setup?: RegistryGoLiveSetup) {
  const s = setup ?? await deps.readSetup(domain, registryId);
  const adapterRules = await okData<RegistryAdapterRule[]>(deps.store.listAdapterRules(domain, registryId) as any, []);
  const history = registryTemplateHistory(domain, registryId);
  const localChanges = registryLocalChanges(s.screeningOverlay, adapterRules);
  return { setup: s, adapterRules, history, localChanges, needingReview: localChangesNeedingReview(localChanges, history, deps.now()), customised: customisedElements(localChanges) };
}

/** The latest imported (production) or exported (validation) record, checked against the latest template and this release. */
async function validationOf(deps: Pick<RegistryGoLiveDeps, 'store' | 'instance'>, domain: RegistryDomain, registryId: string, latest: RegistryTemplateVersion | undefined) {
  const stored = await okData<StoredValidationRecord[]>(deps.store.listValidationRecords(domain, registryId) as any, []);
  const direction = deps.instance.role === 'production' ? 'imported' : 'exported';
  const mine = stored.find(v => v.direction === direction);
  if (!mine) return { stored, current: undefined, problems: 'missing' as const };
  const { problems } = checkValidationRecord(JSON.stringify(mine.record), {
    domain, registryId, templateVersion: latest?.version ?? '', release: deps.instance.release, minAccepted: REGISTRY_GO_LIVE_MIN_TEST_ACCEPTS,
  });
  return { stored, current: mine, problems };
}

// ── The submission paths' question ───────────────────────────────────────────

/** Send, hold or skip a registry submission on this instance (registrySendGate.ts). */
export async function registrySendGate(
  domain: RegistryDomain, registryId: string, synthetic: boolean,
  deps: Pick<RegistryGoLiveDeps, 'store' | 'instance' | 'readSetup' | 'now'>,
): Promise<RegistrySendGate> {
  const [records, agreement] = await Promise.all([
    okData<RegistryGoLiveRecord[]>(deps.store.list(domain, registryId) as any, []),
    okData<RegistryAgreement | undefined>(deps.store.getAgreement(domain, registryId) as any, undefined),
  ]);
  let liveStatus: RegistryLiveStatus = { state: 'notApproved' };
  if (deps.instance.role === 'production') {
    const live = liveRecordOf(records);
    const overlay = live ? await overlayOf(deps, domain, registryId) : undefined;
    liveStatus = registryLiveStatus(live?.templateVersion, registryTemplateHistory(domain, registryId), deps.now(), overlay?.customised);
  }
  return registrySendDecision({ role: deps.instance.role, synthetic, registryId, liveStatus, agreementRecorded: !!agreement });
}

/** Batch 423's name for the production question, kept for the hold message tests. */
export async function registryLiveHold(domain: RegistryDomain, registryId: string, deps: Pick<RegistryGoLiveDeps, 'store' | 'instance' | 'readSetup' | 'now'>) {
  const gate = await registrySendGate(domain, registryId, false, deps);
  return gate.action === 'hold' ? { code: REGISTRY_LIVE_HOLD_CODE, message: gate.message! } : null;
}

// ── Reading ──────────────────────────────────────────────────────────────────

export interface RegistryGoLiveView {
  role: InstanceRole;
  release: string;
  adapterState: RegistryAdapterState;
  history: readonly RegistryTemplateVersion[];
  latest?: RegistryTemplateVersion;
  /** Production: whether the live approval still lets results through today. */
  status: RegistryLiveStatus;
  liveRecord?: RegistryGoLiveRecord;
  openRequest?: RegistryGoLiveRecord;
  openProgress?: RegistryGoLiveProgress;
  records: RegistryGoLiveRecord[];
  governance: RegistryGoLiveGovernance;
  setup: RegistryGoLiveSetup;
  agreement?: RegistryAgreement;
  adapterRules: RegistryAdapterRule[];
  localChanges: RegistryLocalChange[];
  needingReview: RegistryLocalChangeReview[];
  /** Validation: accepted synthetic submissions on the latest template. */
  acceptedSynthetic: number;
  /** The latest exported (validation) or imported (production) validation record and its problems. */
  validation?: StoredValidationRecord;
  validationProblems: ValidationRecordProblem[] | 'missing';
}

export async function loadRegistryGoLive(domain: RegistryDomain, registryId: string, deps: RegistryGoLiveDeps): Promise<RegistryGoLiveView> {
  const [records, governance, agreement, entries, overlay] = await Promise.all([
    okData<RegistryGoLiveRecord[]>(deps.store.list(domain, registryId) as any, []),
    governanceOf(deps),
    okData<RegistryAgreement | undefined>(deps.store.getAgreement(domain, registryId) as any, undefined),
    deps.queueEntries(domain),
    overlayOf(deps, domain, registryId),
  ]);
  const latest = latestRegistryTemplateVersion(overlay.history, deps.now());
  const liveRecord = liveRecordOf(records);
  const openRequest = openRequestOf(records);
  const status = registryLiveStatus(liveRecord?.templateVersion, overlay.history, deps.now(), overlay.customised);
  const validation = await validationOf(deps, domain, registryId, latest);
  const validProblems = validation.problems;
  return {
    role: deps.instance.role, release: deps.instance.release,
    adapterState: registryAdapterState({
      role: deps.instance.role, agreementRecorded: !!agreement,
      validatedLatest: validProblems !== 'missing' && validProblems.length === 0,
      liveCurrent: status.state === 'current' || status.state === 'reapprovalDue',
    }),
    history: overlay.history, latest, status, liveRecord, openRequest,
    openProgress: openRequest ? registryGoLiveProgress(openRequest, governance) : undefined,
    records, governance, setup: overlay.setup, agreement,
    adapterRules: overlay.adapterRules, localChanges: overlay.localChanges, needingReview: overlay.needingReview,
    acceptedSynthetic: latest ? acceptedSyntheticSubmissions(entries, registryId, latest.version).length : 0,
    validation: validation.current, validationProblems: validProblems,
  };
}

/** The production pre-checks as they would stand for a request with this evidence (read-only, for the screen). */
export async function previewRegistryGoLivePrechecks(domain: RegistryDomain, registryId: string, evidence: { reference: string; specConfirmedByLab: boolean }, deps: RegistryGoLiveDeps): Promise<RegistryGoLivePrecheck[]> {
  const overlay = await overlayOf(deps, domain, registryId);
  if (!overlay.setup.definition) return [];
  const latest = latestRegistryTemplateVersion(overlay.history, deps.now());
  return (await prechecksFor(deps, domain, registryId, overlay, latest?.version ?? '', latest, evidence)).prechecks;
}

async function prechecksFor(
  deps: RegistryGoLiveDeps, domain: RegistryDomain, registryId: string,
  overlay: Awaited<ReturnType<typeof overlayOf>>, templateVersion: string, latest: RegistryTemplateVersion | undefined,
  evidence: { reference: string; specConfirmedByLab: boolean },
) {
  const [agreement, validation] = await Promise.all([
    okData<RegistryAgreement | undefined>(deps.store.getAgreement(domain, registryId) as any, undefined),
    validationOf(deps, domain, registryId, latest),
  ]);
  const fullEvidence = {
    acceptedTestSubmissions: validation.current?.record.accepted.length ?? 0,
    validationDigest: validation.current?.record.digest,
    reference: evidence.reference.trim(), specConfirmedByLab: !!evidence.specConfirmedByLab,
  };
  const prechecks = registryGoLivePrechecks({
    domain, definition: overlay.setup.definition!, templateVersion, latest,
    unmappedCodes: overlay.setup.unmappedCodes, requirePatientIdentifier: overlay.setup.requirePatientIdentifier, evidence: fullEvidence,
    agreementRecorded: !!agreement, validationProblems: validation.problems, localChangesNeedingReview: overlay.needingReview.length,
  });
  return { prechecks, evidence: fullEvidence };
}

// ── Validation instance: agreement, test suite, export ──────────────────────

export async function recordRegistryAgreement(input: { domain: RegistryDomain; registryId: string; reference: string }, user: Actor, deps: RegistryGoLiveDeps): Promise<'notPermitted' | 'referenceRequired' | 'recorded'> {
  if (!(await deps.enforce(REGISTRY_MANAGE_CAPABILITY[input.domain], { registryId: input.registryId })).allowed) return 'notPermitted';
  const reference = input.reference.trim();
  if (!reference) return 'referenceRequired';
  await deps.store.recordAgreement({ domain: input.domain, registryId: input.registryId, reference, recordedBy: user.name || user.id, recordedAt: deps.now().toISOString() });
  audit(deps, user, 'Registry agreement recorded', `${input.registryId}: data-sharing agreement "${reference}" recorded on the ${deps.instance.role} instance.`);
  return 'recorded';
}

export interface TestSuiteOutcome {
  outcome: 'notPermitted' | 'notValidationInstance' | 'registryPending' | 'unknownRegistry' | 'ran';
  results?: { caseRef: string; scenario: string; result: 'sent' | 'held' | 'failed'; detail?: string }[];
}

export async function runRegistryTestSuite(input: { domain: RegistryDomain; registryId: string }, user: Actor, deps: RegistryGoLiveDeps): Promise<TestSuiteOutcome> {
  const { domain, registryId } = input;
  if (!(await deps.enforce('registry:test-suite:run', { registryId })).allowed) return { outcome: 'notPermitted' };
  if (deps.instance.role !== 'validation') return { outcome: 'notValidationInstance' };
  const gate = await registrySendGate(domain, registryId, true, deps);
  if (gate.action !== 'send') return { outcome: 'registryPending' };
  const latest = latestRegistryTemplateVersion(registryTemplateHistory(domain, registryId), deps.now());
  if (!latest) return { outcome: 'unknownRegistry' };
  const suite = await deps.buildSuite(domain, registryId);
  if (!suite.length) return { outcome: 'unknownRegistry' };
  const results: NonNullable<TestSuiteOutcome['results']> = [];
  for (const item of suite) {
    if (item.status === 'held') { results.push({ caseRef: item.caseRef, scenario: item.scenario, result: 'held', detail: item.holdMessage }); continue; }
    const sent = await deps.sendSynthetic(domain, registryId, item, latest.version);
    results.push({ caseRef: item.caseRef, scenario: item.scenario, result: sent.ok ? 'sent' : 'failed', detail: sent.error });
  }
  audit(deps, user, 'Registry test suite run',
    `${registryId} (template ${latest.version}): synthetic test suite sent to the registry's test system: ${results.map(r => `${r.caseRef} ${r.result}`).join('; ')}.`);
  return { outcome: 'ran', results };
}

export interface ExportValidationOutcome {
  outcome: 'notPermitted' | 'notValidationInstance' | 'registryPending' | 'notEnoughAccepted' | 'exported';
  fileName?: string;
  text?: string;
  accepted?: number;
}

export async function exportRegistryValidation(input: { domain: RegistryDomain; registryId: string }, user: Actor, deps: RegistryGoLiveDeps): Promise<ExportValidationOutcome> {
  const { domain, registryId } = input;
  if (!(await deps.enforce(REGISTRY_MANAGE_CAPABILITY[domain], { registryId })).allowed) return { outcome: 'notPermitted' };
  if (deps.instance.role !== 'validation') return { outcome: 'notValidationInstance' };
  const agreement = await okData<RegistryAgreement | undefined>(deps.store.getAgreement(domain, registryId) as any, undefined);
  if (!agreement) return { outcome: 'registryPending' };
  const latest = latestRegistryTemplateVersion(registryTemplateHistory(domain, registryId), deps.now());
  const accepted = acceptedSyntheticSubmissions(await deps.queueEntries(domain), registryId, latest?.version ?? '');
  if (accepted.length < REGISTRY_GO_LIVE_MIN_TEST_ACCEPTS) return { outcome: 'notEnoughAccepted', accepted: accepted.length };
  const record = buildValidationRecord({
    domain, registryId, templateVersion: latest!.version, release: deps.instance.release,
    validatedAt: deps.now().toISOString(), exportedBy: { id: user.id, name: user.name }, agreementReference: agreement.reference,
    accepted: accepted.map(e => ({ caseRef: e.caseId, submissionGuid: e.submission?.submissionGuid ?? '', outcome: e.registryStatus ?? '' })),
  });
  await deps.store.saveValidationRecord({ direction: 'exported', storedAt: record.validatedAt, storedBy: user.name || user.id, record });
  audit(deps, user, 'Registry validation exported',
    `${registryId} (template ${record.templateVersion}, release ${record.release}): validation record exported; ${accepted.length} accepted synthetic submissions; digest ${record.digest}.`);
  return { outcome: 'exported', fileName: validationRecordFileName(record), text: JSON.stringify(record, null, 2), accepted: accepted.length };
}

// ── Production instance: import, request, approve, stop ─────────────────────

export async function importRegistryValidation(
  input: { domain: RegistryDomain; registryId: string; text: string }, user: Actor, deps: RegistryGoLiveDeps,
): Promise<{ outcome: 'notPermitted' | 'notProductionInstance' | 'rejected' | 'imported'; problems?: ValidationRecordProblem[] }> {
  const { domain, registryId } = input;
  if (!(await deps.enforce(REGISTRY_MANAGE_CAPABILITY[domain], { registryId })).allowed) return { outcome: 'notPermitted' };
  if (deps.instance.role !== 'production') return { outcome: 'notProductionInstance' };
  const latest = latestRegistryTemplateVersion(registryTemplateHistory(domain, registryId), deps.now());
  const { record, problems } = checkValidationRecord(input.text, {
    domain, registryId, templateVersion: latest?.version ?? '', release: deps.instance.release, minAccepted: REGISTRY_GO_LIVE_MIN_TEST_ACCEPTS,
  });
  if (!record || problems.length) {
    audit(deps, user, 'Registry validation import refused', `${registryId}: validation record refused (${problems.join(', ')}).`);
    return { outcome: 'rejected', problems };
  }
  await deps.store.saveValidationRecord({ direction: 'imported', storedAt: deps.now().toISOString(), storedBy: user.name || user.id, record });
  audit(deps, user, 'Registry validation imported',
    `${registryId} (template ${record.templateVersion}, release ${record.release}): validation record imported; exported by ${record.exportedBy.name} on ${record.validatedAt}; ${record.accepted.length} accepted synthetic submissions; digest ${record.digest}.`);
  return { outcome: 'imported' };
}

export interface RequestGoLiveOutcome {
  outcome: 'notPermitted' | 'notProductionInstance' | 'unknownRegistry' | 'alreadyRequested' | 'alreadyLive' | 'prechecksFailed' | 'requested';
  prechecks?: RegistryGoLivePrecheck[];
  record?: RegistryGoLiveRecord;
}

export async function requestRegistryGoLive(
  input: { domain: RegistryDomain; registryId: string; evidence: { reference: string; specConfirmedByLab: boolean } },
  user: Actor,
  deps: RegistryGoLiveDeps,
): Promise<RequestGoLiveOutcome> {
  const { domain, registryId } = input;
  if (!(await deps.enforce(REGISTRY_MANAGE_CAPABILITY[domain], { registryId })).allowed) return { outcome: 'notPermitted' };
  if (deps.instance.role !== 'production') return { outcome: 'notProductionInstance' };
  const overlay = await overlayOf(deps, domain, registryId);
  if (!overlay.setup.definition) return { outcome: 'unknownRegistry' };
  const records = await okData<RegistryGoLiveRecord[]>(deps.store.list(domain, registryId) as any, []);
  if (openRequestOf(records)) return { outcome: 'alreadyRequested' };
  const latest = latestRegistryTemplateVersion(overlay.history, deps.now());
  const live = liveRecordOf(records);
  if (live && live.templateVersion === latest?.version) return { outcome: 'alreadyLive' };

  const { prechecks, evidence } = await prechecksFor(deps, domain, registryId, overlay, latest?.version ?? '', latest, input.evidence);
  if (!registryGoLivePrechecksPass(prechecks)) return { outcome: 'prechecksFailed', prechecks };
  const record: RegistryGoLiveRecord = {
    id: deps.newId(), domain, registryId, templateVersion: latest!.version, status: 'inReview',
    preparedBy: { id: user.id, name: user.name }, preparedAt: deps.now().toISOString(), editorIds: [user.id],
    evidence, prechecks, approvals: [],
  };
  const created = await deps.store.create(record);
  if (!created.ok) return { outcome: 'unknownRegistry' };
  audit(deps, user, 'Registry go-live requested',
    `${registryId} (template ${record.templateVersion}): go-live requested; validation record ${evidence.validationDigest} with ${evidence.acceptedTestSubmissions} accepted synthetic submissions; registry test sign-off "${evidence.reference}"; specification ${overlay.setup.definition.specStatus === 'verified' ? 'verified by PathScribe' : evidence.specConfirmedByLab ? 'confirmed by the lab' : 'not confirmed'}.`);
  return { outcome: 'requested', prechecks, record };
}

export interface ApproveGoLiveOutcome {
  outcome: 'notPermitted' | 'notFound' | RegistryGoLiveApproveRefusal | 'prechecksFailed' | 'stepUpRefused' | 'approved' | 'live';
  reason?: string;
  prechecks?: RegistryGoLivePrecheck[];
  progress?: RegistryGoLiveProgress;
  record?: RegistryGoLiveRecord;
  /** On going live: the catch-up of held results. */
  catchUp?: { resent: number; stillHeld: number };
}

export async function approveRegistryGoLive(
  input: { recordId: string; capacities: RegistryGoLiveCapacity[]; confirmation: SignatureConfirmation },
  user: Actor,
  deps: RegistryGoLiveDeps,
): Promise<ApproveGoLiveOutcome> {
  const record = await okData<RegistryGoLiveRecord | undefined>(deps.store.get(input.recordId) as any, undefined);
  if (!(await deps.enforce('registry:live-register:approve', { registryId: record?.registryId })).allowed) return { outcome: 'notPermitted' };
  if (!record) return { outcome: 'notFound' };
  const governance = await governanceOf(deps);
  const refusal = checkRegistryGoLiveApproval(record, user, input.capacities, governance);
  if (refusal) return { outcome: refusal };

  // Today's configuration, overlay and validation record, not the ones it was prepared with.
  const overlay = await overlayOf(deps, record.domain, record.registryId);
  if (!overlay.setup.definition) return { outcome: 'notFound' };
  const latest = latestRegistryTemplateVersion(overlay.history, deps.now());
  const { prechecks } = await prechecksFor(deps, record.domain, record.registryId, overlay, record.templateVersion, latest, record.evidence);
  if (!registryGoLivePrechecksPass(prechecks)) return { outcome: 'prechecksFailed', prechecks };

  // Step-up last, right before the change is saved.
  const stepUp = await deps.verifyStepUp(input.confirmation, record.id);
  if (stepUp.ok === false) {
    audit(deps, user, 'Registry go-live approval refused', `${record.registryId} (template ${record.templateVersion}): credential re-confirmation refused (${stepUp.reason}).`);
    return { outcome: 'stepUpRefused', reason: stepUp.reason };
  }
  const at = deps.now().toISOString();
  const approval: RegistryGoLiveApproval = { userId: user.id, name: user.name, at, capacities: [...input.capacities], stepUp: stepUp.stepUp };
  const added = await deps.store.addApproval(record.id, approval);
  if (!added.ok) return { outcome: 'notInReview' };
  const progress = registryGoLiveProgress(added.data, governance);

  if (!progress.goesLive) {
    audit(deps, user, 'Registry go-live approved',
      `${record.registryId} (template ${record.templateVersion}): approved by ${user.name} (${user.id}) as ${input.capacities.join(', ')} with credential re-confirmation (${stepUp.stepUp.method}); ${progress.counted} of ${progress.required} approvals${progress.hasDirector ? '' : ', a Lab Director or designee still needed'}.`);
    return { outcome: 'approved', progress, record: added.data };
  }

  const counting = added.data.approvals.filter(a => governance.allowSelfApproval || !added.data.editorIds.includes(a.userId));
  const auditStatement = registryGoLiveAuditStatement(added.data, counting, at);
  // A re-approval replaces the approval it renews.
  const previous = liveRecordOf(await okData<RegistryGoLiveRecord[]>(deps.store.list(record.domain, record.registryId) as any, []));
  if (previous && previous.id !== record.id) await deps.store.close(previous.id, { closedAt: at, closedBy: user.name || user.id });
  const live = await deps.store.markLive(record.id, { liveAt: at, governanceAtLive: governance, auditStatement });
  audit(deps, user, 'Registry live register switch', auditStatement);
  // The catch-up: results held while waiting for this approval go now (each re-validated).
  const catchUp = await deps.releaseHeld(record.domain, record.registryId, user);
  audit(deps, user, 'Registry held results released',
    `${record.registryId}: go-live approved; ${catchUp.resent} held results resent${catchUp.stillHeld ? `, ${catchUp.stillHeld} still held (see Registry Exceptions)` : ''}.`);
  return { outcome: 'live', progress, record: live.ok ? live.data : added.data, catchUp };
}

export async function withdrawRegistryGoLive(recordId: string, user: Actor, deps: RegistryGoLiveDeps): Promise<'notPermitted' | 'notFound' | 'withdrawn'> {
  const record = await okData<RegistryGoLiveRecord | undefined>(deps.store.get(recordId) as any, undefined);
  if (!record || record.status !== 'inReview') return 'notFound';
  if (!(await deps.enforce(REGISTRY_MANAGE_CAPABILITY[record.domain], { registryId: record.registryId })).allowed) return 'notPermitted';
  await deps.store.close(record.id, { closedAt: deps.now().toISOString(), closedBy: user.name || user.id });
  audit(deps, user, 'Registry go-live withdrawn', `${record.registryId} (template ${record.templateVersion}): go-live request withdrawn before going live.`);
  return 'withdrawn';
}

/** Batch 424: replaces Batch 423's "return to test". Production never sends to a test system; live results are held again. */
export async function stopRegistryLiveReporting(input: { domain: RegistryDomain; registryId: string }, user: Actor, deps: RegistryGoLiveDeps): Promise<'notPermitted' | 'notLive' | 'stopped'> {
  if (!(await deps.enforce(REGISTRY_MANAGE_CAPABILITY[input.domain], { registryId: input.registryId })).allowed) return 'notPermitted';
  const live = liveRecordOf(await okData<RegistryGoLiveRecord[]>(deps.store.list(input.domain, input.registryId) as any, []));
  if (!live) return 'notLive';
  await deps.store.close(live.id, { closedAt: deps.now().toISOString(), closedBy: user.name || user.id });
  audit(deps, user, 'Registry live reporting stopped',
    `${input.registryId}: live reporting stopped (go-live of template ${live.templateVersion} ended); results are held until go-live is approved again.`);
  return 'stopped';
}

// ── The overlay ──────────────────────────────────────────────────────────────

export async function addRegistryAdapterRule(
  input: { domain: RegistryDomain; registryId: string; element: RegistryTemplateElement; description: string }, user: Actor, deps: RegistryGoLiveDeps,
): Promise<'notPermitted' | 'descriptionRequired' | 'added'> {
  if (!(await deps.enforce(REGISTRY_MANAGE_CAPABILITY[input.domain], { registryId: input.registryId })).allowed) return 'notPermitted';
  const description = input.description.trim();
  if (!description) return 'descriptionRequired';
  const latest = latestRegistryTemplateVersion(registryTemplateHistory(input.domain, input.registryId), deps.now());
  const rule: RegistryAdapterRule = {
    id: deps.newId(), domain: input.domain, registryId: input.registryId, element: input.element, description,
    baselineVersion: latest?.version ?? '', recordedBy: user.name || user.id, recordedAt: deps.now().toISOString(),
  };
  await deps.store.saveAdapterRule(rule);
  audit(deps, user, 'Registry adapter rule added', `${input.registryId}: local adapter rule on ${input.element} (baseline ${rule.baselineVersion}): ${description}`);
  return 'added';
}

export async function removeRegistryAdapterRule(input: { domain: RegistryDomain; registryId: string; ruleId: string }, user: Actor, deps: RegistryGoLiveDeps): Promise<'notPermitted' | 'removed'> {
  if (!(await deps.enforce(REGISTRY_MANAGE_CAPABILITY[input.domain], { registryId: input.registryId })).allowed) return 'notPermitted';
  const rule = (await okData<RegistryAdapterRule[]>(deps.store.listAdapterRules(input.domain, input.registryId) as any, [])).find(r => r.id === input.ruleId);
  await deps.store.removeAdapterRule(input.ruleId);
  audit(deps, user, 'Registry adapter rule removed', `${input.registryId}: local adapter rule removed${rule ? ` (${rule.element}: ${rule.description})` : ''}.`);
  return 'removed';
}

/** Confirm the local changes a newer template touched: each is re-stamped to the latest version. */
export async function confirmRegistryLocalChanges(input: { domain: RegistryDomain; registryId: string }, user: Actor, deps: RegistryGoLiveDeps): Promise<{ outcome: 'notPermitted' | 'nothingToConfirm' | 'confirmed'; count?: number }> {
  const { domain, registryId } = input;
  if (!(await deps.enforce(REGISTRY_MANAGE_CAPABILITY[domain], { registryId })).allowed) return { outcome: 'notPermitted' };
  const overlay = await overlayOf(deps, domain, registryId);
  if (!overlay.needingReview.length) return { outcome: 'nothingToConfirm' };
  const latest = latestRegistryTemplateVersion(overlay.history, deps.now())!.version;
  for (const r of overlay.adapterRules) {
    if (overlay.needingReview.some(n => n.kind === 'adapterRule' && n.id === r.id)) await deps.store.saveAdapterRule({ ...r, baselineVersion: laterVersion(latest, r.baselineVersion) });
  }
  if (overlay.needingReview.some(n => n.kind !== 'adapterRule')) await deps.restampScreening(registryId, latest);
  audit(deps, user, 'Registry local changes confirmed',
    `${registryId}: ${overlay.needingReview.length} local changes reviewed against template ${latest}: ${overlay.needingReview.map(n => `${n.kind} ${n.id} (${n.element}; touched by ${n.touchedBy.map(x => x.version).join(', ')})`).join('; ')}.`);
  return { outcome: 'confirmed', count: overlay.needingReview.length };
}

export async function saveRegistryGoLiveGovernance(next: Partial<RegistryGoLiveGovernance>, user: Actor, deps: RegistryGoLiveDeps): Promise<{ outcome: 'notPermitted' | 'saved'; governance?: RegistryGoLiveGovernance }> {
  if (!(await deps.enforce('config:registry-go-live:manage')).allowed) return { outcome: 'notPermitted' };
  const previous = await governanceOf(deps);
  const saved = await deps.store.saveGovernance({ ...previous, ...next });
  const governance = saved.ok ? saved.data : previous;
  const detail = registryGoLiveGovernanceChangeDetail(previous, governance);
  if (detail) audit(deps, user, 'Registry go-live settings changed', detail);
  return { outcome: 'saved', governance };
}
