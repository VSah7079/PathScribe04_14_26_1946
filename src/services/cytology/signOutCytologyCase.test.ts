// Batch 409 (PS-359): cytology sign-out, moved out of the Cytology Workspace
// page, with its new permission checked first. Pathologist track throughout.
import { describe, it, expect, vi } from 'vitest';
import { signOutCytologyCase, type CytologySignOutDeps, type CytologySignOutInput } from './signOutCytologyCase';

const NOW = new Date('2026-09-30T18:00:00.000Z');
const categories = [
  { id: 'nilm', diagnosticRank: 0 }, { id: 'hsil', diagnosticRank: 4 }, { id: 'unsat', isUnsatisfactory: true },
] as never[];

function makeDeps(over: Partial<CytologySignOutDeps> = {}) {
  const calls: string[] = [];
  const updates: { caseId: string; patch: Record<string, unknown> }[] = [];
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
    releaseForCountersign: vi.fn(async () => { calls.push('countersign'); }),
    updateCase: vi.fn(async (caseId: string, patch: Record<string, unknown>) => { updates.push({ caseId, patch }); }),
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
  return { deps, calls, updates };
}

function makeInput(over: Partial<CytologySignOutInput> = {}): CytologySignOutInput {
  const finalReview = { id: 'rv-1', caseId: 'C1', specimenId: 'SP1', role: 'final', primaryInterpretationId: 'nilm', requiresPathologistReview: false, adequacySelections: [], recordedBy: { userId: 'P1', userName: 'Dr P' } } as never;
  return {
    caseData: { id: 'C1', accession: { fullAccession: 'S26-C1' }, patient: { id: 'PT1', firstName: 'A', lastName: 'B' }, order: { facilityId: 'F1' }, participants: [], specimens: [{ id: 'SP1', cytologyScreening: {} }] } as never,
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
    expect(await signOutCytologyCase(makeInput(), deps)).toEqual({ outcome: 'notPermitted' });
    expect(deps.enforce).toHaveBeenCalledWith('cytology:report:sign-out', { caseId: 'C1' });
    expect(deps.signatureGate.accept).not.toHaveBeenCalled();
    expect(deps.createSignOutRecord).not.toHaveBeenCalled();
  });

  it('a refused signature stops it with the gate\'s reason', async () => {
    const { deps } = makeDeps({ signatureGate: { accept: async () => ({ ok: false as const, reason: 'wrongPin' }), commit: vi.fn(), release: vi.fn() } });
    expect(await signOutCytologyCase(makeInput(), deps)).toEqual({ outcome: 'signatureRefused', reason: 'wrongPin' });
    expect(deps.createSignOutRecord).not.toHaveBeenCalled();
  });

  it('signs out: the record, the case finalized, the signature committed, then the release event, in that order', async () => {
    const { deps, calls, updates } = makeDeps();
    expect(await signOutCytologyCase(makeInput(), deps)).toEqual({ outcome: 'signedOut', retrospectiveFlagged: 0, caseFinalized: true, specimensRemaining: 0 });
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
    expect(await signOutCytologyCase(input, deps)).toEqual({ outcome: 'releasedForCountersign' });
    expect(calls).toEqual(['countersign', 'commit:released_for_countersign']);
    expect(deps.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: ['attending@example.org'] }));
    expect(deps.createSignOutRecord).not.toHaveBeenCalled();
  });

  it('a pathologist who isn\'t on the case lacks signing authority: refused, and the signature released', async () => {
    const { deps, calls } = makeDeps({ getSessionUser: () => ({ id: 'P9', role: 'pathologist' }) });
    const result = await signOutCytologyCase(makeInput({ user: { id: 'P9', name: 'Dr Nine' } }), deps);
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
    const result = await signOutCytologyCase(makeInput({ finalReview: hsil, reviews: [hsil] }), deps);
    expect(result).toMatchObject({ outcome: 'signedOut', retrospectiveFlagged: 1 });
    const flagged = updates.find(u => u.caseId === 'C0')?.patch.specimens as { cytologyScreening: { retrospectiveReviewFlag: { triggeredByCaseId: string } } }[];
    expect(flagged[0].cytologyScreening.retrospectiveReviewFlag.triggeredByCaseId).toBe('C1');
  });

  it('reports to the national registry when the facility has one; a CSMS case with no reason for study is flagged', async () => {
    const { deps, updates } = makeDeps({ getRegistrySettings: async () => ({ enterprise: { registryId: 'csms_uk' }, facility: null }) });
    await signOutCytologyCase(makeInput(), deps);
    expect(deps.registryQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'C1', signOutRecordId: 'so-1', registryId: 'csms_uk' }));
    // Batch 419: the payload header, NEW and test by default, and the payload carries it.
    const submission = (deps.registryQueue.enqueue as any).mock.calls[0][0].submission;
    expect(submission).toMatchObject({ submissionVersion: 1, messageType: 'NEW', environment: 'test', isDuplicateRetry: false });
    expect((deps.dispatchInterfaceMessage as any).mock.calls[0][2].submission).toEqual(submission);
    expect(deps.registryQueue.markSent).toHaveBeenCalledWith('rq-1');
    const flags = updates.find(u => 'caseFlags' in u.patch)?.patch.caseFlags as { flagDefinitionId: string }[];
    expect(flags?.[0].flagDefinitionId).toBe('f36');
  });

  it('Batch 418: a patient who opted out of screening reporting is excluded by consent, nothing built, never retried', async () => {
    const { deps } = makeDeps({ getRegistrySettings: async () => ({ enterprise: { registryId: 'csms_uk' }, facility: null }) });
    const input = makeInput();
    (input.caseData as any).patient.registryConsent = { screeningOptOut: true, cancerRegistryOptOut: false, recordedAt: '2026-09-30T00:00:00.000Z' };
    const result = await signOutCytologyCase(input, deps);
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
    expect((await signOutCytologyCase(makeInput(), deps)).outcome).toBe('signedOut');
    expect(deps.registryQueue.markFailed).toHaveBeenCalledWith('rq-1', { errorCode: 'TIMEOUT', errorMessage: 'no answer', maxRetriesExceeded: false });
  });

  it('Batch 411: a case with another cytology specimen still to sign out stays open', async () => {
    const { deps, updates } = makeDeps();
    const result = await signOutCytologyCase(makeInput({ cytologySpecimenIds: ['SP1', 'SP2'] }), deps);
    expect(result).toMatchObject({ outcome: 'signedOut', caseFinalized: false, specimensRemaining: 1 });
    expect(updates).not.toContainEqual({ caseId: 'C1', patch: { status: 'finalized' } });
    expect(deps.createSignOutRecord).toHaveBeenCalledWith(expect.objectContaining({ specimenId: 'SP1' }));
  });

  it('Batch 411: signing out the last one finalizes the case', async () => {
    const { deps, updates } = makeDeps({ getCaseSignOutRecords: async () => ({ ok: true, data: [{ specimenId: 'SP2' }] as never }) });
    const result = await signOutCytologyCase(makeInput({ cytologySpecimenIds: ['SP1', 'SP2'] }), deps);
    expect(result).toMatchObject({ caseFinalized: true, specimensRemaining: 0 });
    expect(updates).toContainEqual({ caseId: 'C1', patch: { status: 'finalized' } });
  });

  it('Batch 413: a Non-GYN specimen is never sent to a cervical screening registry', async () => {
    const { deps } = makeDeps({ getRegistrySettings: async () => ({ enterprise: { registryId: 'csms_uk' }, facility: null }) });
    const input = makeInput();
    const result = await signOutCytologyCase({ ...input, gateInputs: { ...input.gateInputs, isGynCytology: false } }, deps);
    expect(result.outcome).toBe('signedOut');
    expect(deps.registryQueue.enqueue).not.toHaveBeenCalled();
  });

  it('Batch 413: the CSMS eligibility flag is added once per case, not per specimen', async () => {
    const { deps, updates } = makeDeps({ getRegistrySettings: async () => ({ enterprise: { registryId: 'csms_uk' }, facility: null }) });
    const input = makeInput();
    const flagged = { ...input.caseData, caseFlags: [{ id: 'x', flagDefinitionId: 'f36', deletedAt: null }] } as never;
    await signOutCytologyCase({ ...input, caseData: flagged }, deps);
    expect(deps.registryQueue.enqueue).toHaveBeenCalled();
    expect(updates.some(u => 'caseFlags' in u.patch)).toBe(false);
  });

  it('Batch 414: a registry that isn\'t ready holds the result (queued, marked failed with the reason), never sends it half-coded', async () => {
    const { deps } = makeDeps({
      getRegistrySettings: async () => ({ enterprise: { registryId: 'sccrs_scotland' }, facility: null }),
      getRegistryConfig: async (registryId: any) => ({ registryId, requireMappedCodes: true, codeMappings: [] }),
    });
    expect((await signOutCytologyCase(makeInput(), deps)).outcome).toBe('signedOut');
    expect(deps.registryQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ registryId: 'sccrs_scotland' }));
    expect(deps.dispatchInterfaceMessage).not.toHaveBeenCalled();
    expect(deps.registryQueue.markFailed).toHaveBeenCalledWith('rq-1', expect.objectContaining({ errorCode: 'REGISTRY_NOT_READY' }));
  });

  it('Batch 415: a cytotechnologist also needs cytology:ct-report:sign-out; a pathologist doesn\'t', async () => {
    const enforce = vi.fn(async (cap: string) => ({ allowed: cap !== 'cytology:ct-report:sign-out' }));
    const { deps } = makeDeps({ enforce });
    expect(await signOutCytologyCase(makeInput({ isPathologist: false }), deps)).toEqual({ outcome: 'ctNotPermitted' });
    expect(deps.signatureGate.accept).not.toHaveBeenCalled();
    const path = makeDeps({ enforce });
    expect((await signOutCytologyCase(makeInput(), path.deps)).outcome).toBe('signedOut');
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
    expect(await signOutCytologyCase({ ...input, gateInputs: { ...input.gateInputs, labJurisdiction: 'GB_EW' as never } }, uk.deps)).toMatchObject({ retrospectiveFlagged: 0 });
    const ukOn = makeDeps({ ...over, getComplianceSettings: async () => ({ enterprise: { fiveYearLookback: 'on' }, facility: null }) });
    expect(await signOutCytologyCase({ ...input, gateInputs: { ...input.gateInputs, labJurisdiction: 'GB_EW' as never } }, ukOn.deps)).toMatchObject({ retrospectiveFlagged: 1 });
  });
});

