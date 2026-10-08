// src/services/screeningRegistry/submitScreeningRegistryResult.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 419. One specimen's result to the facility's cervical screening
// registry, for a sign-out (Batch 414 logic, moved here from
// signOutCytologyCase.ts) and now also for a correction or an addendum
// (Registry Engine SRS v2.1, FR-008.4), so the registry receives every
// version of the result, each linked to the first.
//
//   1. No registry for the facility, or the specimen isn't eligible (Non-GYN):
//      nothing.
//   2. The patient opted out (Batch 418): excluded, audited, never resent.
//   3. A header (registrySubmissionHeader.ts): the version after the last one
//      for this specimen and registry, NEW / CORRECTION / AMENDMENT, and the
//      lab's environment ('test' until the lab sets 'production').
//   4. Batch 424: the send gate (services/registryGoLive/registrySendGate.ts).
//      A validation instance never sends a real case (not queued; audited). A
//      production instance holds it REGISTRY_LIVE_NOT_APPROVED without a
//      current go-live approval ("held: attestation required"). The header's
//      environment is the instance's, no longer a setting.
//   5. Held when not ready (identifier, codes): queued with its header, marked
//      failed REGISTRY_NOT_READY.
//   5. Otherwise built with the header and sent.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologySignOutRecord } from '@/types/cytology/CytologySignOutRecord';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import type { CytologyCategoryEntry } from '../cytology/ICytologyCategoryService';
import type { ScreeningRegistryConfig } from './IScreeningRegistryConfigService';
import { screeningRegistryDefinition, type ScreeningRegistryDefinition } from './screeningRegistryDefinitions';
import { buildScreeningRegistryPayload, decideRegistrySubmission, registryHoldMessage } from './screeningRegistryEngine';
import { resolveEffectiveRegistrySettings } from '../facilities/resolveEffectiveRegistrySettings';
import { isUnsatisfactoryAdequacy } from '../cytology/classifyCytologyAgreement';
import { consentExclusionMessage, evaluateRegistryConsent } from '../registryConsent/evaluateRegistryConsent';
import { latestRegistryTemplateVersion, registryTemplateHistory } from '../registryGoLive/registryTemplateVersions';
import type { RegistrySendGate } from '../registryGoLive/registrySendGate';
import { buildRegistrySubmissionHeader, registryContentHash, type PriorRegistrySubmission, type RegistrySubmissionHeader, type RegistrySubmissionKind } from '../registrySubmission/registrySubmissionHeader';
import { updateCaseWithRetryOrThrow } from '../cases/caseWrite';

type Result<T> = { ok: true; data: T } | { ok: false; error?: string };
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ScreeningRegistrySubmitDeps {
  getRegistrySettings: (facilityId: string) => Promise<{ enterprise: any; facility: any }>;
  getRegistryConfig: (registryId: any) => Promise<ScreeningRegistryConfig>;
  registryQueue: {
    enqueue: (entry: { caseId: string; signOutRecordId: string; registryId: string; submission?: RegistrySubmissionHeader; contentHash?: string }) => Promise<Result<{ id: string }>>;
    markSent: (id: string) => Promise<unknown>;
    markFailed: (id: string, failure: { errorCode: string; errorMessage: string; maxRetriesExceeded: boolean }) => Promise<unknown>;
    /** Batch 419: earlier submissions for the case, for the version and message type. Absent: none. */
    getByCaseId?: (caseId: string) => Promise<Result<PriorRegistrySubmission[]>>;
  };
  dispatchInterfaceMessage: (queueId: string, kind: string, payload: any) => Promise<{ ok: boolean; errorCode?: string; error?: string }>;
  logAudit: (event: any) => unknown;
  /** Batch 424: send, hold or skip on this instance (registrySendGate.ts). */
  sendGate: (registryId: string) => Promise<RegistrySendGate>;
  /** PS-71 (Batch 458): the eligibility flag is saved against the case as read, with its version. */
  getCase: (caseId: string) => Promise<any | null | undefined>;
  updateCase: (caseId: string, patch: Record<string, unknown>, expectedVersion: number) => Promise<unknown>;
  now: () => Date;
  newId: () => string;
}

export interface ScreeningRegistrySubmitInput {
  caseData: any;
  record: CytologySignOutRecord;
  /** The review whose coded result is reported (for an addendum, the one it adds to). */
  review: Pick<CytologyReviewRecord, 'adequacySelections' | 'primaryInterpretationId' | 'additionalInterpretations' | 'recommendations'>;
  categories: CytologyCategoryEntry[];
  isGynCytology: boolean;
  kind: RegistrySubmissionKind;
}

export interface ScreeningRegistrySubmitOutcome {
  outcome: 'noRegistry' | 'excludedByConsent' | 'notEligible' | 'notSent' | 'queueFailed' | 'held' | 'failed' | 'sent';
  queueId?: string;
  submission?: RegistrySubmissionHeader;
}

/** Batch 421: everything up to (not including) queuing: the registry, consent, the decision
 *  and the payload body. Used by the submission and, read-only, by the worklist's resend. */
export interface PreparedScreeningSubmission {
  outcome: 'noRegistry' | 'excludedByConsent' | 'notEligible' | 'ready';
  facilityId?: string;
  definition?: ScreeningRegistryDefinition;
  config?: ScreeningRegistryConfig;
  decision?: ReturnType<typeof decideRegistrySubmission>;
  /** The payload without its header. */
  body?: object;
  contentHash?: string;
  consentMessage?: string;
}

export async function prepareScreeningRegistrySubmission(
  input: Omit<ScreeningRegistrySubmitInput, 'kind'>,
  deps: Pick<ScreeningRegistrySubmitDeps, 'getRegistrySettings' | 'getRegistryConfig'>,
): Promise<PreparedScreeningSubmission> {
  const { caseData, record, review, categories } = input;
  const order = caseData.order as any;
  const facilityId = order?.facilityId as string | undefined;
  if (!facilityId) return { outcome: 'noRegistry' };
  const settings = await deps.getRegistrySettings(facilityId);
  const effective = resolveEffectiveRegistrySettings(settings.enterprise ?? { registryId: 'none' }, settings.facility ?? null);
  const definition = screeningRegistryDefinition(effective.registryId);
  if (!definition) return { outcome: 'noRegistry' };
  // Batch 418 (SRS v2.1 FR-008.1): every cervical screening programme honours an opt-out.
  const consent = evaluateRegistryConsent('screening', caseData.patient?.registryConsent);
  if (!consent.proceed) return { outcome: 'excludedByConsent', facilityId, definition, consentMessage: consentExclusionMessage('screening', definition.id) };
  const config = await deps.getRegistryConfig(definition.id);
  const decision = decideRegistrySubmission(definition, config, { isGynCytology: input.isGynCytology, patient: caseData.patient, review });
  if (!decision.eligible) return { outcome: 'notEligible', facilityId, definition, config, decision };
  const body = buildScreeningRegistryPayload(definition, decision, record, {
    facilityId, facilityName: order?.facilityName, reasonForStudy: order?.reasonForStudy,
    primaryInterpretationId: review.primaryInterpretationId,
    isUnsatisfactory: isUnsatisfactoryAdequacy(review.adequacySelections?.map(s => s.categoryId), categories),
    additionalInterpretationIds: review.additionalInterpretations?.map(s => s.categoryId),
    patient: caseData.patient,
  });
  return { outcome: 'ready', facilityId, definition, config, decision, body, contentHash: registryContentHash(body) };
}

export async function submitScreeningRegistryResult(input: ScreeningRegistrySubmitInput, deps: ScreeningRegistrySubmitDeps): Promise<ScreeningRegistrySubmitOutcome> {
  const { caseData, record } = input;
  const prepared = await prepareScreeningRegistrySubmission(input, deps);
  if (prepared.outcome === 'noRegistry') return { outcome: 'noRegistry' };
  const definition = prepared.definition!;
  if (prepared.outcome === 'excludedByConsent') {
    const message = prepared.consentMessage!;
    deps.logAudit({ type: 'system', event: 'Registry submission excluded by consent', detail: `Case ${caseData.id}: ${message}`, user: 'system', caseId: caseData.id, confidence: null });
    const excluded = await deps.registryQueue.enqueue({ caseId: caseData.id, signOutRecordId: record.id, registryId: definition.id });
    if (excluded.ok) await deps.registryQueue.markFailed(excluded.data.id, { errorCode: 'EXCLUDED_BY_CONSENT', errorMessage: message, maxRetriesExceeded: true });
    return { outcome: 'excludedByConsent', queueId: excluded.ok ? excluded.data.id : undefined };
  }
  if (prepared.outcome === 'notEligible') return { outcome: 'notEligible' };
  const { facilityId, decision, body, contentHash } = prepared as Required<PreparedScreeningSubmission>;
  const order = caseData.order as any;

  const gate = await deps.sendGate(definition.id);
  if (gate.action === 'skip') {
    deps.logAudit({ type: 'system', event: 'Registry submission not sent', detail: `Case ${caseData.id}: ${gate.message}`, user: 'system', caseId: caseData.id, confidence: null });
    return { outcome: 'notSent' };
  }
  const priorRes = deps.registryQueue.getByCaseId ? await deps.registryQueue.getByCaseId(caseData.id) : { ok: true as const, data: [] };
  const submission = buildRegistrySubmissionHeader({
    facilityId, caseId: caseData.id, specimenId: record.specimenId, registryId: definition.id,
    signOutTimestamp: record.signedAt, kind: input.kind, environment: gate.environment,
    templateVersion: latestRegistryTemplateVersion(registryTemplateHistory('screening', definition.id), deps.now())?.version,
  }, priorRes.ok ? priorRes.data : []);

  const queued = await deps.registryQueue.enqueue({ caseId: caseData.id, signOutRecordId: record.id, registryId: definition.id, submission, contentHash });
  if (!queued.ok) return { outcome: 'queueFailed', submission };
  if (decision.holdReasons.length) {
    await deps.registryQueue.markFailed(queued.data.id, { errorCode: 'REGISTRY_NOT_READY', errorMessage: registryHoldMessage(decision, definition), maxRetriesExceeded: false });
    return { outcome: 'held', queueId: queued.data.id, submission };
  }
  if (gate.action === 'hold') {
    await deps.registryQueue.markFailed(queued.data.id, { errorCode: gate.code!, errorMessage: gate.message!, maxRetriesExceeded: false });
    return { outcome: 'held', queueId: queued.data.id, submission };
  }
  const payload = { ...body, submission };
  const sent = await deps.dispatchInterfaceMessage(queued.data.id, 'REGISTRY_REPORT', payload);
  if (!sent.ok) {
    await deps.registryQueue.markFailed(queued.data.id, { errorCode: sent.errorCode ?? 'DISPATCH_REJECTED', errorMessage: sent.error ?? 'Unknown dispatch failure.', maxRetriesExceeded: false });
    return { outcome: 'failed', queueId: queued.data.id, submission };
  }
  await deps.registryQueue.markSent(queued.data.id);

  // The registry's case-level flag (CSMS: no reason for study), once per case, on the first submission only.
  const flag = definition.eligibilityFlag;
  if (input.kind === 'signOut' && flag?.when === 'missingReasonForStudy' && !order?.reasonForStudy) {
    // PS-71 (Batch 458): the flag list is rebuilt from the case as read for
    // the save, with its version, so a flag someone else added in between is
    // kept; nothing is written if the flag is already there.
    const newFlag = {
      id: 'registry-elig-' + deps.newId(), flagDefinitionId: flag.flagDefinitionId, appliedAt: deps.now().toISOString(),
      appliedBy: 'system', source: 'system', deletedAt: null, deletedBy: null,
    };
    await updateCaseWithRetryOrThrow(caseData.id, current => {
      const existingFlags: any[] = (current as any).caseFlags ?? [];
      if (existingFlags.some((f: any) => f.flagDefinitionId === flag.flagDefinitionId && !f.deletedAt)) return null;
      return { caseFlags: [...existingFlags, newFlag] } as any;
    }, {
      getCase: deps.getCase,
      updateCase: async (id, updates, expectedVersion) => { await deps.updateCase(id, updates as Record<string, unknown>, expectedVersion); },
    });
  }
  return { outcome: 'sent', queueId: queued.data.id, submission };
}
