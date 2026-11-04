// src/services/registryGoLive/registryGoLive.test.ts
// Batch 423 (Registry Engine SRS v2.1, step 7) and Batch 424 (validation vs production
// instances, synthetic test data only, the validation record, the local overlay, catch-up).
import { describe, it, expect, vi } from 'vitest';
import {
  compareRegistryTemplateVersions, parseRegistryTemplateVersion, registryLiveStatus, registryTemplateHistory, versionNeedsReapproval,
  type RegistryTemplateVersion,
} from './registryTemplateVersions';
import {
  checkRegistryGoLiveApproval, countAcceptedTestSubmissions, normalizeRegistryGoLiveGovernance, registryAdapterState, registryGoLiveAuditStatement,
  registryGoLivePrechecks, registryGoLiveProgress, type RegistryGoLiveApproval, type RegistryGoLiveGovernance, type RegistryGoLiveRecord,
} from './registryGoLiveRules';
import { localChangesNeedingReview, registryLocalChanges, stampCodeMappings } from './registryOverlay';
import { registrySendDecision } from './registrySendGate';
import { buildValidationRecord, checkValidationRecord } from './registryValidationRecord';
import { syntheticCancerSubmissions, syntheticIdentifier, syntheticScreeningSubmissions } from './syntheticTestSuite';
import { checkRegistryPayloadBoundary } from '../interfaceDispatch/registryPayloadBoundary';
import { verifyNationalIdentifier } from '../patientIdentifiers/checkDigits';
import { screeningRegistryDefinition } from '../screeningRegistry/screeningRegistryDefinitions';
import { cancerRegistryDefinition } from '../cancerRegistry/cancerRegistryDefinitions';
import { instanceRoleFrom } from '../deployment/deploymentInstance';
import {
  approveRegistryGoLive, confirmRegistryLocalChanges, exportRegistryValidation, importRegistryValidation, loadRegistryGoLive,
  recordRegistryAgreement, registrySendGate, requestRegistryGoLive, runRegistryTestSuite, saveRegistryGoLiveGovernance,
  stopRegistryLiveReporting, withdrawRegistryGoLive, addRegistryAdapterRule, type RegistryGoLiveDeps,
} from './registryGoLive';
import type { IRegistryGoLiveService, RegistryAgreement, StoredValidationRecord } from './IRegistryGoLiveService';
import type { RegistryAdapterRule } from './registryOverlay';
import type { SignatureConfirmation } from '../auth/signerConfirmation';

const v = (version: string, changeClass: RegistryTemplateVersion['changeClass'], publishedOn: string, effectiveOn: string, changes?: RegistryTemplateVersion['changes']): RegistryTemplateVersion => ({ version, changeClass, publishedOn, effectiveOn, ...(changes ? { changes } : {}) });
const day = (iso: string) => new Date(`${iso}T12:00:00Z`);
const base = v('v2026.4.1', 'initial', '2026-10-01', '2026-10-01');

describe('registry template versions (vYYYY.Q.X)', () => {
  it('parses and orders versions', () => {
    expect(parseRegistryTemplateVersion('v2026.4.1')).toEqual({ year: 2026, quarter: 4, release: 1 });
    expect(parseRegistryTemplateVersion('v2026.5.1')).toBeNull();
    expect(compareRegistryTemplateVersions('v2026.4.2', 'v2026.4.10')).toBeLessThan(0);
    expect(compareRegistryTemplateVersions('v2027.1.1', 'v2026.4.9')).toBeGreaterThan(0);
  });

  it('every screening and cancer definition starts at v2026.4.1', () => {
    expect(registryTemplateHistory('screening', 'csms_uk').map(x => x.version)).toEqual(['v2026.4.1']);
    expect(registryTemplateHistory('cancer', 'ncri_ireland').map(x => x.version)).toEqual(['v2026.4.1']);
  });

  it('editorial never holds; unpublished versions do not count', () => {
    const h = [base, v('v2026.4.2', 'editorial', '2026-10-05', '2026-10-05'), v('v2027.1.1', 'breaking', '2027-01-15', '2027-02-01')];
    expect(registryLiveStatus('v2026.4.1', h, day('2026-12-01')).state).toBe('current');
  });

  it('a minor change with no change list: 30 days from its effective date, then holds', () => {
    const h = [base, v('v2026.4.2', 'minor', '2026-10-10', '2026-11-01')];
    expect(registryLiveStatus('v2026.4.1', h, day('2026-11-30'))).toMatchObject({ state: 'reapprovalDue', holdsFrom: '2026-12-01' });
    expect(registryLiveStatus('v2026.4.1', h, day('2026-12-01')).state).toBe('expired');
  });

  it('Batch 424: a minor change only needs re-approval when it touches what the site customised; breaking always', () => {
    const minor = v('v2026.4.2', 'minor', '2026-10-10', '2026-11-01', [{ element: 'codes:recommendation', changeClass: 'minor', note: 'New follow-up codes' }]);
    expect(versionNeedsReapproval(minor, ['codes:adequacy'])).toBe(false);
    expect(versionNeedsReapproval(minor, ['codes:recommendation'])).toBe(true);
    expect(registryLiveStatus('v2026.4.1', [base, minor], day('2026-12-15'), ['codes:adequacy']).state).toBe('current');
    expect(registryLiveStatus('v2026.4.1', [base, minor], day('2026-12-15'), ['codes:recommendation']).state).toBe('expired');
    const breaking = v('v2026.4.2', 'breaking', '2026-10-10', '2026-11-01', [{ element: 'segments', changeClass: 'breaking', note: 'OBX order' }]);
    expect(registryLiveStatus('v2026.4.1', [base, breaking], day('2026-11-01'), []).state).toBe('expired');
  });
});

describe('the local overlay (Batch 424)', () => {
  const minor = v('v2026.4.2', 'minor', '2026-10-10', '2026-11-01', [{ element: 'codes:recommendation', changeClass: 'minor', note: 'New follow-up codes' }]);
  it('flags only the local changes a newer version touches', () => {
    const changes = registryLocalChanges(
      { codeMappings: [{ field: 'recommendation', categoryId: 'r1', code: 'R1' }, { field: 'adequacy', categoryId: 'a1', code: 'A1' }], requirePatientIdentifier: true },
      [{ id: 'ar1', domain: 'screening', registryId: 'x', element: 'segments', description: 'OBX-5 trimmed', baselineVersion: 'v2026.4.1', recordedBy: 'C', recordedAt: 't' }],
    );
    expect(changes.map(c => c.kind)).toEqual(['codeMapping', 'codeMapping', 'holdRule', 'adapterRule']);
    const review = localChangesNeedingReview(changes, [base, minor], day('2026-10-15'));
    expect(review.map(r => r.id)).toEqual(['recommendation:r1']);
    expect(review[0].touchedBy).toEqual([{ version: 'v2026.4.2', changeClass: 'minor', note: 'New follow-up codes' }]);
    expect(localChangesNeedingReview(changes.map(c => ({ ...c, baselineVersion: 'v2026.4.2' })), [base, minor], day('2026-10-15'))).toEqual([]);
  });

  it('a save keeps the stamp of a mapping it didn\'t change and stamps new or changed ones', () => {
    const prev = [{ field: 'adequacy' as const, categoryId: 'a', code: 'A', baselineVersion: 'v2026.4.1' }, { field: 'adequacy' as const, categoryId: 'b', code: 'B' }];
    const next = [{ field: 'adequacy' as const, categoryId: 'a', code: 'A' }, { field: 'adequacy' as const, categoryId: 'b', code: 'B2' }, { field: 'adequacy' as const, categoryId: 'c', code: 'C' }];
    expect(stampCodeMappings(next, prev, 'v2027.1.1').map(m => m.baselineVersion)).toEqual(['v2026.4.1', 'v2027.1.1', 'v2027.1.1']);
  });
});

describe('the send gate: only test data to test systems, only real data to live registers (Batch 424)', () => {
  const current = { state: 'current' as const };
  const none = { state: 'notApproved' as const };
  it('production: real results go live only with a current approval, otherwise held; synthetic never', () => {
    expect(registrySendDecision({ role: 'production', synthetic: false, registryId: 'x', liveStatus: current, agreementRecorded: true })).toEqual({ action: 'send', environment: 'production' });
    expect(registrySendDecision({ role: 'production', synthetic: false, registryId: 'x', liveStatus: none, agreementRecorded: true })).toMatchObject({ action: 'hold', code: 'REGISTRY_LIVE_NOT_APPROVED', environment: 'production' });
    expect(registrySendDecision({ role: 'production', synthetic: true, registryId: 'x', liveStatus: current, agreementRecorded: true })).toMatchObject({ action: 'skip', skipReason: 'syntheticOnProduction' });
  });
  it('validation: real cases never; synthetic only once the agreement is recorded, to the test system', () => {
    expect(registrySendDecision({ role: 'validation', synthetic: false, registryId: 'x', liveStatus: current, agreementRecorded: true })).toMatchObject({ action: 'skip', skipReason: 'realCaseOnValidation' });
    expect(registrySendDecision({ role: 'validation', synthetic: true, registryId: 'x', liveStatus: none, agreementRecorded: false })).toMatchObject({ action: 'skip', skipReason: 'registryPending' });
    expect(registrySendDecision({ role: 'validation', synthetic: true, registryId: 'x', liveStatus: none, agreementRecorded: true })).toEqual({ action: 'send', environment: 'test' });
  });
  it('an instance nobody declared as production is a validation instance (fails closed)', () => {
    expect(instanceRoleFrom('production')).toBe('production');
    expect(instanceRoleFrom(' Production ')).toBe('production');
    for (const raw of [undefined, '', 'validation', 'training', 'development', 'prod']) expect(instanceRoleFrom(raw)).toBe('validation');
  });
  it('the boundary check repeats it on the payload itself', () => {
    const real = { patient: { mrn: 'MRN1' }, submission: { environment: 'production' } };
    const synth = { patient: { mrn: 'SYN-MRN-1' }, synthetic: { suite: 's', caseRef: 'SYN-1' }, submission: { environment: 'test' } };
    expect(checkRegistryPayloadBoundary('REGISTRY_REPORT', real, 'production')).toBeNull();
    expect(checkRegistryPayloadBoundary('REGISTRY_REPORT', synth, 'production')).toMatch(/production instance sends only to live registers/);
    expect(checkRegistryPayloadBoundary('CANCER_REGISTRY_REPORT', synth, 'validation')).toBeNull();
    expect(checkRegistryPayloadBoundary('CANCER_REGISTRY_REPORT', { ...real, submission: { environment: 'test' } }, 'validation')).toMatch(/never real patient data/);
    expect(checkRegistryPayloadBoundary('ORU_R01', real, 'validation')).toBeNull();
  });
});

describe('the synthetic test suite (Batch 424)', () => {
  it('synthetic national identifiers pass their check digits; NHS numbers are in the 999 test range', () => {
    for (const formatId of ['mrn_nhs', 'mrn_chi', 'mrn_hc', 'mrn_bsn', 'id_ie_ihi', 'mrn_ihi', 'mrn_nhi', 'mrn_kvnr', 'mrn_be', 'mrn_ins', 'id_ca_phn']) {
      const value = syntheticIdentifier(formatId, 1);
      expect(value, formatId).toBeDefined();
      expect(verifyNationalIdentifier(formatId, value!).status, `${formatId} ${value}`).toBe('verified');
    }
    expect(syntheticIdentifier('mrn_nhs', 2)!.replace(/\D/g, '').slice(0, 3)).toBe('999');
  });

  it('cancer: two synthetic cases, marked, through the real builder', () => {
    const items = syntheticCancerSubmissions(cancerRegistryDefinition('cosd_uk')!, { facilityId: 'F', now: new Date('2026-10-01T00:00:00Z') });
    expect(items.map(i => i.status)).toEqual(['ready', 'ready']);
    const body: any = items[0].body;
    expect(body.synthetic).toEqual({ suite: 'pathscribe-registry-suite-1', caseRef: 'SYN-cosd_uk-1' });
    expect(body.patient.mrn).toMatch(/^SYN-/);
    expect(body.patientIdentifier).toMatchObject({ formatId: 'mrn_nhs', verification: 'verified' });
    expect(body.icdOCodes[0].code).toBe('8500/3');
  });

  it('screening: three cases through the lab\'s configuration; an unmapped code is a held finding, not a send', () => {
    const csms = syntheticScreeningSubmissions(screeningRegistryDefinition('csms_uk')!, { registryId: 'csms_uk', requireMappedCodes: false, codeMappings: [] }, [], { facilityId: 'F', now: new Date() });
    expect(csms.map(i => i.status)).toEqual(['ready', 'ready', 'ready']);
    const sccrs = syntheticScreeningSubmissions(screeningRegistryDefinition('sccrs_scotland')!, { registryId: 'sccrs_scotland', requireMappedCodes: true, codeMappings: [] }, [], { facilityId: 'F', now: new Date() });
    expect(sccrs[0]).toMatchObject({ status: 'held' });
  });
});

describe('the validation record (Batch 424)', () => {
  const record = buildValidationRecord({
    domain: 'cancer', registryId: 'cosd_uk', templateVersion: 'v2026.4.1', release: '1.4.0', validatedAt: '2026-10-01T00:00:00Z',
    exportedBy: { id: '3', name: 'Pete Nimmo' }, agreementReference: 'DSA-77', accepted: [{ caseRef: 'SYN-cosd_uk-1', submissionGuid: 'g', outcome: 'accepted' }],
  });
  const expectOk = { domain: 'cancer' as const, registryId: 'cosd_uk', templateVersion: 'v2026.4.1', release: '1.4.0', minAccepted: 1 };
  it('a record from this registry, template and release, with an intact digest, passes', () => {
    expect(checkValidationRecord(JSON.stringify(record), expectOk).problems).toEqual([]);
  });
  it('tampering, another release, version or registry, or too few acceptances are refused', () => {
    expect(checkValidationRecord(JSON.stringify({ ...record, accepted: [...record.accepted, record.accepted[0]] }), expectOk).problems).toContain('digestMismatch');
    expect(checkValidationRecord(JSON.stringify(record), { ...expectOk, release: '1.5.0' }).problems).toEqual(['wrongRelease']);
    expect(checkValidationRecord(JSON.stringify(record), { ...expectOk, templateVersion: 'v2027.1.1', registryId: 'phs_scotland' }).problems).toEqual(['wrongRegistry', 'wrongVersion']);
    expect(checkValidationRecord(JSON.stringify(record), { ...expectOk, minAccepted: 2 }).problems).toEqual(['notEnoughAccepted']);
    expect(checkValidationRecord('not json', expectOk).problems).toEqual(['unreadable']);
  });
});

describe('go-live rules', () => {
  it('approval settings: self-approval on and one approval by default, clamped like template review', () => {
    expect(normalizeRegistryGoLiveGovernance(null)).toEqual({ allowSelfApproval: true, requiredReviewers: 1 });
    expect(normalizeRegistryGoLiveGovernance({ allowSelfApproval: false, requiredReviewers: 9 })).toEqual({ allowSelfApproval: false, requiredReviewers: 3 });
  });

  it('pre-checks: template, specification, codes, identifier hold, agreement, validation record, local changes, sign-off reference', () => {
    const checks = registryGoLivePrechecks({
      domain: 'screening', definition: { specStatus: 'configurable', patientIdentifierFormatId: 'mrn_chi', resultCoding: 'mappingTable' },
      templateVersion: 'v2026.4.1', latest: base, unmappedCodes: 2, requirePatientIdentifier: false,
      evidence: { acceptedTestSubmissions: 0, reference: ' ', specConfirmedByLab: false },
      agreementRecorded: false, validationProblems: 'missing', localChangesNeedingReview: 1,
    });
    expect(Object.fromEntries(checks.map(c => [c.id, c.status]))).toEqual({
      templateCurrent: 'passed', specificationConfirmed: 'failed', codesMapped: 'failed', identifierHold: 'failed',
      agreementRecorded: 'failed', validationRecord: 'failed', overridesReviewed: 'failed', testEvidence: 'failed',
    });
  });

  it('counts only accepted synthetic test submissions on the same registry and template version', () => {
    const e = (caseId: string, registryId: string, env: string, version: string | undefined, status: string) => ({ caseId, registryId, registryStatus: status, submission: { environment: env, templateVersion: version } });
    expect(countAcceptedTestSubmissions([
      e('SYN-a', 'csms_uk', 'test', 'v2026.4.1', 'accepted'), e('SYN-b', 'csms_uk', 'test', 'v2026.4.1', 'acceptedWithWarnings'),
      e('REAL-1', 'csms_uk', 'test', 'v2026.4.1', 'accepted'), e('SYN-c', 'csms_uk', 'test', 'v2026.4.1', 'rejectedFatal'),
      e('SYN-d', 'csms_uk', 'production', 'v2026.4.1', 'accepted'), e('SYN-e', 'sccrs_scotland', 'test', 'v2026.4.1', 'accepted'),
    ], 'csms_uk', 'v2026.4.1')).toBe(2);
  });

  it('adapter state: Pending → Testing → Validated on validation; Pending (held) → Live on production', () => {
    expect(registryAdapterState({ role: 'validation', agreementRecorded: false, validatedLatest: false, liveCurrent: false })).toBe('pending');
    expect(registryAdapterState({ role: 'validation', agreementRecorded: true, validatedLatest: false, liveCurrent: false })).toBe('testing');
    expect(registryAdapterState({ role: 'validation', agreementRecorded: true, validatedLatest: true, liveCurrent: false })).toBe('validated');
    expect(registryAdapterState({ role: 'production', agreementRecorded: true, validatedLatest: true, liveCurrent: false })).toBe('pending');
    expect(registryAdapterState({ role: 'production', agreementRecorded: true, validatedLatest: true, liveCurrent: true })).toBe('live');
  });

  const record = { status: 'inReview' as const, editorIds: ['3'], approvals: [] as RegistryGoLiveApproval[] };
  it('who may approve: a capacity, not both director capacities, self-approval per the setting, once each', () => {
    const on: RegistryGoLiveGovernance = { allowSelfApproval: true, requiredReviewers: 1 };
    expect(checkRegistryGoLiveApproval(record, { id: '3' }, [], on)).toBe('noCapacity');
    expect(checkRegistryGoLiveApproval(record, { id: '3' }, ['labDirector', 'labDirectorDesignee'], on)).toBe('conflictingCapacities');
    expect(checkRegistryGoLiveApproval(record, { id: '3' }, ['siteAdministrator'], { ...on, allowSelfApproval: false })).toBe('selfApproval');
    expect(checkRegistryGoLiveApproval(record, { id: '3' }, ['siteAdministrator', 'labDirectorDesignee'], on)).toBeNull();
  });

  it('goes live only with the required approvals and a Lab Director (or designee) among them', () => {
    const a = (userId: string, capacities: RegistryGoLiveApproval['capacities']): RegistryGoLiveApproval => ({ userId, name: userId, at: 't', capacities, stepUp: { method: 'password', confirmationId: userId, confirmedAt: 't' } });
    expect(registryGoLiveProgress({ editorIds: ['3'], approvals: [a('3', ['siteAdministrator'])] }, { allowSelfApproval: true, requiredReviewers: 1 })).toMatchObject({ goesLive: false, hasDirector: false });
    expect(registryGoLiveProgress({ editorIds: ['3'], approvals: [a('3', ['siteAdministrator']), a('9', ['labDirector'])] }, { allowSelfApproval: false, requiredReviewers: 1 })).toMatchObject({ counted: 1, goesLive: true });
  });

  it('the permanent statement names the user, both capacities, the step-up and the time', () => {
    const approval: RegistryGoLiveApproval = { userId: '3', name: 'Pete Nimmo', at: '2026-10-01T15:00:00.000Z', capacities: ['siteAdministrator', 'labDirectorDesignee'], stepUp: { method: 'password', confirmationId: 'c1', confirmedAt: 't' } };
    expect(registryGoLiveAuditStatement({ registryId: 'csms_uk', templateVersion: 'v2026.4.1', preparedBy: { id: '3', name: 'Pete Nimmo' } }, [approval], approval.at)).toBe(
      'Live Register switch for csms_uk (template v2026.4.1) executed by Pete Nimmo (3) acting in dual capacity as Site Administrator and delegated Lab Director designee, who also prepared the request, authorized via step-up credential verification (password re-entry) on 2026-10-01T15:00:00.000Z.');
  });
});

// ── The flow, over an in-memory store ───────────────────────────────────────

function memoryStore(governance: RegistryGoLiveGovernance = { allowSelfApproval: true, requiredReviewers: 1 }): IRegistryGoLiveService {
  let records: RegistryGoLiveRecord[] = [];
  let g = governance;
  const agreements: RegistryAgreement[] = [];
  let rules: RegistryAdapterRule[] = [];
  const validations: StoredValidationRecord[] = [];
  const change = (id: string, from: string[], apply: (r: RegistryGoLiveRecord) => RegistryGoLiveRecord) => {
    const r = records.find(x => x.id === id);
    if (!r || !from.includes(r.status)) return { ok: false as const, error: 'no' };
    const next = apply(r);
    records = records.map(x => (x.id === id ? next : x));
    return { ok: true as const, data: next };
  };
  return {
    list: async (domain, registryId) => ({ ok: true, data: records.filter(r => r.domain === domain && r.registryId === registryId).reverse() }),
    get: async id => ({ ok: true, data: records.find(r => r.id === id) }),
    create: async r => { records.push(r); return { ok: true, data: r }; },
    addApproval: async (id, a) => change(id, ['inReview'], r => ({ ...r, approvals: [...r.approvals, a] })),
    markLive: async (id, live) => change(id, ['inReview'], r => ({ ...r, ...live, status: 'live' })),
    close: async (id, c) => change(id, ['inReview', 'live'], r => ({ ...r, ...c, status: r.status === 'live' ? 'ended' : 'withdrawn' })),
    getGovernance: async () => ({ ok: true, data: g }),
    saveGovernance: async next => { g = normalizeRegistryGoLiveGovernance(next); return { ok: true, data: g }; },
    getAgreement: async (domain, registryId) => ({ ok: true, data: agreements.filter(a => a.domain === domain && a.registryId === registryId).pop() }),
    recordAgreement: async a => { agreements.push(a); return { ok: true, data: a }; },
    listAdapterRules: async (domain, registryId) => ({ ok: true, data: rules.filter(r => r.domain === domain && r.registryId === registryId) }),
    saveAdapterRule: async r => { rules = [...rules.filter(x => x.id !== r.id), r]; return { ok: true, data: r }; },
    removeAdapterRule: async id => { rules = rules.filter(r => r.id !== id); return { ok: true, data: undefined }; },
    listValidationRecords: async (domain, registryId) => ({ ok: true, data: validations.filter(x => x.record.domain === domain && x.record.registryId === registryId).reverse() }),
    saveValidationRecord: async x => { validations.push(x); return { ok: true, data: x }; },
  };
}

const confirmation = { confirmationId: 'c1' } as SignatureConfirmation;
const pete = { id: '3', name: 'Pete Nimmo' };
const kathy = { id: '7', name: 'Kathy' };
const evidence = { reference: 'COSD-TEST-77', specConfirmedByLab: true };
const accepted = { id: 'q1', caseId: 'SYN-cosd_uk-1', registryId: 'cosd_uk', registryStatus: 'accepted', submission: { environment: 'test', templateVersion: 'v2026.4.1', submissionGuid: 'g1' } };

function makeDeps(role: 'production' | 'validation', over: Partial<RegistryGoLiveDeps> = {}) {
  const audits: any[] = [];
  let n = 0;
  const deps: RegistryGoLiveDeps = {
    enforce: vi.fn(async () => ({ allowed: true })),
    store: memoryStore(),
    instance: { role, release: '1.4.0' },
    readSetup: async () => ({ definition: { specStatus: 'configurable', patientIdentifierFormatId: 'mrn_nhs' } }),
    queueEntries: async () => [accepted],
    verifyStepUp: vi.fn(async () => ({ ok: true as const, stepUp: { method: 'password' as const, confirmationId: 'c1', confirmedAt: '2026-10-01T14:59:58.000Z' } })),
    restampScreening: vi.fn(async () => undefined),
    buildSuite: async () => syntheticCancerSubmissions(cancerRegistryDefinition('cosd_uk')!, { facilityId: 'F', now: new Date() }),
    sendSynthetic: vi.fn(async () => ({ ok: true })),
    releaseHeld: vi.fn(async () => ({ resent: 4, stillHeld: 0 })),
    logAudit: vi.fn(e => { audits.push(e); }),
    now: () => new Date('2026-10-01T15:00:00.000Z'),
    newId: () => `r${++n}`,
    ...over,
  };
  return { deps, audits };
}
const area = { domain: 'cancer' as const, registryId: 'cosd_uk' };

describe('validation instance: agreement, synthetic suite, validation record (Batch 424)', () => {
  it('Pending until the agreement is recorded; then the suite runs and the record exports', async () => {
    const { deps, audits } = makeDeps('validation');
    expect((await loadRegistryGoLive('cancer', 'cosd_uk', deps)).adapterState).toBe('pending');
    expect((await runRegistryTestSuite(area, pete, deps)).outcome).toBe('registryPending');
    expect((await exportRegistryValidation(area, pete, deps)).outcome).toBe('registryPending');
    expect(await recordRegistryAgreement({ ...area, reference: ' ' }, pete, deps)).toBe('referenceRequired');
    expect(await recordRegistryAgreement({ ...area, reference: 'DSA-2026-14' }, pete, deps)).toBe('recorded');
    expect((await loadRegistryGoLive('cancer', 'cosd_uk', deps)).adapterState).toBe('testing');

    const suite = await runRegistryTestSuite(area, pete, deps);
    expect(suite.outcome).toBe('ran');
    expect(suite.results!.map(r => r.result)).toEqual(['sent', 'sent']);
    expect(deps.enforce).toHaveBeenCalledWith('registry:test-suite:run', { registryId: 'cosd_uk' });
    expect(deps.sendSynthetic).toHaveBeenCalledTimes(2);

    const exported = await exportRegistryValidation(area, pete, deps);
    expect(exported).toMatchObject({ outcome: 'exported', fileName: 'pathscribe-validation-cosd_uk-v2026.4.1.json', accepted: 1 });
    expect(JSON.parse(exported.text!)).toMatchObject({ registryId: 'cosd_uk', release: '1.4.0', agreementReference: 'DSA-2026-14', instance: 'validation' });
    expect((await loadRegistryGoLive('cancer', 'cosd_uk', deps)).adapterState).toBe('validated');
    expect(audits.map(a => a.event)).toEqual(expect.arrayContaining(['Registry agreement recorded', 'Registry test suite run', 'Registry validation exported']));
  });

  it('nothing to export without an accepted synthetic submission; go-live is refused on a validation instance', async () => {
    const { deps } = makeDeps('validation', { queueEntries: async () => [] });
    await recordRegistryAgreement({ ...area, reference: 'DSA' }, pete, deps);
    expect((await exportRegistryValidation(area, pete, deps)).outcome).toBe('notEnoughAccepted');
    expect((await requestRegistryGoLive({ ...area, evidence }, pete, deps)).outcome).toBe('notProductionInstance');
    expect((await importRegistryValidation({ ...area, text: '{}' }, pete, deps)).outcome).toBe('notProductionInstance');
  });

  it('real cases are skipped, synthetic ones sent to test, on a validation instance', async () => {
    const { deps } = makeDeps('validation');
    await recordRegistryAgreement({ ...area, reference: 'DSA' }, pete, deps);
    expect(await registrySendGate('cancer', 'cosd_uk', false, deps)).toMatchObject({ action: 'skip', skipReason: 'realCaseOnValidation' });
    expect(await registrySendGate('cancer', 'cosd_uk', true, deps)).toEqual({ action: 'send', environment: 'test' });
  });
});

async function validationText() {
  const { deps } = makeDeps('validation');
  await recordRegistryAgreement({ ...area, reference: 'DSA-2026-14' }, pete, deps);
  return (await exportRegistryValidation(area, pete, deps)).text!;
}

describe('production instance: import, request, approve with step-up, catch-up, stop (Batch 423/424)', () => {
  it('one person, small lab: imports the validation record, requests, approves in two capacities, goes live; held results are resent', async () => {
    const { deps, audits } = makeDeps('production');
    expect(await registrySendGate('cancer', 'cosd_uk', false, deps)).toMatchObject({ action: 'hold' });
    expect((await requestRegistryGoLive({ ...area, evidence }, pete, deps)).outcome).toBe('prechecksFailed');
    await recordRegistryAgreement({ ...area, reference: 'DSA-2026-14' }, pete, deps);
    expect(await importRegistryValidation({ ...area, text: await validationText() }, pete, deps)).toEqual({ outcome: 'imported' });

    const req = await requestRegistryGoLive({ ...area, evidence }, pete, deps);
    expect(req.outcome).toBe('requested');
    expect(req.record!.evidence).toMatchObject({ acceptedTestSubmissions: 1, reference: 'COSD-TEST-77' });

    const r = await approveRegistryGoLive({ recordId: req.record!.id, capacities: ['siteAdministrator', 'labDirectorDesignee'], confirmation }, pete, deps);
    expect(r.outcome).toBe('live');
    expect(r.catchUp).toEqual({ resent: 4, stillHeld: 0 });
    expect(deps.releaseHeld).toHaveBeenCalledWith('cancer', 'cosd_uk', pete);
    expect(r.record!.auditStatement).toContain('executed by Pete Nimmo (3) acting in dual capacity as Site Administrator and delegated Lab Director designee');
    expect(audits.map(a => a.event)).toEqual(expect.arrayContaining(['Registry validation imported', 'Registry live register switch', 'Registry held results released']));
    expect(await registrySendGate('cancer', 'cosd_uk', false, deps)).toEqual({ action: 'send', environment: 'production' });
    expect(await registrySendGate('cancer', 'cosd_uk', true, deps)).toMatchObject({ action: 'skip', skipReason: 'syntheticOnProduction' });

    expect(await stopRegistryLiveReporting(area, pete, deps)).toBe('stopped');
    expect(await registrySendGate('cancer', 'cosd_uk', false, deps)).toMatchObject({ action: 'hold' });
    expect(await stopRegistryLiveReporting(area, pete, deps)).toBe('notLive');
  });

  it('a validation record for another release is refused, and audited', async () => {
    const { deps, audits } = makeDeps('production', { instance: { role: 'production', release: '1.5.0' } });
    const r = await importRegistryValidation({ ...area, text: await validationText() }, pete, deps);
    expect(r).toEqual({ outcome: 'rejected', problems: ['wrongRelease'] });
    expect(audits[0].event).toBe('Registry validation import refused');
  });

  it('a refused credential confirmation records nothing', async () => {
    const { deps } = makeDeps('production', { verifyStepUp: async () => ({ ok: false, reason: 'expired' }) });
    await recordRegistryAgreement({ ...area, reference: 'DSA' }, pete, deps);
    await importRegistryValidation({ ...area, text: await validationText() }, pete, deps);
    const req = await requestRegistryGoLive({ ...area, evidence }, pete, deps);
    expect(await approveRegistryGoLive({ recordId: req.record!.id, capacities: ['labDirector'], confirmation }, pete, deps)).toMatchObject({ outcome: 'stepUpRefused', reason: 'expired' });
    expect(deps.releaseHeld).not.toHaveBeenCalled();
  });

  it('with self-approval off the requester can\'t approve; two approvals: the first is recorded, the second goes live', async () => {
    const { deps } = makeDeps('production', { store: memoryStore({ allowSelfApproval: false, requiredReviewers: 1 }) });
    await recordRegistryAgreement({ ...area, reference: 'DSA' }, pete, deps);
    await importRegistryValidation({ ...area, text: await validationText() }, pete, deps);
    const req = await requestRegistryGoLive({ ...area, evidence }, pete, deps);
    expect((await approveRegistryGoLive({ recordId: req.record!.id, capacities: ['siteAdministrator'], confirmation }, pete, deps)).outcome).toBe('selfApproval');
    expect((await approveRegistryGoLive({ recordId: req.record!.id, capacities: ['labDirector'], confirmation }, kathy, deps)).outcome).toBe('live');

    const two = makeDeps('production', { store: memoryStore({ allowSelfApproval: true, requiredReviewers: 2 }) }).deps;
    await recordRegistryAgreement({ ...area, reference: 'DSA' }, pete, two);
    await importRegistryValidation({ ...area, text: await validationText() }, pete, two);
    const req2 = await requestRegistryGoLive({ ...area, evidence }, pete, two);
    expect((await approveRegistryGoLive({ recordId: req2.record!.id, capacities: ['siteAdministrator'], confirmation }, pete, two)).outcome).toBe('approved');
    expect((await approveRegistryGoLive({ recordId: req2.record!.id, capacities: ['labDirector'], confirmation }, kathy, two)).outcome).toBe('live');
  });

  it('a local change a newer template touches blocks go-live until it is confirmed', async () => {
    const minor = v('v2026.4.2', 'minor', '2026-09-01', '2026-09-01', [{ element: 'segments', changeClass: 'minor', note: 'OBX order' }]);
    const { deps } = makeDeps('validation');
    await addRegistryAdapterRule({ ...area, element: 'segments', description: 'Trim OBX-5' }, pete, deps);
    const rules = (await deps.store.listAdapterRules('cancer', 'cosd_uk') as any).data;
    expect(rules[0]).toMatchObject({ element: 'segments', baselineVersion: 'v2026.4.1' });
    // The pure check over a history with a newer version touching segments:
    const changes = registryLocalChanges(undefined, rules);
    expect(localChangesNeedingReview(changes, [base, minor], day('2026-10-01')).length).toBe(1);
    expect((await confirmRegistryLocalChanges(area, pete, deps)).outcome).toBe('nothingToConfirm');
  });

  it('permissions are checked in the service', async () => {
    const { deps } = makeDeps('production', { enforce: async () => ({ allowed: false }) });
    expect((await requestRegistryGoLive({ ...area, evidence }, pete, deps)).outcome).toBe('notPermitted');
    expect(await recordRegistryAgreement({ ...area, reference: 'x' }, pete, deps)).toBe('notPermitted');
    expect((await importRegistryValidation({ ...area, text: '{}' }, pete, deps)).outcome).toBe('notPermitted');
    expect((await saveRegistryGoLiveGovernance({ requiredReviewers: 2 }, pete, deps)).outcome).toBe('notPermitted');
    expect(await stopRegistryLiveReporting(area, pete, deps)).toBe('notPermitted');
    expect(await addRegistryAdapterRule({ ...area, element: 'segments', description: 'x' }, pete, deps)).toBe('notPermitted');
    const v2 = makeDeps('validation', { enforce: async () => ({ allowed: false }) }).deps;
    expect((await runRegistryTestSuite(area, pete, v2)).outcome).toBe('notPermitted');
    expect((await exportRegistryValidation(area, pete, v2)).outcome).toBe('notPermitted');
  });

  it('withdraw is audited', async () => {
    const { deps, audits } = makeDeps('production');
    await recordRegistryAgreement({ ...area, reference: 'DSA' }, pete, deps);
    await importRegistryValidation({ ...area, text: await validationText() }, pete, deps);
    const req = await requestRegistryGoLive({ ...area, evidence }, pete, deps);
    expect(await withdrawRegistryGoLive(req.record!.id, pete, deps)).toBe('withdrawn');
    expect(audits.map(a => a.event)).toContain('Registry go-live withdrawn');
  });
});
