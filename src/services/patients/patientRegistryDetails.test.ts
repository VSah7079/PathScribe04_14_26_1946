// src/services/patients/patientRegistryDetails.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  ingestRegistryConsentEvent, ingestNationalIdentifierEvent, prefillPatientRegistryDetails, registryOptOutBadge,
  caseRegistryDetails, registryDetailsChanges, saveCaseRegistryDetails, type PatientRegistryDetailsDeps,
} from './patientRegistryDetails';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';

const NHS = '9434765919'; // a valid NHS number (check digit 9)
function setup() {
  const mpi: any = { id: 'P1', registryConsent: undefined };
  const ids: any[] = [];
  const cases: any[] = [
    { id: 'C1', patient: { id: 'P1', firstName: 'A' } },
    { id: 'C2', patient: { id: 'P1', firstName: 'A', registryConsent: { screeningOptOut: false, cancerRegistryOptOut: false, recordedAt: '2026-10-05T00:00:00.000Z' } } },
  ];
  const audits: any[] = [];
  const beforeSave: Array<(c: any) => void> = [];
  const deps: PatientRegistryDetailsDeps = {
    resolvePatient: async (a, v) => (a === 'HOSP' && v === 'MRN1' ? 'P1' : null),
    getPatient: async () => mpi,
    listNationalIdentifiers: async () => ids,
    recordInMpi: vi.fn(async (_p, i) => { const k = ids.findIndex(x => x.system === i.system); if (k >= 0) ids.splice(k, 1); ids.push(i); }),
    setConsentInMpi: vi.fn(async (_p, c) => { mpi.registryConsent = c; }),
    casesForPatient: async () => cases,
    // PS-71 (Batch 458): a versioned store.
    getCase: async id => structuredClone(cases.find(c => c.id === id)),
    updateCase: vi.fn(async (id, patch, expectedVersion) => {
      const c = cases.find(x => x.id === id);
      beforeSave.splice(0).forEach(f => f(c));
      if ((c.version ?? 0) !== expectedVersion) throw new ConcurrencyConflictError(id, expectedVersion, c.version ?? 0);
      c.patient = patch.patient; c.version = (c.version ?? 0) + 1;
    }),
    logAudit: e => audits.push(e),
  };
  return { mpi, ids, cases, audits, deps, beforeSave };
}
const consent = (updatedAt: string, screeningOptOut = true) => JSON.stringify({ event: 'REGISTRY_CONSENT_UPDATED', patient: { assigningAuthority: 'HOSP', identifierValue: 'MRN1' }, screeningOptOut, cancerRegistryOptOut: false, updatedAt });

describe('registry consent intake (Batch 425): patient-level, newest updatedAt wins', () => {
  it('applies to the MPI and to each case older than it', async () => {
    const { mpi, cases, audits, deps } = setup();
    expect(await ingestRegistryConsentEvent(consent('2026-10-02T00:00:00Z'), deps)).toEqual({ outcome: 'applied', patientId: 'P1', casesUpdated: 1 });
    expect(mpi.registryConsent).toEqual({ screeningOptOut: true, cancerRegistryOptOut: false, recordedAt: '2026-10-02T00:00:00.000Z', source: 'hl7' });
    expect(cases[0].patient.registryConsent.screeningOptOut).toBe(true);
    expect(cases[1].patient.registryConsent.recordedAt).toBe('2026-10-05T00:00:00.000Z'); // a newer one was already there
    expect(audits[0].event).toBe('Registry opt-out received');
  });
  it('an older message after a newer one changes nothing', async () => {
    const { deps, mpi } = setup();
    await ingestRegistryConsentEvent(consent('2026-10-06T00:00:00Z'), deps);
    expect((await ingestRegistryConsentEvent(consent('2026-10-03T00:00:00Z', false), deps)).outcome).toBe('stale');
    expect(mpi.registryConsent.screeningOptOut).toBe(true);
  });
  it('refuses unreadable messages and unknown patients', async () => {
    const { deps } = setup();
    expect((await ingestRegistryConsentEvent('{', deps)).outcome).toBe('unparseable');
    expect((await ingestRegistryConsentEvent(JSON.stringify({ event: 'REGISTRY_CONSENT_UPDATED', patient: { assigningAuthority: 'HOSP', identifierValue: 'MRN1' }, updatedAt: '2026-10-01T00:00:00Z' }), deps)).outcome).toBe('unparseable');
    expect((await ingestRegistryConsentEvent(consent('2026-10-01T00:00:00Z').replace('MRN1', 'NOPE'), deps)).outcome).toBe('unknownPatient');
  });
});

describe('national identifier intake (Batch 425)', () => {
  const msg = (updatedAt: string, value = NHS) => JSON.stringify({ event: 'DEMOGRAPHICS_UPDATED', patient: { assigningAuthority: 'HOSP', identifierValue: 'MRN1' }, nationalIdentifiers: [{ system: 'mrn_nhs', value }], updatedAt });
  it('records the identifier with its check digit result in the MPI and on the cases, never the value in the audit', async () => {
    const { ids, cases, audits, deps } = setup();
    expect(await ingestNationalIdentifierEvent(msg('2026-10-02T00:00:00Z'), deps)).toMatchObject({ outcome: 'applied', recorded: ['mrn_nhs'], casesUpdated: 2 });
    expect(ids[0]).toMatchObject({ system: 'mrn_nhs', value: NHS, verificationStatus: 'verified', source: 'hl7', verifiedAt: '2026-10-02T00:00:00.000Z' });
    expect(cases[0].patient.nationalIdentifiers).toEqual([expect.objectContaining({ system: 'mrn_nhs', value: NHS })]);
    expect(audits[0].detail).toContain('mrn_nhs verified');
    expect(audits[0].detail).not.toContain(NHS);
  });
  it('an older value doesn\'t replace a newer one', async () => {
    const { ids, deps } = setup();
    await ingestNationalIdentifierEvent(msg('2026-10-05T00:00:00Z'), deps);
    expect(await ingestNationalIdentifierEvent(msg('2026-10-01T00:00:00Z', '9434765870'), deps)).toMatchObject({ outcome: 'stale', skipped: ['mrn_nhs'] });
    expect(ids[0].value).toBe(NHS);
  });
});

describe('prefill, badge and the editor after accessioning (Batch 425)', () => {
  it('prefill gives the Accession page what the MPI holds', async () => {
    const { deps, mpi, ids } = setup();
    ids.push({ system: 'mrn_nhs', value: NHS, verificationStatus: 'verified' });
    mpi.registryConsent = { screeningOptOut: false, cancerRegistryOptOut: true, recordedAt: 'x' };
    expect(await prefillPatientRegistryDetails('P1', deps)).toEqual({ nationalIds: { mrn_nhs: NHS }, consent: { screeningOptOut: false, cancerRegistryOptOut: true } });
  });
  it('the badge', () => {
    expect(registryOptOutBadge(undefined)).toBe('none');
    expect(registryOptOutBadge({ screeningOptOut: true, cancerRegistryOptOut: true, recordedAt: '' })).toBe('both');
    expect(registryOptOutBadge({ screeningOptOut: false, cancerRegistryOptOut: true, recordedAt: '' })).toBe('cancer');
    expect(registryOptOutBadge({ screeningOptOut: false, cancerRegistryOptOut: false, recordedAt: '' })).toBe('none');
  });
  it('saves only what changed, each through its own service (an identifier change announces an A08)', async () => {
    const before = caseRegistryDetails({ nationalIdentifiers: [{ system: 'mrn_nhs', value: NHS, verificationStatus: 'verified' }] });
    const after = { nationalIds: { mrn_nhs: '943 476 5919', mrn_chi: '1234567890' }, consent: { screeningOptOut: true, cancerRegistryOptOut: false } };
    expect(registryDetailsChanges(before, after)).toEqual({ identifiers: [{ system: 'mrn_chi', value: '1234567890' }], consentChanged: true });
    const recordIdentifier = vi.fn(async () => ({ outcome: 'saved' }));
    const recordConsent = vi.fn(async () => ({ outcome: 'notPermitted' }));
    expect(await saveCaseRegistryDetails({ caseId: 'C1', before, after }, { recordIdentifier, recordConsent })).toEqual({ outcome: 'partlyRefused', identifiersSaved: 1, consentSaved: false });
    expect(recordIdentifier).toHaveBeenCalledWith({ caseId: 'C1', system: 'mrn_chi', value: '1234567890', announce: true });
    expect((await saveCaseRegistryDetails({ caseId: 'C1', before, after: before }, { recordIdentifier, recordConsent })).outcome).toBe('unchanged');
  });
});

describe('PS-71 (Batch 458): each case of the patient saved on its own, against its version', () => {
  const msg = (updatedAt: string) => JSON.stringify({ event: 'DEMOGRAPHICS_UPDATED', patient: { assigningAuthority: 'HOSP', identifierValue: 'MRN1' }, nationalIdentifiers: [{ system: 'mrn_nhs', value: NHS }], updatedAt });
  it('a patient detail saved on one case in between is kept, and the identifier still lands on every case', async () => {
    const { cases, deps, beforeSave } = setup();
    beforeSave.push(c => { c.patient = { ...c.patient, lastName: 'Theirs' }; c.version = 1; });
    expect(await ingestNationalIdentifierEvent(msg('2026-10-02T00:00:00Z'), deps)).toMatchObject({ outcome: 'applied', casesUpdated: 2 });
    expect(cases[0].patient).toMatchObject({ lastName: 'Theirs', nationalIdentifiers: [expect.objectContaining({ system: 'mrn_nhs' })] });
    expect(cases[1].patient.nationalIdentifiers).toHaveLength(1);
  });

  it('a case that keeps conflicting is reported and audited, the other cases are still updated', async () => {
    const { cases, deps, audits } = setup();
    const save = deps.updateCase;
    deps.updateCase = vi.fn(async (id: string, patch: any, v: number) => {
      if (id === 'C1') throw new ConcurrencyConflictError(id, v, v + 1);
      return save(id, patch, v);
    });
    const r = await ingestRegistryConsentEvent(consent('2026-10-06T00:00:00Z'), deps);
    expect(r).toMatchObject({ outcome: 'applied', casesUpdated: 1, casesConflicted: ['C1'] });
    expect(cases[0].patient.registryConsent).toBeUndefined();
    expect(cases[1].patient.registryConsent.recordedAt).toBe('2026-10-06T00:00:00.000Z');
    expect(audits.map(a => a.event)).toContain('Registry consent not applied to a case (edit conflict)');
  });

  it('the editor reports a conflict as a conflict, not a permission refusal', async () => {
    const before = { nationalIds: {}, consent: { screeningOptOut: false, cancerRegistryOptOut: false } };
    const after = { nationalIds: { mrn_nhs: NHS }, consent: { screeningOptOut: true, cancerRegistryOptOut: false } };
    const r = await saveCaseRegistryDetails({ caseId: 'C1', before, after }, {
      recordIdentifier: async () => ({ outcome: 'conflict' }),
      recordConsent: async () => ({ outcome: 'saved' }),
    });
    expect(r).toEqual({ outcome: 'conflict', identifiersSaved: 0, consentSaved: true });
  });
});
