// src/services/cancerRegistry/dispatchCancerRegistryReportIfApplicable.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the RFP-APLIS-2026-GLOBAL Broader Cancer Registry Exports
// gap — the real trigger function, called from a real SURGICAL
// PATHOLOGY case sign-out (useSignOutWorkflow.ts's own
// handleSignOutConfirm) and ONLY from there, per
// FHIR_DISPATCH_ARCHITECTURE_PLAN.md's own already-settled, critical
// finding: this must never be triggered from cytology sign-out.
//
// Resolves the facility's own effective registry settings (Tier 1
// enterprise default + Tier 2 facility override, same real cascade
// shape as cytology's own registry settings), and — only when a real
// registry is actually configured — checks each specimen's own real
// ICD-O finding for reportability (resolveCancerRegistryReportability.ts)
// before enqueueing. Fire-and-forget: a real dispatch-side failure
// must never block the case's own, already-successful sign-out.
// ─────────────────────────────────────────────────────────────────────────────

import { mockCancerRegistrySettingsService } from './mockCancerRegistrySettingsService';
import { mockFacilityCancerRegistryOverrideService } from './mockFacilityCancerRegistryOverrideService';
import { resolveEffectiveCancerRegistrySettings } from './resolveEffectiveCancerRegistrySettings';
import { resolveCancerRegistryReportability } from './resolveCancerRegistryReportability';
import { consentExclusionMessage, evaluateRegistryConsent } from '../registryConsent/evaluateRegistryConsent';
import { mockAuditService } from '../auditlog/mockAuditService';
import { buildRegistrySubmissionHeader, registryContentHash } from '../registrySubmission/registrySubmissionHeader';
import { buildCancerRegistryReportPayload, type CancerRegistryReportPayload } from './buildCancerRegistryReportPayload';
import type { CancerRegistryId, CancerRegistrySettingsConfig } from './ICancerRegistrySettingsService';
import { mockCancerRegistryOutboundQueueService } from './mockCancerRegistryOutboundQueueService';
import type { Case } from '@/types/case/Case';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';
import { latestRegistryTemplateVersion, registryTemplateHistory } from '../registryGoLive/registryTemplateVersions';
import { registrySendGateCheck } from '../registryGoLive/registryGoLiveDeps';
import type { RegistrySendGate } from '../registryGoLive/registrySendGate';
import { cancerRegistryDefinition, type CancerRegistryMandatoryField } from './cancerRegistryDefinitions';
import { cancerMandatoryHoldMessage, missingCancerRegistryMandatoryData } from './cancerRegistryMandatoryData';

export interface DispatchCancerRegistryReportResult {
  dispatched: boolean;
  reason: string;
}

/** Batch 420: how the report reaches the interface engine (a fake in tests). */
export interface CancerRegistryDispatchDeps {
  dispatch: (queueId: string, payload: object) => Promise<{ ok: boolean; errorCode?: string; error?: string }>;
  /** Batch 424: send, hold or skip on this instance (registrySendGate.ts): a validation instance never
   *  sends a real case; production holds it until go-live is approved. */
  sendGate: (registryId: string) => Promise<RegistrySendGate>;
}
const defaultDispatchDeps: CancerRegistryDispatchDeps = {
  dispatch: (queueId, payload) => dispatchInterfaceMessage(queueId, 'CANCER_REGISTRY_REPORT', payload),
  sendGate: registryId => registrySendGateCheck('cancer', registryId),
};

/** Batch 421: everything up to (not including) queuing, so the worklist's resend can re-validate. Pure apart from reading settings. */
export interface PreparedCancerSubmission {
  outcome: 'noSettings' | 'noRegistry' | 'notReportable' | 'excludedByConsent' | 'missingMandatoryData' | 'ready';
  registryId?: CancerRegistryId;
  settings?: CancerRegistrySettingsConfig;
  body?: CancerRegistryReportPayload;
  contentHash?: string;
  consentMessage?: string;
  optOutOverriddenByStatute?: boolean;
  /** Batch 425: what the registry requires and the report lacks (outcome missingMandatoryData). */
  missingMandatory?: CancerRegistryMandatoryField[];
  holdMessage?: string;
}

export async function prepareCancerRegistrySubmission(caseData: Case, facilityId: string, facilityName: string | undefined): Promise<PreparedCancerSubmission> {
  const [enterpriseRes, overrideRes] = await Promise.all([
    mockCancerRegistrySettingsService.get(),
    mockFacilityCancerRegistryOverrideService.getForFacility(facilityId),
  ]);
  if (!enterpriseRes.ok) return { outcome: 'noSettings' };
  const effective = resolveEffectiveCancerRegistrySettings(enterpriseRes.data, overrideRes.ok ? overrideRes.data : null);
  if (effective.registryId === 'none') return { outcome: 'noRegistry' };
  // Checked per ICD-O finding: a multi-specimen case can carry reportable and non-reportable findings together.
  const anyReportable = (caseData.specimens ?? []).some(sp => (sp.coding?.icdO ?? []).some(icdO =>
    resolveCancerRegistryReportability(icdO.code, undefined, caseData.diagnostic?.primaryDiagnosis ?? '').outcome === 'reportable'));
  if (!anyReportable) return { outcome: 'notReportable', registryId: effective.registryId };
  // Batch 418 (SRS v2.1 FR-008.1): statutory unless the enterprise settings honour an opt-out.
  const consent = evaluateRegistryConsent('cancer', caseData.patient.registryConsent, enterpriseRes.data);
  if (!consent.proceed) return { outcome: 'excludedByConsent', registryId: effective.registryId, consentMessage: consentExclusionMessage('cancer', effective.registryId) };
  const body = buildCancerRegistryReportPayload(caseData, effective.registryId, facilityId, facilityName);
  // Batch 425: the registry's mandatory data, checked before anything is emitted.
  const missing = missingCancerRegistryMandatoryData(cancerRegistryDefinition(effective.registryId), body);
  if (missing.length) {
    return { outcome: 'missingMandatoryData', registryId: effective.registryId, settings: enterpriseRes.data, body, contentHash: registryContentHash(body), missingMandatory: missing, holdMessage: cancerMandatoryHoldMessage(missing, effective.registryId), optOutOverriddenByStatute: consent.optOutOverriddenByStatute };
  }
  return { outcome: 'ready', registryId: effective.registryId, settings: enterpriseRes.data, body, contentHash: registryContentHash(body), optOutOverriddenByStatute: consent.optOutOverriddenByStatute };
}

export async function dispatchCancerRegistryReportIfApplicable(
  caseData: Case,
  facilityId: string,
  facilityName: string | undefined,
  dispatchDeps: CancerRegistryDispatchDeps = defaultDispatchDeps,
): Promise<DispatchCancerRegistryReportResult> {
  const prepared = await prepareCancerRegistrySubmission(caseData, facilityId, facilityName);
  if (prepared.outcome === 'noSettings') return { dispatched: false, reason: 'Could not resolve enterprise cancer registry settings.' };
  if (prepared.outcome === 'noRegistry') return { dispatched: false, reason: 'No cancer registry configured for this facility.' };
  if (prepared.outcome === 'notReportable') return { dispatched: false, reason: 'No reportable ICD-O finding on this case.' };
  if (prepared.outcome === 'excludedByConsent') {
    mockAuditService.logEvent({ type: 'system', event: 'Registry submission excluded by consent', detail: `Case ${caseData.id}: ${prepared.consentMessage}`, user: 'system', caseId: caseData.id, confidence: null } as any);
    return { dispatched: false, reason: prepared.consentMessage! };
  }
  const registryId = prepared.registryId!;
  if (prepared.optOutOverriddenByStatute) {
    mockAuditService.logEvent({ type: 'system', event: 'Registry opt-out overridden by statute', detail: `Case ${caseData.id}: the patient opted out of cancer registry reporting, but ${registryId} reporting is statutory here. Sent.`, user: 'system', caseId: caseData.id, confidence: null } as any);
  }

  // Batch 424: the send gate first. Skip: not queued, audited.
  const gate = await dispatchDeps.sendGate(registryId);
  if (gate.action === 'skip') {
    mockAuditService.logEvent({ type: 'system', event: 'Registry submission not sent', detail: `Case ${caseData.id}: ${gate.message}`, user: 'system', caseId: caseData.id, confidence: null } as any);
    return { dispatched: false, reason: gate.message! };
  }
  // Batch 419 (SRS v2.1 FR-008.4/5/8): the payload header. A cancer report is case-level, so the
  // "specimen" is 'case'; a second sign-out of the same case is the registry's CORRECTION.
  const prior = await mockCancerRegistryOutboundQueueService.getByCaseId(caseData.id);
  const submission = buildRegistrySubmissionHeader({
    facilityId, caseId: caseData.id, specimenId: 'case', registryId,
    signOutTimestamp: caseData.diagnostic?.issuedDate ?? caseData.updatedAt ?? '',
    kind: 'signOut', environment: gate.environment,
    templateVersion: latestRegistryTemplateVersion(registryTemplateHistory('cancer', registryId), new Date())?.version,
  }, prior.ok ? prior.data : []);
  const payload = { ...prepared.body!, submission };
  const queued = await mockCancerRegistryOutboundQueueService.enqueue({ caseId: caseData.id, registryId, submission, contentHash: prepared.contentHash });
  // Batch 425: a report missing the registry's mandatory data is held (HOLD_MISSING_MANDATORY_DATA), never
  // sent; it shows on the Registry Exceptions worklist. Checked after the gate, so a validation instance
  // never queues a real case. The case's sign-out has already happened and is never held for this.
  if (queued.ok && prepared.outcome === 'missingMandatoryData') {
    await mockCancerRegistryOutboundQueueService.markFailed(queued.data.id, { errorCode: 'HOLD_MISSING_MANDATORY_DATA', errorMessage: prepared.holdMessage!, maxRetriesExceeded: false });
    mockAuditService.logEvent({ type: 'system', event: 'Registry submission held: mandatory data missing', detail: `Case ${caseData.id}: ${prepared.holdMessage}`, user: 'system', caseId: caseData.id, confidence: null } as any);
    return { dispatched: false, reason: prepared.holdMessage! };
  }
  // Batch 420: before this, a cancer registry report was queued and never sent: nothing dispatched it.
  // Batch 423/424: a live register needs a current go-live approval; without one the report is held, not sent.
  if (queued.ok && gate.action === 'hold') {
    await mockCancerRegistryOutboundQueueService.markFailed(queued.data.id, { errorCode: gate.code as any, errorMessage: gate.message!, maxRetriesExceeded: false });
    return { dispatched: false, reason: gate.message! };
  }
  if (queued.ok) {
    const sent = await dispatchDeps.dispatch(queued.data.id, payload);
    if (sent.ok) await mockCancerRegistryOutboundQueueService.markSent(queued.data.id);
    else await mockCancerRegistryOutboundQueueService.markFailed(queued.data.id, { errorCode: (sent.errorCode as any) ?? 'DISPATCH_REJECTED', errorMessage: sent.error ?? 'Unknown dispatch failure.', maxRetriesExceeded: false });
  }
  return { dispatched: true, reason: `Enqueued for ${registryId} (message ${payload.messageId}, ${submission.messageType} v${submission.submissionVersion}).` };
}
