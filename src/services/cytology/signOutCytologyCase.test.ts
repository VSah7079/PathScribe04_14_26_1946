// Batch 409 (PS-359): cytology sign-out, moved out of the Cytology Workspace
// page, with its new permission checked first. Pathologist track throughout.
import { describe, it, expect, vi } from 'vitest';
import { signOutCytologyCase, releaseFinalizedCytologyCase, type CytologySignOutDeps, type CytologySignOutInput } from './signOutCytologyCase';
import { CYTOLOGY_SYNOPTIC_TEMPLATES, resetCytologySynopticTemplateLibrary } from './cytologySynopticTemplateRegistry';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';

// Batch 649: no role bypass; the signing user (P1) must be an active participant with a finalize-eligible type.
const SIGNER = { staffId: 'P1', status: 'active' as const, participationTypeIds: ['primary'] };
const NOW = new Date('2026-09-30T18:00:00.000Z');
const categories = [
  { id: 'nilm', diagnosticRank: 0 }, { id: 'ascus', diagnosticRank: 1 }, { id: 'hsil', diagnosticRank: 4 }, { id: 'unsat', isUnsatisfactory: true },
] as never[];

// PS-71 (Batch 458): the fake case store behind getCase/updateCase. A save
// must carry the stored version (else ConcurrencyConflictError, like the real
// services) and bumps it. signOut() seeds it with the input case and every
// case getAllCases returns, then signs out.
const stores = new WeakMap<object, Map<string, any>>();
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
async function signOut(input: CytologySignOutInput, deps: CytologySignOutDeps) {
  const store = stores.get(deps);
  if (store) {
    store.set(input.caseData.id, { version: 0, ...clone(input.caseData) });
    const all = await deps.getAllCases().catch(() => ({ ok: false as const }));
    if (all.ok) for (const c of all.data) if (!store.has(c.id)) store.set(c.id, { version: 0, ...clone(c) });
  }
  return signOutCytologyCase(input, deps);
}

function makeDeps(over: Partial<CytologySignOutDeps> = {}) {
  const calls: string[] = [];
  const updates: { caseId: string; patch: Record<string, unknown> }[] = [];
  const store = new Map<string, any>();
  // Batch 485: a minimal, real in-memory countersign-record store, so
  // tests can exercise the real release → complete lifecycle rather than
  // a bare spy. Separate from the case `store` above — a CountersignRecord
  // isn't part of Case.
  const countersignRecords: any[] = [];
  const deps: CytologySignOutDeps = {
    enforce: vi.fn(async () => ({ allowed: true })),
    signatureGate: {
      accept: vi.fn(async () => ({ ok: true as const })),
      commit: vi.fn(async (_c: string, outcome: string) => { calls.push(`commit:${outcome}`); }),
      release: vi.fn(() => { calls.push('release'); }),
    },
    getSessionUser: () => ({ id: 'P1', role: 'superadmin' }),
    resolveFinalizeAuthorityContext: async () => ({ participationTypes: [], performingLabFacilityId: null, jurisdiction: 'US' }),
    getActiveSupervisionAssignment: async () => null,
    releaseForCountersign: vi.fn(async (input: any) => {
      calls.push('countersign');
      countersignRecords.push({ caseId: input.caseId, specimenId: input.specimenId, status: 'pending', releasedAnswersSnapshot: input.releasedAnswersSnapshot ?? {} });
    }),
    countersign: {
      getForSpecimen: vi.fn(async (caseId: string, specimenId: string) => {
        const record = countersignRecords.find(r => r.caseId === caseId && r.specimenId === specimenId && r.status === 'pending');
        return { ok: true as const, data: record ?? null };
      }),
      countersign: vi.fn(async (input: any) => {
        calls.push('countersign-complete');
        const idx = countersignRecords.findIndex(r => r.caseId === input.caseId && r.specimenId === input.specimenId && r.status === 'pending');
        if (idx === -1) return { ok: false as const, error: 'No pending countersign record found' };
        countersignRecords[idx] = { ...countersignRecords[idx], status: 'countersigned' };
        return { ok: true as const, data: countersignRecords[idx] };
      }),
      getAll: vi.fn(async () => ({ ok: true as const, data: [...countersignRecords] })),
    },
    getCase: async (caseId: string) => (store.has(caseId) ? clone(store.get(caseId)) : undefined),
    updateCase: vi.fn(async (caseId: string, patch: Record<string, unknown>, expectedVersion: number) => {
      const current = store.get(caseId);
      if (current && (current.version ?? 0) !== expectedVersion) throw new ConcurrencyConflictError(caseId, expectedVersion, current.version ?? 0);
      if (current) store.set(caseId, { ...current, ...clone(patch), version: (current.version ?? 0) + 1 });
      updates.push({ caseId, patch });
    }),
    getAllCases: async () => ({ ok: true, data: [] }),
    getUserEmail: async () => 'attending@example.org',
    sendEmail: vi.fn(async () => undefined),
    logAudit: vi.fn(),
    getAllReviews: async () => ({ ok: true, data: [] }),
    createQcAssignment: vi.fn(async () => ({ ok: true as const, data: { id: 'qc-1' } })),
    getQcSettings: async () => null,
    random: () => 0.99,
    getSpecimenDictionary: async () => ({ ok: true, data: [] }),
    resolveReportLocale: async () => 'en',
    getCaseSignOutRecords: async () => ({ ok: true, data: [] }),
    createSignOutRecord: vi.fn(async input => { calls.push('record'); return { ok: true as const, data: { id: 'so-1', ...input } as never }; }),
    publishReportReleased: vi.fn(async () => { calls.push('released'); }),
    generatePdfSnapshot: async () => ({}),
    getRegistrySettings: async () => ({ enterprise: { registryId: 'none' }, facility: null }),
    getComplianceSettings: async () => ({ enterprise: {}, facility: null }),
    getRegistryConfig: async (registryId: any) => ({ registryId, requireMappedCodes: false, codeMappings: [] }),
    registryQueue: {
      enqueue: vi.fn(async () => ({ ok: true as const, data: { id: 'rq-1' } })),
      markSent: vi.fn(async () => undefined),
      markFailed: vi.fn(async () => undefined),
    },
    dispatchInterfaceMessage: vi.fn(async () => ({ ok: true })),
    sendGate: async () => ({ action: 'send' as const, environment: 'test' as const }),
    now: () => NOW,
    newId: () => 'id-1',
    ...over,
  };
  stores.set(deps, store);
  return { deps, calls, updates, store, countersignRecords };
}

function makeInput(over: Partial<CytologySignOutInput> = {}): CytologySignOutInput {
  const finalReview = { id: 'rv-1', caseId: 'C1', specimenId: 'SP1', role: 'final', primaryInterpretationId: 'nilm', requiresPathologistReview: false, adequacySelections: [], recordedBy: { userId: 'P1', userName: 'Dr P' } } as never;
  return {
    caseData: { id: 'C1', accession: { fullAccession: 'S26-C1' }, patient: { id: 'PT1', firstName: 'A', lastName: 'B' }, order: { facilityId: 'F1' }, participants: [SIGNER], specimens: [{ id: 'SP1', cytologyScreening: {} }] } as never,
    specimenId: 'SP1', specimen: { id: 'SP1', description: 'Pap', cytologyScreening: {} },
    user: { id: 'P1', name: 'Dr P', role: 'pathologist' }, isPathologist: true,
    finalReview, reviews: [finalReview], categories, confirmation: {} as never,
    gateInputs: { isGynCytology: true, isFlaggedForQc: false, labJurisdiction: 'US' as never, signingProviderCredentials: [] },
    uiLanguage: 'en', pathologyLexicon: [], hpv: {},
    ...over,
  };
}

describe('signOutCytologyCase', () => {
  it('needs cytology:report:sign-out for the case, before the signature is even taken', async () => {
    const { deps } = makeDeps({ enforce: vi.fn(async () => ({ allowed: false })) });
    expect(await signOut(makeInput(), deps)).toEqual({ outcome: 'notPermitted' });
    expect(deps.enforce).toHaveBeenCalledWith('cytology:report:sign-out', { caseId: 'C1' });
    expect(deps.signatureGate.accept).not.toHaveBeenCalled();
    expect(deps.createSignOutRecord).not.toHaveBeenCalled();
  });

  it('a refused signature stops it with the gate\'s reason', async () => {
    const { deps } = makeDeps({ signatureGate: { accept: async () => ({ ok: false as const, reason: 'wrongPin' }), commit: vi.fn(), release: vi.fn() } });
    expect(await signOut(makeInput(), deps)).toEqual({ outcome: 'signatureRefused', reason: 'wrongPin' });
    expect(deps.createSignOutRecord).not.toHaveBeenCalled();
  });

  it('signs out: the record, the case finalized, the signature committed, then the release event, in that order', async () => {
    const { deps, calls, updates } = makeDeps();
    expect(await signOut(makeInput(), deps)).toEqual({ outcome: 'signedOut', retrospectiveFlagged: 0, caseFinalized: true, specimensRemaining: 0, published: true });
    expect(calls).toEqual(['record', 'commit:signed', 'released']);
    expect(updates).toContainEqual({ caseId: 'C1', patch: { status: 'finalized' } });
    expect(deps.publishReportReleased).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'C1', reportType: 'FINAL', source: 'CYTOLOGY', performingFacilityId: 'F1' }));
  });

  it('a resident on the case releases it for countersign instead, and the attending is emailed', async () => {
    const { deps, calls } = makeDeps({ getSessionUser: () => ({ id: 'R1', role: 'pathologist' }) });
    const input = makeInput({
      user: { id: 'R1', name: 'Dr R' },
      caseData: { id: 'C1', participants: [
        { staffId: 'R1', status: 'active', participationTypeIds: ['resident'] },
        { staffId: 'A1', status: 'active', participationTypeIds: ['attending'] },
      ], order: { facilityId: 'F1' }, specimens: [] } as never,
    });
    expect(await signOut(input, deps)).toEqual({ outcome: 'releasedForCountersign' });
    expect(calls).toEqual(['countersign', 'commit:released_for_countersign']);
    expect(deps.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: ['attending@example.org'] }));
    expect(deps.createSignOutRecord).not.toHaveBeenCalled();
  });

  it('Batch 483 (PS-359 tracker follow-up): the release carries this specimen\'s own id, so a second cytology specimen\'s release never collides with it', async () => {
    const { deps } = makeDeps({ getSessionUser: () => ({ id: 'R1', role: 'pathologist' }) });
    const input = makeInput({
      specimenId: 'SP2', specimen: { id: 'SP2', description: 'FNA', cytologyScreening: {} },
      user: { id: 'R1', name: 'Dr R' },
      caseData: { id: 'C1', participants: [
        { staffId: 'R1', status: 'active', participationTypeIds: ['resident'] },
        { staffId: 'A1', status: 'active', participationTypeIds: ['attending'] },
      ], order: { facilityId: 'F1' }, specimens: [] } as never,
    });
    await signOut(input, deps);
    expect(deps.releaseForCountersign).toHaveBeenCalledWith(expect.objectContaining({ specimenId: 'SP2' }));
  });

  it('a pathologist who isn\'t on the case lacks signing authority: refused, and the signature released', async () => {
    const { deps, calls } = makeDeps({ getSessionUser: () => ({ id: 'P9', role: 'pathologist' }) });
    const result = await signOut(makeInput({ user: { id: 'P9', name: 'Dr Nine' } }), deps);
    expect(result.outcome).toBe('authorityRefused');
    expect(result.reason).toBeTruthy();
    expect(calls).toEqual(['release']);
  });

  it('a new high-grade diagnosis flags the patient\'s earlier specimens (5-year lookback) and says how many', async () => {
    const earlier = { id: 'C0', patient: { id: 'PT1' }, specimens: [{ id: 'SP0', cytologyScreening: {} }] };
    const { deps, updates } = makeDeps({
      getAllCases: async () => ({ ok: true, data: [earlier] }),
      getAllReviews: async () => ({ ok: true, data: [{ id: 'r0', caseId: 'C0', specimenId: 'SP0', recordedAt: '2024-01-01T00:00:00.000Z', primaryInterpretationId: 'nilm' }] as never }),
    });
    const hsil = { id: 'rv-1', role: 'final', primaryInterpretationId: 'hsil', requiresPathologistReview: false, adequacySelections: [], recordedBy: { userId: 'P1', userName: 'Dr P' } } as never;
    const result = await signOut(makeInput({ finalReview: hsil, reviews: [hsil] }), deps);
    expect(result).toMatchObject({ outcome: 'signedOut', retrospectiveFlagged: 1 });
    const flagged = updates.find(u => u.caseId === 'C0')?.patch.specimens as { cytologyScreening: { retrospectiveReviewFlag: { triggeredByCaseId: string } } }[];
    expect(flagged[0].cytologyScreening.retrospectiveReviewFlag.triggeredByCaseId).toBe('C1');
  });

  it('reports to the national registry when the facility has one; a CSMS case with no reason for study is flagged', async () => {
    const { deps, updates } = makeDeps({ getRegistrySettings: async () => ({ enterprise: { registryId: 'csms_uk' }, facility: null }) });
    await signOut(makeInput(), deps);
    expect(deps.registryQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'C1', signOutRecordId: 'so-1', registryId: 'csms_uk' }));
    // Batch 419: the payload header, NEW and test by default, and the payload carries it.
    const submission = (deps.registryQueue.enqueue as any).mock.calls[0][0].submission;
    expect(submission).toMatchObject({ submissionVersion: 1, messageType: 'NEW', environment: 'test', isDuplicateRetry: false });
    // Batch 638: a CSMS message waits for the eligibility check, so nothing is dispatched and the entry is held.
    expect(deps.dispatchInterfaceMessage).not.toHaveBeenCalled();
    expect(deps.registryQueue.markFailed).toHaveBeenCalledWith('rq-1', expect.objectContaining({ errorCode: 'AWAITING_ELIGIBILITY' }));
    expect(deps.registryQueue.markSent).not.toHaveBeenCalled();
    const flags = updates.find(u => 'caseFlags' in u.patch)?.patch.caseFlags as { flagDefinitionId: string }[];
    expect(flags?.[0].flagDefinitionId).toBe('f36');
  });

  it('Batch 418: a patient who opted out of screening reporting is excluded by consent, nothing built, never retried', async () => {
    const { deps } = makeDeps({ getRegistrySettings: async () => ({ enterprise: { registryId: 'csms_uk' }, facility: null }) });
    const input = makeInput();
    (input.caseData as any).patient.registryConsent = { screeningOptOut: true, cancerRegistryOptOut: false, recordedAt: '2026-09-30T00:00:00.000Z' };
    const result = await signOut(input, deps);
    expect(result.outcome).toBe('signedOut'); // the sign-out itself stands
    expect(deps.registryQueue.markFailed).toHaveBeenCalledWith('rq-1', expect.objectContaining({ errorCode: 'EXCLUDED_BY_CONSENT', maxRetriesExceeded: true }));
    expect(deps.registryQueue.markSent).not.toHaveBeenCalled();
    expect(deps.dispatchInterfaceMessage).not.toHaveBeenCalled();
    expect((deps.logAudit as any).mock.calls.some((c: any[]) => c[0].event === 'Registry submission excluded by consent')).toBe(true);
  });

  it('a failed registry dispatch is marked failed, and the sign-out still stands', async () => {
    const { deps } = makeDeps({
      getRegistrySettings: async () => ({ enterprise: { registryId: 'kncsp_kccr_korea' }, facility: null }),
      dispatchInterfaceMessage: async () => ({ ok: false, errorCode: 'TIMEOUT', error: 'no answer' }),
    });
    expect((await signOut(makeInput(), deps)).outcome).toBe('signedOut');
    expect(deps.registryQueue.markFailed).toHaveBeenCalledWith('rq-1', { errorCode: 'TIMEOUT', errorMessage: 'no answer', maxRetriesExceeded: false });
  });

  it('Batch 411: a case with another cytology specimen still to sign out stays open', async () => {
    const { deps, updates } = makeDeps();
    const result = await signOut(makeInput({ cytologySpecimenIds: ['SP1', 'SP2'] }), deps);
    expect(result).toMatchObject({ outcome: 'signedOut', caseFinalized: false, specimensRemaining: 1 });
    expect(updates).not.toContainEqual({ caseId: 'C1', patch: { status: 'finalized' } });
    expect(deps.createSignOutRecord).toHaveBeenCalledWith(expect.objectContaining({ specimenId: 'SP1' }));
  });

  it('Batch 411: signing out the last one finalizes the case', async () => {
    const { deps, updates } = makeDeps({ getCaseSignOutRecords: async () => ({ ok: true, data: [{ specimenId: 'SP2' }] as never }) });
    const result = await signOut(makeInput({ cytologySpecimenIds: ['SP1', 'SP2'] }), deps);
    expect(result).toMatchObject({ caseFinalized: true, specimensRemaining: 0 });
    expect(updates).toContainEqual({ caseId: 'C1', patch: { status: 'finalized' } });
  });

  it('Batch 413: a Non-GYN specimen is never sent to a cervical screening registry', async () => {
    const { deps } = makeDeps({ getRegistrySettings: async () => ({ enterprise: { registryId: 'csms_uk' }, facility: null }) });
    const input = makeInput();
    const result = await signOut({ ...input, gateInputs: { ...input.gateInputs, isGynCytology: false } }, deps);
    expect(result.outcome).toBe('signedOut');
    expect(deps.registryQueue.enqueue).not.toHaveBeenCalled();
  });

  it('Batch 413: the CSMS eligibility flag is added once per case, not per specimen', async () => {
    const { deps, updates } = makeDeps({ getRegistrySettings: async () => ({ enterprise: { registryId: 'csms_uk' }, facility: null }) });
    const input = makeInput();
    const flagged = { ...input.caseData, caseFlags: [{ id: 'x', flagDefinitionId: 'f36', deletedAt: null }] } as never;
    await signOut({ ...input, caseData: flagged }, deps);
    expect(deps.registryQueue.enqueue).toHaveBeenCalled();
    expect(updates.some(u => 'caseFlags' in u.patch)).toBe(false);
  });

  it('Batch 414: a registry that isn\'t ready holds the result (queued, marked failed with the reason), never sends it half-coded', async () => {
    const { deps } = makeDeps({
      getRegistrySettings: async () => ({ enterprise: { registryId: 'sccrs_scotland' }, facility: null }),
      getRegistryConfig: async (registryId: any) => ({ registryId, requireMappedCodes: true, codeMappings: [] }),
    });
    expect((await signOut(makeInput(), deps)).outcome).toBe('signedOut');
    expect(deps.registryQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ registryId: 'sccrs_scotland' }));
    expect(deps.dispatchInterfaceMessage).not.toHaveBeenCalled();
    expect(deps.registryQueue.markFailed).toHaveBeenCalledWith('rq-1', expect.objectContaining({ errorCode: 'REGISTRY_NOT_READY' }));
  });

  it('Batch 415: a cytotechnologist also needs cytology:ct-report:sign-out; a pathologist doesn\'t', async () => {
    const enforce = vi.fn(async (cap: string) => ({ allowed: cap !== 'cytology:ct-report:sign-out' }));
    const { deps } = makeDeps({ enforce });
    expect(await signOut(makeInput({ isPathologist: false }), deps)).toEqual({ outcome: 'ctNotPermitted' });
    expect(deps.signatureGate.accept).not.toHaveBeenCalled();
    const path = makeDeps({ enforce });
    expect((await signOut(makeInput(), path.deps)).outcome).toBe('signedOut');
  });

  it('Batch 415: the 5-year lookback runs only where it is on (automatic: US labs)', async () => {
    const earlier = { id: 'C0', patient: { id: 'PT1' }, specimens: [{ id: 'SP0', cytologyScreening: {} }] };
    const over = {
      getAllCases: async () => ({ ok: true, data: [earlier] }),
      getAllReviews: async () => ({ ok: true, data: [{ id: 'r0', caseId: 'C0', specimenId: 'SP0', recordedAt: '2024-01-01T00:00:00.000Z', primaryInterpretationId: 'nilm' }] as never }),
    };
    const hsil = { id: 'rv-1', role: 'final', primaryInterpretationId: 'hsil', requiresPathologistReview: false, adequacySelections: [], recordedBy: { userId: 'P1', userName: 'Dr P' } } as never;
    const input = makeInput({ finalReview: hsil, reviews: [hsil] });
    const uk = makeDeps(over);
    expect(await signOut({ ...input, gateInputs: { ...input.gateInputs, labJurisdiction: 'GB_EW' as never } }, uk.deps)).toMatchObject({ retrospectiveFlagged: 0 });
    const ukOn = makeDeps({ ...over, getComplianceSettings: async () => ({ enterprise: { fiveYearLookback: 'on' }, facility: null }) });
    expect(await signOut({ ...input, gateInputs: { ...input.gateInputs, labJurisdiction: 'GB_EW' as never } }, ukOn.deps)).toMatchObject({ retrospectiveFlagged: 1 });
  });
});

// Batch 450 (PS-214, PS-156, PS-179): what sign-out writes to the specimen, and
// that a facility without a registry sends nothing.
describe('signOutCytologyCase — post-sign-out peer review, correlation candidates, registry', () => {
  const reviewOf = (primaryInterpretationId: string, requiresPathologistReview = false) =>
    ({ id: 'rv-1', caseId: 'C1', specimenId: 'SP1', role: 'final', primaryInterpretationId, requiresPathologistReview, adequacySelections: [], recordedBy: { userId: 'P1', userName: 'Dr P' } }) as never;
  const screeningWrites = (updates: { caseId: string; patch: Record<string, unknown> }[]) =>
    updates.filter(u => u.caseId === 'C1' && 'specimens' in u.patch)
      .map(u => (u.patch.specimens as { id: string; cytologyScreening: Record<string, any> }[]).find(sp => sp.id === 'SP1')!.cytologyScreening);
  const qc = (negative: number, nonNegative: number) => async () =>
    ({ enterprise: { negativeRandomSelectionRatePercent: negative, nonNegativeRandomSelectionRatePercent: nonNegative }, facility: null, staff: null });

  it('PS-214: an HSIL sign-out flags the specimen for targeted_high_risk peer review, checked before (and instead of) the random roll', async () => {
    const random = vi.fn(() => 0);
    const getQcSettings = vi.fn(qc(100, 100));
    const { deps, updates } = makeDeps({ random, getQcSettings });
    const hsil = reviewOf('hsil', true);
    expect((await signOut(makeInput({ finalReview: hsil, reviews: [hsil] }), deps)).outcome).toBe('signedOut');
    // Batch 452: the correlation step saves again afterwards (it stores the
    // correlation window), carrying the flag; the last save is what persists.
    const flags = [screeningWrites(updates).slice(-1)[0].postSignOutPeerReviewFlag];
    expect(flags).toEqual([{ reason: 'targeted_high_risk', flaggedBy: 'system', flaggedByName: 'Automatic Post-Sign-Out Peer Review Selection', flaggedAt: NOW.toISOString() }]);
    expect(random).not.toHaveBeenCalled();
    expect(getQcSettings).not.toHaveBeenCalled();
  });

  it('PS-214: a negative sign-out picked by the random roll at the QC rate cascade (performing facility, signing user) is flagged random_selection', async () => {
    const getQcSettings = vi.fn(qc(10, 0));
    const { deps, updates } = makeDeps({ random: () => 0.05, getQcSettings });
    await signOut(makeInput(), deps);
    expect(getQcSettings).toHaveBeenCalledWith('F1', 'P1');
    expect(screeningWrites(updates).map(s => s.postSignOutPeerReviewFlag?.reason)).toEqual(['random_selection']);
  });

  it('PS-214: a negative sign-out the random roll misses (roll at or above the rate) gets no peer review flag', async () => {
    const { deps, updates } = makeDeps({ random: () => 0.1, getQcSettings: qc(10, 100) });
    await signOut(makeInput(), deps);
    expect(screeningWrites(updates).some(s => 'postSignOutPeerReviewFlag' in s)).toBe(false);
  });

  it('PS-214: a non-negative, below-HSIL sign-out is rolled against the non-negative rate, not the negative one', async () => {
    const ascus = reviewOf('ascus', true);
    const picked = makeDeps({ random: () => 0.5, getQcSettings: qc(0, 60) });
    await signOut(makeInput({ finalReview: ascus, reviews: [ascus] }), picked.deps);
    expect(screeningWrites(picked.updates).slice(-1)[0].postSignOutPeerReviewFlag?.reason).toBe('random_selection');
    const missed = makeDeps({ random: () => 0.5, getQcSettings: qc(100, 40) });
    await signOut(makeInput({ finalReview: ascus, reviews: [ascus] }), missed.deps);
    expect(screeningWrites(missed.updates).some(s => 'postSignOutPeerReviewFlag' in s)).toBe(false);
  });

  it('PS-156: an abnormal sign-out persists the patient\'s later non-cytology cases within 180 days as correlation candidates on the specimen', async () => {
    const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();
    const cases = [
      { id: 'C2', patient: { id: 'PT1' }, specimens: [{ id: 'B1', specimenDictionaryEntryId: 'biopsy', receivedAt: day(30) }] },
      { id: 'C3', patient: { id: 'PT1' }, specimens: [{ id: 'P2', specimenDictionaryEntryId: 'pap', receivedAt: day(40) }] },
      { id: 'C4', patient: { id: 'PT1' }, specimens: [{ id: 'B2', specimenDictionaryEntryId: 'biopsy', receivedAt: day(200) }] },
      { id: 'C5', patient: { id: 'OTHER' }, specimens: [{ id: 'B3', specimenDictionaryEntryId: 'biopsy', receivedAt: day(5) }] },
    ];
    const { deps, updates } = makeDeps({
      getAllCases: async () => ({ ok: true, data: cases }),
      getSpecimenDictionary: async () => ({ ok: true, data: [{ id: 'biopsy', type: 'Biopsy' }, { id: 'pap', type: 'Cytology' }] }),
    });
    const ascus = reviewOf('ascus', true);
    expect((await signOut(makeInput({ finalReview: ascus, reviews: [ascus] }), deps)).outcome).toBe('signedOut');
    const persisted = screeningWrites(updates).map(s => s.histologyCorrelationCandidates).filter(Boolean);
    expect(persisted).toEqual([[{ candidateCaseId: 'C2', detectedAt: NOW.toISOString() }]]);
  });

  it("PS-156 (Batch 452): the window runs from COLLECTION by the facility's configured rule and is stored, so a biopsy 175 days after collection matches although sign-out was 18 days later", async () => {
    const collected = new Date(NOW.getTime() - 18 * 86_400_000).toISOString();
    const fromCollection = (n: number) => new Date(Date.parse(collected) + n * 86_400_000).toISOString();
    const cases = [
      { id: 'BX-175', patient: { id: 'PT1' }, specimens: [{ id: 'B1', specimenDictionaryEntryId: 'biopsy', collectedAt: fromCollection(175) }] },
      { id: 'BX-185', patient: { id: 'PT1' }, specimens: [{ id: 'B2', specimenDictionaryEntryId: 'biopsy', collectedAt: fromCollection(185) }] },
    ];
    const getHistologyCorrelationRule = vi.fn(async () => ({ windowDays: 180, anchor: 'collection' as const, source: 'jurisdiction' as const }));
    const { deps, updates } = makeDeps({
      getAllCases: async () => ({ ok: true, data: cases }),
      getSpecimenDictionary: async () => ({ ok: true, data: [{ id: 'biopsy', type: 'Biopsy' }] }),
      getHistologyCorrelationRule,
    } as never);
    const ascus = reviewOf('ascus', true);
    const input = makeInput({ finalReview: ascus, reviews: [ascus] });
    (input.caseData as any).specimens = [{ id: 'SP1', collectedAt: collected, cytologyScreening: {} }];
    expect((await signOut(input, deps)).outcome).toBe('signedOut');
    expect(getHistologyCorrelationRule).toHaveBeenCalledWith('F1');
    const last = screeningWrites(updates).slice(-1)[0];
    expect(last.histologyCorrelationCandidates).toEqual([{ candidateCaseId: 'BX-175', detectedAt: NOW.toISOString() }]);
    expect(last.histologyCorrelationWindow).toMatchObject({ anchor: 'collection', anchorUsed: 'collection', startsAt: collected, windowDays: 180, ruleSource: 'jurisdiction', diagnosticRank: expect.any(Number), reviewId: (ascus as { id: string }).id });
  });

  it('PS-156: a negative sign-out records no correlation candidates, even with a later biopsy on file', async () => {
    const later = { id: 'C2', patient: { id: 'PT1' }, specimens: [{ id: 'B1', specimenDictionaryEntryId: 'biopsy', receivedAt: new Date(NOW.getTime() + 86_400_000).toISOString() }] };
    const { deps, updates } = makeDeps({
      getAllCases: async () => ({ ok: true, data: [later] }),
      getSpecimenDictionary: async () => ({ ok: true, data: [{ id: 'biopsy', type: 'Biopsy' }] }),
    });
    await signOut(makeInput(), deps);
    expect(screeningWrites(updates).some(s => 'histologyCorrelationCandidates' in s)).toBe(false);
  });

  it('PS-179: a facility whose registry is \'none\' (overriding an enterprise registry) queues and dispatches nothing at sign-out', async () => {
    const { deps, updates } = makeDeps({
      getRegistrySettings: async () => ({ enterprise: { registryId: 'csms_uk' }, facility: { overrides: { registryId: 'none' } } }),
    });
    expect((await signOut(makeInput(), deps)).outcome).toBe('signedOut');
    expect(deps.registryQueue.enqueue).not.toHaveBeenCalled();
    expect(deps.dispatchInterfaceMessage).not.toHaveBeenCalled();
    expect(deps.registryQueue.markSent).not.toHaveBeenCalled();
    expect(deps.registryQueue.markFailed).not.toHaveBeenCalled();
    expect(updates.some(u => 'caseFlags' in u.patch)).toBe(false);
  });

  it('PS-179: with registry \'none\' at enterprise level and no facility override, nothing is queued or dispatched', async () => {
    const { deps } = makeDeps();
    expect((await signOut(makeInput(), deps)).outcome).toBe('signedOut');
    expect(deps.registryQueue.enqueue).not.toHaveBeenCalled();
    expect(deps.dispatchInterfaceMessage).not.toHaveBeenCalled();
  });
});

// Batch 450: each sign-out step saved the whole specimen list from the case as
// loaded, so the last write erased the earlier ones. An HSIL sign-out with a
// later biopsy lost its targeted peer-review flag (found writing PS-214 tests).
describe('signOutCytologyCase — sign-out steps keep each other\'s results (Batch 450)', () => {
  const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();
  const lastSaved = (updates: { caseId: string; patch: Record<string, unknown> }[]) => {
    const writes = updates.filter(u => u.caseId === 'C1' && 'specimens' in u.patch);
    return (writes[writes.length - 1].patch.specimens as { id: string; cytologyScreening: Record<string, unknown>; roseEvaluations?: unknown[] }[]).find(sp => sp.id === 'SP1')!;
  };
  const hsil = { id: 'rv-1', caseId: 'C1', specimenId: 'SP1', role: 'final', primaryInterpretationId: 'hsil', requiresPathologistReview: true, adequacySelections: [{ categoryId: 'unsat' }], recordedBy: { userId: 'CT1', userName: 'CT' } } as never;
  const laterBiopsy = { getAllCases: async () => ({ ok: true as const, data: [{ id: 'C2', patient: { id: 'PT1' }, specimens: [{ id: 'B1', specimenDictionaryEntryId: 'biopsy', receivedAt: day(30) }] }] as never }),
    getSpecimenDictionary: async () => ({ ok: true as const, data: [{ id: 'biopsy', type: 'Biopsy' }] as never }) };

  it('an HSIL sign-out with a later biopsy keeps both the targeted peer-review flag and the correlation candidates', async () => {
    const { deps, updates } = makeDeps(laterBiopsy);
    expect((await signOut(makeInput({ finalReview: hsil, reviews: [hsil] }), deps)).outcome).toBe('signedOut');
    const saved = lastSaved(updates).cytologyScreening;
    expect(saved.postSignOutPeerReviewFlag).toMatchObject({ reason: 'targeted_high_risk' });
    expect(saved.histologyCorrelationCandidates).toEqual([{ candidateCaseId: 'C2', detectedAt: NOW.toISOString() }]);
  });

  it('a ROSE discrepancy link, the peer-review flag and the candidates all survive together', async () => {
    const rose = [{ id: 'rose-1', performedAt: day(-1), passes: [{ adequacyAssessment: 'adequate' }] }];
    const specimen = { id: 'SP1', description: 'FNA', cytologyScreening: {}, roseEvaluations: rose };
    const { deps, updates } = makeDeps(laterBiopsy);
    const input = makeInput({ finalReview: hsil, reviews: [hsil], specimen,
      caseData: { id: 'C1', accession: { fullAccession: 'S26-C1' }, patient: { id: 'PT1', firstName: 'A', lastName: 'B' }, order: { facilityId: 'F1' }, participants: [SIGNER], specimens: [specimen] } as never });
    expect((await signOut(input, deps)).outcome).toBe('signedOut');
    const saved = lastSaved(updates);
    expect(deps.createQcAssignment).toHaveBeenCalled();
    expect(saved.roseEvaluations).toEqual([expect.objectContaining({ id: 'rose-1', qcCaseAssignmentId: 'qc-1' })]);
    expect(saved.cytologyScreening.postSignOutPeerReviewFlag).toMatchObject({ reason: 'targeted_high_risk' });
    expect(saved.cytologyScreening.histologyCorrelationCandidates).toEqual([{ candidateCaseId: 'C2', detectedAt: NOW.toISOString() }]);
  });
});

// PS-71 (Batch 458): every sign-out save carries the version it was built
// from; a stale one is rebuilt from the newer case, never saved over it.
describe('signOutCytologyCase — versioned saves (PS-71)', () => {
  it('a peer-review flag saved while someone else changed the specimen is re-applied to their version: both survive', async () => {
    const { deps, store, updates } = makeDeps({ random: () => 0.05, getQcSettings: async () => ({ enterprise: { negativeRandomSelectionRatePercent: 10, nonNegativeRandomSelectionRatePercent: 10 }, facility: null, staff: null }) });
    const realUpdate = deps.updateCase;
    let interfered = false;
    // Just before the first specimen save lands, another person saves a review note on SP1.
    deps.updateCase = vi.fn(async (caseId: string, patch: Record<string, unknown>, v: number) => {
      if (!interfered && 'specimens' in patch) {
        interfered = true;
        const c = store.get(caseId);
        store.set(caseId, { ...c, version: c.version + 1, specimens: c.specimens.map((sp: any) => ({ ...sp, cytologyScreening: { ...sp.cytologyScreening, reviewNotes: ['theirs'] } })) });
      }
      return realUpdate(caseId, patch, v);
    });
    expect((await signOut(makeInput(), deps)).outcome).toBe('signedOut');
    const saved = store.get('C1').specimens[0].cytologyScreening;
    expect(saved.reviewNotes).toEqual(['theirs']);
    expect(saved.postSignOutPeerReviewFlag).toMatchObject({ reason: 'random_selection' });
    expect(store.get('C1').status).toBe('finalized');
    // The stale attempt was refused, not recorded as saved.
    expect(updates.filter(u => 'specimens' in u.patch)).toHaveLength(1);
  });

  it('every case save passes an expected version', async () => {
    const { deps } = makeDeps();
    await signOut(makeInput(), deps);
    const calls = vi.mocked(deps.updateCase).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(c => typeof c[2] === 'number')).toBe(true);
  });
});

// Batch 485 (PS-359 tracker follow-up — the cytology countersign completion
// gap Batch 483 disclosed but didn't build): an attending actually
// completing a specimen's own pending countersign.
describe('signOutCytologyCase — Batch 485: completing a specimen\'s own countersign', () => {
  it('completes this specimen\'s pending countersign record when the attending signs it out, and finalizes the case (its only cytology specimen)', async () => {
    const { deps, calls, updates } = makeDeps();
    await deps.releaseForCountersign({ caseId: 'C1', specimenId: 'SP1', residentId: 'R1', residentName: 'Dr R', releasedAnswersSnapshot: { SP1: { dx: 'nilm' } } });

    const input = makeInput({
      caseData: { id: 'C1', accession: { fullAccession: 'S26-C1' }, patient: { id: 'PT1', firstName: 'A', lastName: 'B' }, order: { facilityId: 'F1' }, participants: [SIGNER], specimens: [{ id: 'SP1', cytologyScreening: {} }], status: 'pending-countersign' } as never,
    });
    const result = await signOut(input, deps);
    expect(result.outcome).toBe('signedOut');
    expect(calls).toContain('countersign-complete');
    // The case's own only cytology specimen is now signed out, so the normal
    // finalize-status write wins over any countersign-driven revert.
    expect(updates).toContainEqual({ caseId: 'C1', patch: { status: 'finalized' } });
    expect(updates).not.toContainEqual({ caseId: 'C1', patch: { status: 'in-progress' } });

    const sp1 = await deps.countersign.getForSpecimen('C1', 'SP1');
    expect(sp1).toMatchObject({ ok: true, data: null }); // closed, not orphaned pending (the real, disclosed gap)
  });

  it('with a second, not-yet-signed cytology specimen on the case: closes SP1\'s own record and un-sticks the case from pending-countersign, without finalizing', async () => {
    const { deps, calls, updates } = makeDeps();
    await deps.releaseForCountersign({ caseId: 'C1', specimenId: 'SP1', residentId: 'R1', residentName: 'Dr R', releasedAnswersSnapshot: { SP1: { dx: 'nilm' } } });

    const input = makeInput({
      cytologySpecimenIds: ['SP1', 'SP2'],
      caseData: { id: 'C1', accession: { fullAccession: 'S26-C1' }, patient: { id: 'PT1', firstName: 'A', lastName: 'B' }, order: { facilityId: 'F1' }, participants: [SIGNER], specimens: [{ id: 'SP1', cytologyScreening: {} }, { id: 'SP2', cytologyScreening: {} }], status: 'pending-countersign' } as never,
    });
    const result = await signOut(input, deps);
    expect(result.outcome).toBe('signedOut');
    expect(result.caseFinalized).toBe(false);
    expect(calls).toContain('countersign-complete');
    // SP1's own record closed...
    expect(await deps.countersign.getForSpecimen('C1', 'SP1')).toMatchObject({ ok: true, data: null });
    // ...and since nothing else on the case is still pending, the case is no
    // longer genuinely blocked on anyone's countersign.
    expect(updates).toContainEqual({ caseId: 'C1', patch: { status: 'in-progress' } });
    expect(updates).not.toContainEqual({ caseId: 'C1', patch: { status: 'finalized' } });
  });

  it("a sibling specimen's own still-pending countersign keeps the case at pending-countersign — SP1's completion doesn't clear it", async () => {
    const { deps, calls, updates } = makeDeps();
    await deps.releaseForCountersign({ caseId: 'C1', specimenId: 'SP1', residentId: 'R1', residentName: 'Dr R', releasedAnswersSnapshot: {} });
    await deps.releaseForCountersign({ caseId: 'C1', specimenId: 'SP2', residentId: 'R2', residentName: 'Dr R2', releasedAnswersSnapshot: {} });

    const input = makeInput({
      cytologySpecimenIds: ['SP1', 'SP2'],
      caseData: { id: 'C1', accession: { fullAccession: 'S26-C1' }, patient: { id: 'PT1', firstName: 'A', lastName: 'B' }, order: { facilityId: 'F1' }, participants: [SIGNER], specimens: [{ id: 'SP1', cytologyScreening: {} }, { id: 'SP2', cytologyScreening: {} }], status: 'pending-countersign' } as never,
    });
    await signOut(input, deps);
    expect(calls).toContain('countersign-complete');
    // SP1 closed, SP2 is still a real, separate pending record — the case
    // genuinely is still awaiting someone's countersign, so no status write happens.
    expect(await deps.countersign.getForSpecimen('C1', 'SP1')).toMatchObject({ ok: true, data: null });
    const sp2 = await deps.countersign.getForSpecimen('C1', 'SP2');
    expect(sp2.ok && sp2.data?.status).toBe('pending');
    expect(updates.some(u => 'status' in u.patch)).toBe(false);
  });

  it('a normal sign-out with no pending countersign for this specimen never calls countersign-complete', async () => {
    const { deps, calls } = makeDeps();
    await signOut(makeInput(), deps);
    expect(calls).not.toContain('countersign-complete');
  });
});

// Batch 501 (Pete, Oct 9 — layered QC): ROSE and the QC Rules engine create or
// upgrade ONE open assignment per specimen; peer-review selection stays a flag.
describe('signOutCytologyCase — QC Rules engine and one assignment per specimen (Batch 501)', () => {
  const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();
  const ruleOf = (over: Record<string, unknown> = {}) => ({
    id: 'r-104', name: 'All GYN', active: true, evaluationPriority: 100, criteria: {},
    samplingLogic: { type: 'percentage', ratePercent: 100 }, peerReviewPriorityTier: 'targeted_high_consequence', slaHours: 24,
    eligibleReviewerRoles: ['SENIOR_PATHOLOGIST'], ...over,
  }) as never;
  /** An in-memory assignment store behind the new deps. */
  function qcDeps(rules: unknown[], seed: any[] = []) {
    const assignments: any[] = [...seed];
    const states = new Map<string, any>();
    const extra: Partial<CytologySignOutDeps> = {
      getActiveQcRules: vi.fn(async () => ({ ok: true as const, data: rules as never[] })),
      getQcAssignmentsForCase: vi.fn(async (caseId: string) => ({ ok: true as const, data: assignments.filter(a => a.caseId === caseId) })),
      createQcAssignment: vi.fn(async (a: any) => { const created = { ...a, id: `qc-${assignments.length + 1}` }; assignments.push(created); return { ok: true as const, data: created }; }),
      applyQcTrigger: vi.fn(async (id: string, changes: any) => { const i = assignments.findIndex(a => a.id === id); assignments[i] = { ...assignments[i], ...changes }; return { ok: true as const, data: assignments[i] }; }),
      qcSamplingStates: { getAll: vi.fn(async () => new Map(states)), saveAll: vi.fn(async (m: Map<string, any>) => { states.clear(); m.forEach((v, k) => states.set(k, v)); }) },
    };
    return { extra, assignments, states };
  }

  it('a matching rule creates a full assignment with its tier, SLA and reviewer pool', async () => {
    const { extra, assignments } = qcDeps([ruleOf()]);
    const { deps } = makeDeps(extra);
    expect((await signOut(makeInput(), deps)).outcome).toBe('signedOut');
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      caseId: 'C1', specimenId: 'SP1', triggerSource: 'rule_match', matchedRuleId: 'r-104', priorityTier: 'targeted_high_consequence',
      state: 'QC_PENDING', eligibleReviewerRoles: ['SENIOR_PATHOLOGIST'], slaDeadline: day(1), selectionReasons: ['rule:r-104'],
    });
  });

  it('the rule\'s sampling counter advances and is saved', async () => {
    const { extra, states } = qcDeps([ruleOf({ samplingLogic: { type: 'interval', everyNthCase: 3 } })]);
    const { deps } = makeDeps(extra);
    await signOut(makeInput(), deps);
    expect(states.get('r-104')).toMatchObject({ casesEvaluatedSinceReset: 1 });
  });

  it('a peer-review-flagged specimen that a rule also selects: one assignment, the flag recorded as a reason', async () => {
    const { extra, assignments } = qcDeps([ruleOf()]);
    const { deps } = makeDeps({ ...extra, random: () => 0.05, getQcSettings: async () => ({ enterprise: { negativeRandomSelectionRatePercent: 10, nonNegativeRandomSelectionRatePercent: 0 }, facility: null, staff: null }) });
    await signOut(makeInput(), deps);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].selectionReasons).toEqual(['rule:r-104', 'peer_review_flag:random_selection']);
  });

  it('peer-review selection alone never creates an assignment', async () => {
    const { extra, assignments } = qcDeps([]);
    const { deps } = makeDeps({ ...extra, random: () => 0.05, getQcSettings: async () => ({ enterprise: { negativeRandomSelectionRatePercent: 10, nonNegativeRandomSelectionRatePercent: 0 }, facility: null, staff: null }) });
    await signOut(makeInput(), deps);
    expect(assignments).toHaveLength(0);
  });

  it('ROSE and a rule on the same sign-out: one assignment, ROSE\'s top tier and 4-hour SLA, both reasons', async () => {
    const rose = [{ id: 'rose-1', performedAt: day(-1), passes: [{ adequacyAssessment: 'adequate' }] }];
    const specimen = { id: 'SP1', description: 'FNA', cytologyScreening: {}, roseEvaluations: rose };
    const unsat = { id: 'rv-1', caseId: 'C1', specimenId: 'SP1', role: 'final', primaryInterpretationId: 'nilm', requiresPathologistReview: false, adequacySelections: [{ categoryId: 'unsat' }], recordedBy: { userId: 'P1', userName: 'Dr P' } } as never;
    const { extra, assignments } = qcDeps([ruleOf()]);
    const { deps } = makeDeps(extra);
    await signOut(makeInput({ finalReview: unsat, reviews: [unsat], specimen, gateInputs: { isGynCytology: false, isFlaggedForQc: false, labJurisdiction: 'US' as never, signingProviderCredentials: [] },
      caseData: { id: 'C1', accession: { fullAccession: 'S26-C1' }, patient: { id: 'PT1' }, order: { facilityId: 'F1' }, participants: [SIGNER], specimens: [specimen] } as never }), deps);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      triggerSource: 'rose_discrepancy', priorityTier: 'high_escalation', slaDeadline: new Date(NOW.getTime() + 4 * 3_600_000).toISOString(),
      badges: ['ROSE Discrepancy'], selectionReasons: ['rose_discrepancy', 'rule:r-104'],
    });
    expect(assignments[0].history.map((h: any) => h.event)).toEqual(['created', 'reason_added']);
  });

  it('a rule upgrades an open assignment from an earlier sign-out step instead of duplicating it', async () => {
    const earlier = { id: 'qc-0', caseId: 'C1', specimenId: 'SP1', triggerSource: 'rule_match', matchedRuleId: 'r-10', priorityTier: 'routine_random', badges: [], state: 'QC_PENDING',
      primarySignOutProviderId: 'P1', slaDeadline: day(3), slaEscalationCount: 0, createdAt: day(-1), selectionReasons: ['rule:r-10'] };
    const { extra, assignments } = qcDeps([ruleOf()], [earlier]);
    const { deps } = makeDeps(extra);
    await signOut(makeInput(), deps);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({ id: 'qc-0', priorityTier: 'targeted_high_consequence', slaDeadline: day(1), eligibleReviewerRoles: ['SENIOR_PATHOLOGIST'], selectionReasons: ['rule:r-10', 'rule:r-104'] });
    expect(deps.applyQcTrigger).toHaveBeenCalledTimes(1);
  });

  it('a case in formal consultation is skipped by the rules (spec §2.2)', async () => {
    const { extra, assignments } = qcDeps([ruleOf()]);
    const { deps } = makeDeps(extra);
    await signOut(makeInput({ caseData: { id: 'C1', accession: { fullAccession: 'S26-C1' }, patient: { id: 'PT1' }, order: { facilityId: 'F1' },
      participants: [SIGNER], caseHolds: [{ reason: 'pending_consultation', active: true }], specimens: [{ id: 'SP1', cytologyScreening: {} }] } as never }), deps);
    expect(assignments).toHaveLength(0);
  });

  it('an inactive or non-matching rule creates nothing', async () => {
    const { extra, assignments } = qcDeps([ruleOf({ criteria: { specimenCategory: ['fna'] } }), ruleOf({ id: 'r-off', active: false })]);
    const { deps } = makeDeps(extra);
    await signOut(makeInput(), deps);
    expect(assignments).toHaveLength(0);
  });

  it('Batch 519 (PS-273): the review\'s synoptic template is read from the Synoptic Library before the translation check, which the service works out itself', async () => {
    resetCytologySynopticTemplateLibrary();
    const libraryTemplate = { ...CYTOLOGY_SYNOPTIC_TEMPLATES.find(t => t.id === 'thyroid_fna_cytology')!, id: 'lab_thyroid_v2' };
    const getSynopticTemplate = vi.fn(async () => libraryTemplate);
    const { deps } = makeDeps({ getSynopticTemplate });
    const base = makeInput();
    const finalReview = { ...(base.finalReview as object), synopticData: { templateId: 'lab_thyroid_v2', answers: { bethesda_category: 'ii_benign' } } } as never;
    // The gate binds the cytotechnologist track (a pathologist's sign-out isn't gated). German screen, no validated
    // German term, no acknowledgment: blocked, although the screen passed no check.
    const ct = { isPathologist: false, user: { id: 'CT1', name: 'CT', role: 'cytotechnologist' } };
    const blocked = await signOut({ ...base, ...ct, finalReview, reviews: [finalReview], uiLanguage: 'de', gateInputs: { ...base.gateInputs, translationCheck: undefined } }, deps);
    expect(getSynopticTemplate).toHaveBeenCalledWith('lab_thyroid_v2');
    expect(blocked).toEqual({ outcome: 'gateBlocked' });
    expect(deps.signatureGate.accept).not.toHaveBeenCalled();
    // In English (the source language) the same review signs out.
    const { deps: deps2 } = makeDeps({ getSynopticTemplate });
    expect((await signOut({ ...base, ...ct, finalReview, reviews: [finalReview], uiLanguage: 'en' }, deps2)).outcome).not.toBe('gateBlocked');
    resetCytologySynopticTemplateLibrary();
  });
});


// Batch 532 (Pete, Oct 12, 2026): one consolidated case report per accession.
// Each specimen is signed on its own; nothing is published until the case
// closes; then one FINAL with the case report PDF, and every sample goes to
// the registry together.
describe('signOutCytologyCase — Batch 532: the case report is released when the case closes', () => {
  const csms = { getRegistrySettings: async () => ({ enterprise: { registryId: 'csms_uk' }, facility: null }) } as Partial<CytologySignOutDeps>;
  const twoSpecimens = { id: 'C1', accession: { fullAccession: 'S26-C1' }, patient: { id: 'PT1', firstName: 'A', lastName: 'B' }, order: { facilityId: 'F1' }, participants: [SIGNER],
    specimens: [{ id: 'SP1', cytologyScreening: {} }, { id: 'SP2', cytologyScreening: {} }] } as never;
  const reviewFor = (id: string, specimenId: string) => ({ id, caseId: 'C1', specimenId, role: 'final', primaryInterpretationId: 'nilm', requiresPathologistReview: false, adequacySelections: [], recordedBy: { userId: 'P1', userName: 'Dr P' } }) as never;
  const sp1Record = { id: 'so-0', caseId: 'C1', specimenId: 'SP1', reviewRecordId: 'rv-0', signedAt: '2026-09-30T17:00:00.000Z', signedBy: { userId: 'P1', userName: 'Dr P', isPathologist: true },
    reportContent: { primaryInterpretation: 'NILM', accessionNumber: 'S26-C1' } } as never;

  it('the first of two specimens: signed and recorded, but nothing published and nothing sent to the registry', async () => {
    const { deps, calls } = makeDeps(csms);
    const result = await signOut(makeInput({ caseData: twoSpecimens, cytologySpecimenIds: ['SP1', 'SP2'] }), deps);
    expect(result).toMatchObject({ outcome: 'signedOut', caseFinalized: false, specimensRemaining: 1, published: false });
    expect(calls).toEqual(['record', 'commit:signed']);
    expect(deps.publishReportReleased).not.toHaveBeenCalled();
    expect(deps.registryQueue.enqueue).not.toHaveBeenCalled();
  });

  it('the last specimen: one FINAL with the case report built from every record, and every sample to the registry in case order', async () => {
    const generateCaseReportPdfSnapshot = vi.fn(async () => ({ pdfBase64: 'CASE' }));
    const { deps } = makeDeps({
      ...csms, generateCaseReportPdfSnapshot,
      getCaseSignOutRecords: async () => ({ ok: true, data: [sp1Record] }),
      getAllReviews: async () => ({ ok: true, data: [reviewFor('rv-0', 'SP1')] }),
    });
    const sp2Review = reviewFor('rv-2', 'SP2');
    const result = await signOut(makeInput({
      caseData: twoSpecimens, cytologySpecimenIds: ['SP1', 'SP2'], specimenId: 'SP2', specimen: { id: 'SP2', description: 'Pap', cytologyScreening: {} },
      finalReview: sp2Review, reviews: [sp2Review],
    }), deps);
    expect(result).toMatchObject({ outcome: 'signedOut', caseFinalized: true, specimensRemaining: 0, published: true });
    expect(deps.publishReportReleased).toHaveBeenCalledTimes(1);
    const release = (deps.publishReportReleased as any).mock.calls[0][0];
    expect(release).toMatchObject({ caseId: 'C1', reportType: 'FINAL', source: 'CYTOLOGY' });
    expect(release.instanceId).toBeUndefined();
    await expect(release.generatePdf()).resolves.toEqual({ pdfBase64: 'CASE' });
    expect((generateCaseReportPdfSnapshot.mock.calls[0] as any[])[1].map((r: any) => r.specimenId)).toEqual(['SP1', 'SP2']);
    expect((deps.registryQueue.enqueue as any).mock.calls.map((c: any[]) => c[0].signOutRecordId)).toEqual(['so-0', 'so-1']);
  });

  it('a case finalized early: a later sign-out adds its specimen to the released report as an ADDENDUM, and only that sample goes to the registry', async () => {
    const { deps } = makeDeps({ ...csms, getCaseSignOutRecords: async () => ({ ok: true, data: [sp1Record] }) });
    const early = { ...(twoSpecimens as any), cytologyEarlyFinalization: { reason: 'Clinical urgency', unsignedSpecimenIds: ['SP2'] } };
    const sp2Review = reviewFor('rv-2', 'SP2');
    const result = await signOut(makeInput({
      caseData: early, cytologySpecimenIds: ['SP1', 'SP2'], specimenId: 'SP2', specimen: { id: 'SP2', description: 'Pap', cytologyScreening: {} },
      finalReview: sp2Review, reviews: [sp2Review],
    }), deps);
    expect(result).toMatchObject({ published: true });
    expect(deps.publishReportReleased).toHaveBeenCalledWith(expect.objectContaining({ reportType: 'ADDENDUM', instanceId: 'so-1' }));
    expect((deps.registryQueue.enqueue as any).mock.calls.map((c: any[]) => c[0].signOutRecordId)).toEqual(['so-1']);
  });

  it('without a case report renderer, the release falls back to the signed record\'s own PDF', async () => {
    const generatePdfSnapshot = vi.fn(async () => ({ pdfBase64: 'ONE' }));
    const { deps } = makeDeps({ generatePdfSnapshot });
    await signOut(makeInput(), deps);
    await expect((deps.publishReportReleased as any).mock.calls[0][0].generatePdf()).resolves.toEqual({ pdfBase64: 'ONE' });
  });
});

describe('releaseFinalizedCytologyCase (Batch 532)', () => {
  const user = { id: 'P1', name: 'Dr P' };
  it('publishes the case report once as FINAL and sends each signed sample to the registry', async () => {
    const record = { id: 'so-0', caseId: 'C1', specimenId: 'SP1', reviewRecordId: 'rv-0', signedAt: '2026-09-30T17:00:00.000Z', signedBy: { userId: 'P1', userName: 'Dr P', isPathologist: true }, reportContent: { primaryInterpretation: 'NILM' } } as never;
    const generateCaseReportPdfSnapshot = vi.fn(async () => ({ pdfBase64: 'CASE' }));
    const { deps, store } = makeDeps({
      getRegistrySettings: async () => ({ enterprise: { registryId: 'csms_uk' }, facility: null }),
      generateCaseReportPdfSnapshot,
      getCaseSignOutRecords: async () => ({ ok: true, data: [record] }),
      getAllReviews: async () => ({ ok: true, data: [{ id: 'rv-0', caseId: 'C1', specimenId: 'SP1', role: 'final', primaryInterpretationId: 'nilm', requiresPathologistReview: false, adequacySelections: [], recordedBy: { userId: 'P1', userName: 'Dr P' } } as never] }),
    });
    store.set('C1', { version: 0, id: 'C1', patient: { id: 'PT1', firstName: 'A', lastName: 'B' }, order: { facilityId: 'F1' }, specimens: [{ id: 'SP1' }, { id: 'SP2' }],
      cytologyEarlyFinalization: { reason: 'Clinical urgency', unsignedSpecimenIds: ['SP2'] } });
    await releaseFinalizedCytologyCase({ caseId: 'C1', categories, isGynCytology: true, user }, deps);
    expect(deps.publishReportReleased).toHaveBeenCalledTimes(1);
    const release = (deps.publishReportReleased as any).mock.calls[0][0];
    expect(release).toMatchObject({ caseId: 'C1', reportType: 'FINAL', source: 'CYTOLOGY', performingFacilityId: 'F1' });
    await expect(release.generatePdf()).resolves.toEqual({ pdfBase64: 'CASE' });
    expect((deps.registryQueue.enqueue as any).mock.calls.map((c: any[]) => c[0].signOutRecordId)).toEqual(['so-0']);
  });

  it('a case with no signed specimen publishes nothing', async () => {
    const { deps, store } = makeDeps();
    store.set('C1', { version: 0, id: 'C1', specimens: [] });
    await releaseFinalizedCytologyCase({ caseId: 'C1', categories, isGynCytology: true, user }, deps);
    expect(deps.publishReportReleased).not.toHaveBeenCalled();
  });

  it('an unknown case publishes nothing', async () => {
    const { deps } = makeDeps();
    await releaseFinalizedCytologyCase({ caseId: 'NOPE', categories, isGynCytology: true, user }, deps);
    expect(deps.publishReportReleased).not.toHaveBeenCalled();
  });
});

// Batch 534 (Pete, Oct 12, 2026): every report output follows the release delay. With releaseReport
// wired, the case report and its registry submissions go through it (now, or when the delay ends).
describe('signOutCytologyCase — Batch 534: through the release delay', () => {
  const csms = { getRegistrySettings: async () => ({ enterprise: { registryId: 'csms_uk' }, facility: null }) } as Partial<CytologySignOutDeps>;
  const twoSpecimens = { id: 'C1', status: 'in-progress', accession: { fullAccession: 'S26-C1' }, patient: { id: 'PT1', firstName: 'A', lastName: 'B' }, order: { facilityId: 'F1' }, participants: [SIGNER],
    specimens: [{ id: 'SP1', cytologyScreening: {} }, { id: 'SP2', cytologyScreening: {} }] } as never;
  const review = (id: string, specimenId: string) => ({ id, caseId: 'C1', specimenId, role: 'final', primaryInterpretationId: 'nilm', requiresPathologistReview: false, adequacySelections: [], recordedBy: { userId: 'P1', userName: 'Dr P' } }) as never;
  const sp1Record = { id: 'so-0', caseId: 'C1', specimenId: 'SP1', reviewRecordId: 'rv-0', signedAt: '2026-09-30T17:00:00.000Z', signedBy: { userId: 'P1', userName: 'Dr P', isPathologist: true }, reportContent: { primaryInterpretation: 'NILM' } } as never;

  it('the last specimen: one FINAL through the delay, the registry for every sample with it, and Recall can reopen the specimen', async () => {
    const releaseReport = vi.fn(async () => ({ held: {} }));
    const { deps } = makeDeps({ ...csms, releaseReport, getCaseSignOutRecords: async () => ({ ok: true, data: [sp1Record] }) });
    const r2 = review('rv-2', 'SP2');
    const result = await signOut(makeInput({ caseData: twoSpecimens, cytologySpecimenIds: ['SP1', 'SP2'], specimenId: 'SP2', specimen: { id: 'SP2', description: 'Pap', cytologyScreening: {} }, finalReview: r2, reviews: [r2] }), deps);
    expect(result).toMatchObject({ caseFinalized: true, published: true });
    expect(deps.publishReportReleased).not.toHaveBeenCalled();
    expect(deps.registryQueue.enqueue).not.toHaveBeenCalled();
    const [event, hold] = (releaseReport.mock.calls[0] as unknown) as [any, any];
    expect(event).toMatchObject({ caseId: 'C1', reportType: 'FINAL', source: 'CYTOLOGY' });
    expect(hold).toMatchObject({
      kind: 'cytology-sign-out', releasedBy: { userId: 'P1', userName: 'Dr P' },
      subject: { recordId: 'so-1', specimenId: 'SP2', previousStatus: 'in-progress' },
      followUps: [{ type: 'cytology-registry', recordIds: ['so-0', 'so-1'], isGynCytology: true }],
    });
  });

  it('a specimen signed after an early finalization goes as its own held ADDENDUM, its sample only', async () => {
    const releaseReport = vi.fn(async () => ({ held: {} }));
    const { deps } = makeDeps({ releaseReport, getCaseSignOutRecords: async () => ({ ok: true, data: [sp1Record] }) });
    const r2 = review('rv-2', 'SP2');
    await signOut(makeInput({ caseData: { ...(twoSpecimens as any), cytologyEarlyFinalization: { reason: 'x', unsignedSpecimenIds: ['SP2'] } }, cytologySpecimenIds: ['SP1', 'SP2'],
      specimenId: 'SP2', specimen: { id: 'SP2', description: 'Pap', cytologyScreening: {} }, finalReview: r2, reviews: [r2] }), deps);
    const [event, hold] = (releaseReport.mock.calls[0] as unknown) as [any, any];
    expect(event).toMatchObject({ reportType: 'ADDENDUM', instanceId: 'so-1' });
    expect(hold).toMatchObject({ kind: 'cytology-late-sign-out', followUps: [{ recordIds: ['so-1'] }] });
  });

  it('an early finalization goes through the delay too; Recall undoes it', async () => {
    const releaseReport = vi.fn(async () => ({ held: {} }));
    const { deps, store } = makeDeps({ releaseReport, getCaseSignOutRecords: async () => ({ ok: true, data: [sp1Record] }) });
    store.set('C1', { version: 0, id: 'C1', order: { facilityId: 'F1' }, specimens: [{ id: 'SP1' }, { id: 'SP2' }] });
    await releaseFinalizedCytologyCase({ caseId: 'C1', categories, isGynCytology: true, user: { id: 'P1', name: 'Dr P' }, previousStatus: 'in-progress' }, deps);
    expect(deps.publishReportReleased).not.toHaveBeenCalled();
    const [event, hold] = (releaseReport.mock.calls[0] as unknown) as [any, any];
    expect(event).toMatchObject({ reportType: 'FINAL', performingFacilityId: 'F1' });
    expect(hold).toMatchObject({ kind: 'cytology-finalize-early', subject: { previousStatus: 'in-progress' }, followUps: [{ type: 'cytology-registry', recordIds: ['so-0'] }] });
  });
});
