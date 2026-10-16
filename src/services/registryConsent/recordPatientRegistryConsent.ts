// src/services/registryConsent/recordPatientRegistryConsent.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 418 (SRS v2.1 FR-008.1). The one way a person records a patient's
// registry opt-outs: permission checked, written to the case's patient and
// mirrored to the MPI, audited. Clearing both flags removes the record.
// ─────────────────────────────────────────────────────────────────────────────

import type { Patient } from '@/types/case/Patient';
import type { PatientRegistryConsent } from '@/types/patient/PatientRegistryConsent';
import { updateCaseWithRetry } from '../cases/caseWrite';

export interface RecordRegistryConsentDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  getCase: (caseId: string) => Promise<{ id: string; patient: Patient; version?: number } | null | undefined>;
  /** PS-71 (Batch 458): saves against the version of the case the change was built from. */
  updateCase: (caseId: string, patch: { patient: Patient }, expectedVersion: number) => Promise<unknown>;
  setInMpi: (patientId: string, consent: PatientRegistryConsent | undefined) => Promise<unknown>;
  logAudit: (event: any) => unknown;
  now: () => string;
}

export interface RecordRegistryConsentOutcome {
  /** 'conflict' (PS-71): the case kept changing under the save; nothing was saved. */
  outcome: 'notPermitted' | 'caseNotFound' | 'saved' | 'cleared' | 'conflict';
  consent?: PatientRegistryConsent;
}

export async function recordPatientRegistryConsent(
  input: { caseId: string; screeningOptOut: boolean; cancerRegistryOptOut: boolean; source?: PatientRegistryConsent['source'] },
  user: { id: string; name: string },
  deps: RecordRegistryConsentDeps,
): Promise<RecordRegistryConsentOutcome> {
  const decision = await deps.enforce('patient:registry-consent:record', { caseId: input.caseId });
  if (!decision.allowed) return { outcome: 'notPermitted' };
  const c = await deps.getCase(input.caseId);
  if (!c) return { outcome: 'caseNotFound' };

  const cleared = !input.screeningOptOut && !input.cancerRegistryOptOut;
  const consent: PatientRegistryConsent | undefined = cleared ? undefined : {
    screeningOptOut: input.screeningOptOut, cancerRegistryOptOut: input.cancerRegistryOptOut,
    recordedAt: deps.now(), recordedBy: user.id, source: input.source ?? 'manual',
  };
  // PS-71 (Batch 458): the opt-outs are set on the newest copy of the case's
  // patient and saved with that case's version (updateCaseWithRetry), so a
  // patient detail saved in between is kept. Nothing else (MPI, audit)
  // happens unless the save landed.
  const w = await updateCaseWithRetry(c.id, current => {
    const { registryConsent: _old, ...rest } = ((current as any).patient ?? {}) as Patient;
    const patient: Patient = consent ? { ...rest, registryConsent: consent } : rest;
    return { patient };
  }, {
    getCase: id => deps.getCase(id) as Promise<any>,
    updateCase: async (id, updates, expectedVersion) => { await deps.updateCase(id, updates as { patient: Patient }, expectedVersion); },
  });
  if (w.ok === false) return { outcome: w.reason === 'notFound' ? 'caseNotFound' : 'conflict' };
  if (c.patient.id) await deps.setInMpi(c.patient.id, consent);
  deps.logAudit({
    type: 'user', event: cleared ? 'Registry opt-out cleared' : 'Registry opt-out recorded',
    detail: cleared ? `Case ${c.id}: no registry opt-out` : `Case ${c.id}: screening opt-out ${input.screeningOptOut ? 'yes' : 'no'}, cancer registry opt-out ${input.cancerRegistryOptOut ? 'yes' : 'no'}`,
    user: user.name || user.id, caseId: c.id, confidence: null,
  });
  return cleared ? { outcome: 'cleared' } : { outcome: 'saved', consent };
}
