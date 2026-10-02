// src/services/registryGoLive/registryGoLiveDeps.ts
// Batch 423, reworked in Batch 424: the real services behind registry go-live, wired once.
// The synthetic test suite and its sending stand in for the engine adapter until the
// engine team's hooks land (Pete's developer, Oct 1 2026: "model it in PathScribe for now").
import type { RegistryGoLiveDeps } from './registryGoLive';
import { registrySendGate } from './registryGoLive';
import type { RegistryDomain } from './registryTemplateVersions';
import { mockRegistryGoLiveService } from './mockRegistryGoLiveService';
import { syntheticCancerSubmissions, syntheticScreeningSubmissions } from './syntheticTestSuite';
import { deploymentInstance } from '../deployment/deploymentInstance';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { signatureGate } from '../auth/authSessionInstance';
import { mockAuditService } from '../auditlog/mockAuditService';
import { mockScreeningRegistryConfigService } from '../screeningRegistry/mockScreeningRegistryConfigService';
import { screeningRegistryDefinition } from '../screeningRegistry/screeningRegistryDefinitions';
import { registryConfigReadiness } from '../screeningRegistry/screeningRegistryEngine';
import { mockCytologyCategoryService } from '../cytology/mockCytologyCategoryService';
import { mockCytologyRegistryOutboundQueueService } from '../cytology/mockCytologyRegistryOutboundQueueService';
import { mockCancerRegistryOutboundQueueService } from '../cancerRegistry/mockCancerRegistryOutboundQueueService';
import { cancerRegistryDefinition } from '../cancerRegistry/cancerRegistryDefinitions';
import { buildRegistrySubmissionHeader, registryContentHash } from '../registrySubmission/registrySubmissionHeader';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';

/* eslint-disable @typescript-eslint/no-explicit-any */
const SYNTHETIC_FACILITY = { facilityId: 'SYN-FACILITY', facilityName: 'Synthetic test facility' };

export const registryGoLiveDeps: RegistryGoLiveDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  store: mockRegistryGoLiveService,
  instance: deploymentInstance,
  readSetup: async (domain, registryId) => {
    if (domain === 'screening') {
      const definition = screeningRegistryDefinition(registryId);
      const config = await mockScreeningRegistryConfigService.get(registryId as any);
      if (!definition || !config.ok) return {};
      const categories = await mockCytologyCategoryService.getAll();
      const readiness = registryConfigReadiness(definition, config.data, categories.ok ? categories.data : []);
      return {
        definition: { specStatus: definition.specStatus, patientIdentifierFormatId: definition.patientIdentifierFormatId, resultCoding: definition.resultCoding },
        unmappedCodes: readiness.missing.length,
        requirePatientIdentifier: !!config.data.requirePatientIdentifier,
        screeningOverlay: { codeMappings: config.data.codeMappings, requirePatientIdentifier: config.data.requirePatientIdentifier, identifierHoldBaselineVersion: config.data.identifierHoldBaselineVersion },
      };
    }
    const definition = cancerRegistryDefinition(registryId);
    return definition ? { definition: { specStatus: definition.specStatus, patientIdentifierFormatId: definition.patientIdentifierFormatId } } : {};
  },
  queueEntries: async (domain: RegistryDomain) => {
    const all = domain === 'screening' ? await mockCytologyRegistryOutboundQueueService.getAll() : await mockCancerRegistryOutboundQueueService.getAll();
    return all.ok ? (all.data as any[]) : [];
  },
  verifyStepUp: async (confirmation, recordId) => {
    const caseId = `registry-go-live:${recordId}`;
    const r = await signatureGate.accept(confirmation, { caseId, caseRef: null, actions: ['registry-go-live'] });
    signatureGate.release(caseId);
    if (r.ok === false) return { ok: false, reason: r.reason };
    return { ok: true, stepUp: { method: r.evidence.method, confirmationId: r.evidence.confirmationId, confirmedAt: r.evidence.confirmedAt } };
  },
  restampScreening: async (registryId, version) => {
    const config = await mockScreeningRegistryConfigService.get(registryId as any);
    if (!config.ok) return;
    await mockScreeningRegistryConfigService.save({
      ...config.data,
      codeMappings: config.data.codeMappings.map(m => ({ ...m, baselineVersion: version })),
      ...(config.data.requirePatientIdentifier ? { identifierHoldBaselineVersion: version } : {}),
    });
  },
  buildSuite: async (domain, registryId) => {
    const now = new Date();
    if (domain === 'cancer') {
      const definition = cancerRegistryDefinition(registryId);
      return definition ? syntheticCancerSubmissions(definition, { ...SYNTHETIC_FACILITY, now }) : [];
    }
    const definition = screeningRegistryDefinition(registryId);
    const config = await mockScreeningRegistryConfigService.get(registryId as any);
    if (!definition || !config.ok) return [];
    const categories = await mockCytologyCategoryService.getAll();
    return syntheticScreeningSubmissions(definition, config.data, categories.ok ? (categories.data as any[]) : [], { ...SYNTHETIC_FACILITY, now });
  },
  sendSynthetic: async (domain, registryId, item, templateVersion) => {
    const queue: any = domain === 'screening' ? mockCytologyRegistryOutboundQueueService : mockCancerRegistryOutboundQueueService;
    const prior = await queue.getByCaseId(item.caseRef);
    const submission = buildRegistrySubmissionHeader({
      ...SYNTHETIC_FACILITY, caseId: item.caseRef, specimenId: 'SYN-SP1', registryId,
      signOutTimestamp: new Date().toISOString(), kind: 'signOut', environment: 'test', templateVersion,
    }, prior.ok ? prior.data : []);
    const queued = await queue.enqueue({ caseId: item.caseRef, registryId, submission, contentHash: registryContentHash(item.body!), ...(domain === 'screening' ? { signOutRecordId: `${item.caseRef}-SO` } : {}) });
    if (!queued.ok) return { ok: false, error: 'Could not queue the synthetic submission.' };
    const sent = await dispatchInterfaceMessage(queued.data.id, domain === 'screening' ? 'REGISTRY_REPORT' : 'CANCER_REGISTRY_REPORT', { ...item.body, submission });
    if (sent.ok) await queue.markSent(queued.data.id);
    else await queue.markFailed(queued.data.id, { errorCode: sent.errorCode ?? 'DISPATCH_REJECTED', errorMessage: sent.error ?? 'Unknown dispatch failure.', maxRetriesExceeded: false });
    return { ok: sent.ok, error: sent.error };
  },
  releaseHeld: async (domain, registryId, user) => {
    // Loaded here, not at the top: the worklist's wiring imports this file.
    const { registryExceptionsLoadDeps, resendRegistrySubmissionDeps } = await import('../registrySubmission/registryExceptionsDeps');
    const { loadRegistryExceptions } = await import('../registrySubmission/registryExceptionsService');
    const { resendRegistrySubmission } = await import('../registrySubmission/resendRegistrySubmission');
    const queue = domain === 'screening' ? 'cytology' : 'cancer';
    const rows = (await loadRegistryExceptions(registryExceptionsLoadDeps)).filter(r => r.queue === queue && r.registryId === registryId && r.kind === 'attestationRequired');
    let resent = 0;
    for (const row of rows) {
      const r = await resendRegistrySubmission({ queue: row.queue, entryId: row.entryId }, user, resendRegistrySubmissionDeps);
      if (r.outcome === 'resent' || r.outcome === 'newVersion') resent++;
    }
    return { resent, stillHeld: rows.length - resent };
  },
  logAudit: event => mockAuditService.logEvent(event),
  now: () => new Date(),
  newId: () => globalThis.crypto.randomUUID(),
};

/** What the submission paths call first: send, hold or skip (registrySendGate.ts). */
export const registrySendGateCheck = (domain: RegistryDomain, registryId: string, synthetic = false) =>
  registrySendGate(domain, registryId, synthetic, registryGoLiveDeps);
