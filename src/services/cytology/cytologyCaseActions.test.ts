// Batch 410 (PS-359): the Cytology Workspace's other actions, moved out of the
// page, each with its permission checked first.
import { describe, it, expect, vi } from 'vitest';
import {
  addCytologyDecant, updateCytologyDecantStains, applyCytologyCodeChanges, buildCytologyPrintDocument, completeCytologyRetrospectiveReview,
  dismissHistologyCorrelationCandidate, recordCytologyHistologyCorrelation, removeCytologyQcFlag, resolveHistologyCorrelations,
  selectCytologyFinalDiagnosis,
} from './cytologyCaseActions';
import { makeWorkspaceDeps } from './cytologyWorkspaceTestDeps';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';
import { saveCytologyReview } from './saveCytologyReview';
import { EMPTY_DRAFT } from './cytologyReviewDraft';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import { openHistologyCorrelationCandidates, type CytologyGateContext } from './cytologyWorkspaceView';
import { resolveCytologyHistologyCorrelationPoolMembership } from './resolveCytologyHistologyCorrelationPoolMembership';

const categories = [
  { id: 'nilm', label: 'NILM', section: 'interpretation_result', diagnosticRank: 0, requiresPathologistReview: false },
  { id: 'hsil', label: 'HSIL', section: 'interpretation_result', diagnosticRank: 4, requiresPathologistReview: true },
] as never[];
const specimen = { id: 'SP1', label: 'A', description: 'Pap', cytologyScreening: { histologyCorrelationCandidates: [{ candidateCaseId: 'H1' }, { candidateCaseId: 'H2' }] }, decants: [] };
const caseData = { id: 'C1', accession: { fullAccession: 'S26-1' }, order: { facilityId: 'F1' }, patient: { firstName: 'A', lastName: 'B' }, specimens: [specimen] } as never;
const user = { id: 'U1', name: 'Dr U' };
const refuse = () => vi.fn(async () => ({ allowed: false }));
const gate = (isPathologist: boolean): CytologyGateContext => ({
  isGynCytology: true, isFlaggedForQc: false, categories, labJurisdiction: 'US', signingProviderCredentials: [], uiLanguage: 'en', pathologyLexicon: [], isPathologist,
});
const review = (id: string, primaryInterpretationId: string, requiresPathologistReview: boolean) =>
  ({ id, role: 'primary_screen', primaryInterpretationId, requiresPathologistReview, adequacySelections: [], recordedAt: '2026-09-29T00:00:00Z', recordedBy: { userId: 'CT1', userName: 'CT One' } }) as never;

describe('selectCytologyFinalDiagnosis', () => {
  it('needs cytology:final-diagnosis:select', async () => {
    const { deps, updates } = makeWorkspaceDeps({ enforce: refuse() });
    expect(await selectCytologyFinalDiagnosis({ caseData, specimenId: 'SP1', review: review('r1', 'nilm', false), user, gate: gate(true) }, deps)).toBe('notPermitted');
    expect(deps.enforce).toHaveBeenCalledWith('cytology:final-diagnosis:select', { caseId: 'C1' });
    expect(updates).toEqual([]);
  });
  it('a cytotechnologist can\'t choose a review that needs a pathologist', async () => {
    const { deps, updates } = makeWorkspaceDeps();
    expect(await selectCytologyFinalDiagnosis({ caseData, specimenId: 'SP1', review: review('r1', 'hsil', true), user, gate: gate(false) }, deps)).toBe('pathologistOnly');
    expect(updates).toEqual([]);
  });
  it('stores the snapshot, who chose it and when', async () => {
    const { deps, updates } = makeWorkspaceDeps();
    expect(await selectCytologyFinalDiagnosis({ caseData, specimenId: 'SP1', review: review('r1', 'hsil', true), user, gate: gate(true) }, deps)).toBe('selected');
    expect(updates[0].patch.specimens[0].cytologyScreening.finalDiagnosis).toMatchObject({ reviewRecordId: 'r1', selectedBy: 'U1', selectedAt: '2026-09-30T18:00:00.000Z' });
  });
});

describe('removeCytologyQcFlag', () => {
  it('needs cytology:qc-flag:remove', async () => {
    const { deps, updates } = makeWorkspaceDeps({ enforce: refuse() });
    expect(await removeCytologyQcFlag({ caseData, specimenId: 'SP1', user }, deps)).toBe('notPermitted');
    expect(deps.enforce).toHaveBeenCalledWith('cytology:qc-flag:remove', { caseId: 'C1' });
    expect(updates).toEqual([]);
  });
  it('removes the flag and audits it', async () => {
    const { deps, updates, audit } = makeWorkspaceDeps();
    expect(await removeCytologyQcFlag({ caseData, specimenId: 'SP1', user, currentReason: 'random_selection' }, deps)).toBe('removed');
    expect(updates[0].patch.specimens[0].cytologyScreening.qcFlag).toBeUndefined();
    expect(audit[0]).toMatchObject({ event: 'Cytology QC flag removed', caseId: 'S26-1' });
    expect(audit[0].detail).toContain('random_selection');
  });
});

describe('completeCytologyRetrospectiveReview', () => {
  const flag = { triggeredByCaseId: 'C9' };
  it('needs an outcome, then cytology:retrospective-review:record', async () => {
    const { deps } = makeWorkspaceDeps({ enforce: refuse() });
    expect(await completeCytologyRetrospectiveReview({ caseData, specimenId: 'SP1', flag, outcome: '', correctiveAction: '', user }, deps)).toBe('incomplete');
    expect(await completeCytologyRetrospectiveReview({ caseData, specimenId: 'SP1', flag, outcome: 'screening_error', correctiveAction: '', user }, deps)).toBe('notPermitted');
  });
  it('records the outcome, a trimmed corrective action, and the reviewer', async () => {
    const { deps, updates } = makeWorkspaceDeps();
    await completeCytologyRetrospectiveReview({ caseData, specimenId: 'SP1', flag, outcome: 'screening_error', correctiveAction: '  retrain ', user }, deps);
    expect(updates[0].patch.specimens[0].cytologyScreening.retrospectiveReviewFlag).toMatchObject({ triggeredByCaseId: 'C9', outcome: 'screening_error', correctiveAction: 'retrain', reviewedBy: 'U1' });
  });
});

describe('cyto-histologic correlation', () => {
  const resolution = { cytologyDxLabel: 'HSIL', outcome: 'major_discrepancy' as const, cytologyRank: 4, histologyRank: 1 };
  it('recording needs cytology:histology-correlation:record; so does dismissing', async () => {
    const { deps, qa } = makeWorkspaceDeps({ enforce: refuse() });
    expect(await recordCytologyHistologyCorrelation({ caseData, specimenId: 'SP1', specimen, candidateCaseId: 'H1', categories, finalPrimaryInterpretationId: 'hsil', entry: { kind: 'resolved', resolution, unknownDiagnosis: '?' }, user }, deps)).toBe('notPermitted');
    expect(await dismissHistologyCorrelationCandidate({ caseData, specimenId: 'SP1', specimen, candidateCaseId: 'H1' }, deps)).toBe('notPermitted');
    expect(deps.enforce).toHaveBeenCalledWith('cytology:histology-correlation:record', { caseId: 'C1' });
    expect(qa).toEqual([]);
  });
  it('a confirmed automatic result: binary outcome, the magnitude and both ranks kept, the candidate marked recorded', async () => {
    const { deps, qa, updates } = makeWorkspaceDeps();
    expect(await recordCytologyHistologyCorrelation({ caseData, specimenId: 'SP1', specimen, candidateCaseId: 'H1', categories, finalPrimaryInterpretationId: 'hsil', entry: { kind: 'resolved', resolution, unknownDiagnosis: 'Unknown dx' }, user }, deps)).toBe('recorded');
    expect(qa[0]).toMatchObject({ outcome: 'discordant', fieldValues: { cytologyDx: 'HSIL', histologyDx: 'Unknown dx', histologyCaseId: 'H1', cytologyRank: 4, histologyRank: 1, discrepancyMagnitude: 'major_discrepancy' } });
    expect(updates[0].patch.specimens[0].cytologyScreening.histologyCorrelationCandidates).toEqual([{ candidateCaseId: 'H1', recordedActivityRecordId: 'qa-1' }, { candidateCaseId: 'H2' }]);
  });
  it('a manual entry has no histology rank and no magnitude', async () => {
    const { deps, qa } = makeWorkspaceDeps();
    await recordCytologyHistologyCorrelation({ caseData, specimenId: 'SP1', specimen, candidateCaseId: 'H2', categories, finalPrimaryInterpretationId: 'hsil', entry: { kind: 'manual', histologyDx: 'CIN3', outcome: 'concordant', cytologyRank: 4 }, user }, deps);
    expect(qa[0].fieldValues).toEqual({ cytologyDx: 'HSIL', histologyDx: 'CIN3', histologyCaseId: 'H2', cytologyRank: 4 });
    expect(qa[0].outcome).toBe('concordant');
  });
  it('the automatic lookup is unresolvable until a SNOMED mapping exists', async () => {
    const { deps } = makeWorkspaceDeps({ getCase: async () => ({ id: 'H1', specimens: [{ coding: { snomed: [{ code: '123' }] } }] }) as never });
    const r = await resolveHistologyCorrelations({ specimen, categories, finalPrimaryInterpretationId: 'hsil' }, deps);
    expect(r.H1).toMatchObject({ cytologyDxLabel: 'HSIL', outcome: 'unresolvable', cytologyRank: 4 });
  });

  // Batch 450 (PS-221): the candidate case's codes are pooled across all its specimens.
  const mapping = [
    { id: 'm1', snomedCode: 'TEST-CIN1', description: 'CIN 1', severityRank: 1, createdAt: '' },
    { id: 'm3', snomedCode: 'TEST-CIN3', description: 'CIN 3', severityRank: 4, createdAt: '' },
  ];
  const histologyCases: Record<string, unknown> = {
    // The relevant biopsy is the second specimen; the first carries a lower grade and an unmapped code.
    H1: { id: 'H1', specimens: [{ coding: { snomed: [{ code: 'TEST-CIN1' }, { code: 'UNMAPPED' }] } }, { coding: { snomed: [{ code: 'TEST-CIN3' }] } }] },
    // Only the third specimen is coded at all.
    H2: { id: 'H2', specimens: [{}, { coding: { snomed: [] } }, { coding: { snomed: [{ code: 'TEST-CIN1' }] } }] },
  };
  const withMapping = () => makeWorkspaceDeps({
    getSnomedSeverityMapping: async () => ({ ok: true, data: mapping }) as never,
    getCase: async (id: string) => histologyCases[id] as never,
  });

  it('the automatic result pools SNOMED codes across every specimen of the candidate case, highest severity wins', async () => {
    const { deps } = withMapping();
    const r = await resolveHistologyCorrelations({ specimen, categories, finalPrimaryInterpretationId: 'hsil' }, deps);
    expect(r.H1).toMatchObject({ outcome: 'concordant', cytologyRank: 4, histologyRank: 4 });
    // A code found only on a later specimen still counts; HSIL (4) against CIN 1 (1) is 3 steps: major.
    expect(r.H2).toMatchObject({ outcome: 'major_discrepancy', cytologyRank: 4, histologyRank: 1, histologyDxDescription: 'CIN 1' });
  });

  it('the histology diagnosis shown is the mapping entry that set the rank, not the first match in the mapping', async () => {
    const { deps } = withMapping();
    const r = await resolveHistologyCorrelations({ specimen, categories, finalPrimaryInterpretationId: 'hsil' }, deps);
    expect(r.H1.histologyDxDescription).toBe('CIN 3');
  });

  it('a candidate already recorded is not looked up again; with no final diagnosis the result is unresolvable', async () => {
    const { deps } = withMapping();
    const recordedSpecimen = { ...specimen, cytologyScreening: { histologyCorrelationCandidates: [{ candidateCaseId: 'H1', recordedActivityRecordId: 'qa-9' }, { candidateCaseId: 'H2' }] } };
    const r = await resolveHistologyCorrelations({ specimen: recordedSpecimen, categories }, deps);
    expect(Object.keys(r)).toEqual(['H2']);
    expect(r.H2).toMatchObject({ outcome: 'unresolvable', cytologyDxLabel: 'Unknown', histologyRank: 1 });
  });

  it('dismissing a candidate writes dismissedAsNotRelevant on that candidate only, with no QA record and no record id, and clears it from the open pool', async () => {
    const { deps, qa, updates } = makeWorkspaceDeps();
    expect(await dismissHistologyCorrelationCandidate({ caseData, specimenId: 'SP1', specimen, candidateCaseId: 'H1' }, deps)).toBe('dismissed');
    expect(qa).toEqual([]);
    const written = updates[0].patch.specimens[0].cytologyScreening.histologyCorrelationCandidates;
    expect(written).toEqual([{ candidateCaseId: 'H1', dismissedAsNotRelevant: true }, { candidateCaseId: 'H2' }]);
    expect(written[0].recordedActivityRecordId).toBeUndefined();
    const after = updates[0].patch.specimens[0];
    expect(openHistologyCorrelationCandidates(after).map(c => c.candidateCaseId)).toEqual(['H2']);
    expect(resolveCytologyHistologyCorrelationPoolMembership(written)).toBe(true);
    // Once the other candidate is dismissed too, the specimen leaves the correlation pool.
    expect(resolveCytologyHistologyCorrelationPoolMembership([written[0], { candidateCaseId: 'H2', dismissedAsNotRelevant: true }] as never)).toBe(false);
  });
});

describe('material, codes, print', () => {
  it('a decant is labelled D1 with its cassette colour and display id', async () => {
    const { deps, updates } = makeWorkspaceDeps();
    const specimens = await addCytologyDecant({ caseData, specimen, decantType: 'cell_block', user }, deps);
    expect(specimens[0].decants[0]).toMatchObject({ id: 'dcnt-SP1-n1', label: 'D1', decantType: 'cell_block', cassetteColorId: 'blue', createdBy: 'Dr U' });
    expect(updates[0].caseId).toBe('C1');
  });
  // Batch 453: through the atomic, versioned material save when it is wired.
  it('with the material save wired, a decant goes through it on the case version and is announced; a refusal throws and writes nothing', async () => {
    const events: unknown[] = [];
    const saveDecantChange = vi.fn(async (_id: string, change: any, v: number) => ({ ok: true as const, specimens: [{ id: 'SP1', decants: [change.decant] }], version: v + 1, change: 'added' as const, event: { parentId: 'SP1', childId: change.decant.id, materialType: 'cell_block', volumeOrWeight: null, timestamp: 't' }, billing: { changed: [], removedMaterialIds: [] } }));
    const { deps, updates } = makeWorkspaceDeps({ saveDecantChange, publishMaterialEvent: (e: unknown) => events.push(e) } as never);
    const versioned = { ...(caseData as any), version: 7 };
    const specimens = await addCytologyDecant({ caseData: versioned, specimen: { ...specimen, decants: [{ id: 'old', label: 'D2' }] }, decantType: 'cell_block', user }, deps);
    expect(saveDecantChange).toHaveBeenCalledWith('C1', expect.objectContaining({ kind: 'add', specimenId: 'SP1', decant: expect.objectContaining({ label: 'D3' }) }), 7);
    expect(specimens[0].decants[0].label).toBe('D3');
    expect(events).toEqual([expect.objectContaining({ type: 'MATERIAL_DECANTED', caseId: 'C1', change: 'added' })]);
    expect(updates).toEqual([]);

    saveDecantChange.mockResolvedValueOnce({ ok: false, error: 'conflict', currentVersion: 9 } as never);
    await expect(updateCytologyDecantStains({ caseData: versioned, specimen, decantId: 'x', stains: [] }, deps)).rejects.toMatchObject({ reason: 'conflict', currentVersion: 9 });
    expect(updates).toEqual([]);
  });
  it('every added and removed code is audited per specimen', async () => {
    const { deps, audit } = makeWorkspaceDeps();
    await applyCytologyCodeChanges({ caseData, codes: [{ system: 'CPT', code: '88142', specimenId: 'SP1' }], user }, deps);
    expect(audit.map(a => a.event)).toContain('CPT code added (Code Manager)');
  });
  it('prints the signed record exactly as signed when there is one', async () => {
    const reportContent = { language: 'en' };
    const { deps } = makeWorkspaceDeps({ getSignOutRecords: async () => ({ ok: true, data: [{ signedAt: '2026-09-01', reportContent }, { signedAt: '2026-09-02', reportContent: { language: 'fr' } }] as never }) });
    await buildCytologyPrintDocument({ caseData, specimen, specimenId: 'SP1', reviews: [], categories, isPathologist: true }, deps);
    expect(deps.renderReportPdf).toHaveBeenCalledWith({ language: 'fr' });
  });
  it('before sign-out with no review, there is nothing to print', async () => {
    const { deps } = makeWorkspaceDeps();
    expect(await buildCytologyPrintDocument({ caseData, specimen, specimenId: 'SP1', reviews: [], categories, isPathologist: true }, deps)).toBeNull();
  });
});

// Batch 450 (PS-152): the pathologist's own findings are a review of their own,
// recorded independently of the screen, and that review can be chosen as the
// Final Diagnosis. Its stored comparison with the primary screen goes with it.
describe('Final Diagnosis from the pathologist\'s own review (PS-152)', () => {
  const primaryScreen = {
    id: 'rv-p', caseId: 'C1', specimenId: 'SP1', role: 'primary_screen', primaryInterpretationId: 'nilm', requiresPathologistReview: false,
    adequacySelections: [], recordedAt: '2026-09-29T10:00:00Z', recordedBy: { userId: 'CT1', userName: 'CT One' },
  } as CytologyReviewRecord;
  const pathologist = { id: 'P1', name: 'Dr P' };

  async function pathologistRecordsOwnReview(deps: ReturnType<typeof makeWorkspaceDeps>['deps']) {
    const saved = await saveCytologyReview({
      form: { kind: 'standard', draft: { ...EMPTY_DRAFT, primaryInterpretationId: 'hsil' } },
      caseData, specimenId: 'SP1', specimen, user: pathologist, isPathologist: true, reviewMode: 'primary_manual',
      editingReviewId: null, reviews: [primaryScreen], resolvedRole: 'pathologist_review', categories, activeScreeningSeconds: 60,
    }, deps);
    const createdInput = (deps.createReview as ReturnType<typeof vi.fn>).mock.calls[0][0];
    return { saved, review: { ...createdInput, id: saved.reviewId, recordedAt: '2026-09-30T18:00:00.000Z' } as CytologyReviewRecord };
  }

  it('the pathologist\'s findings are captured as their own pathologist_review, not copied from the screen', async () => {
    const { deps } = makeWorkspaceDeps();
    const { saved, review } = await pathologistRecordsOwnReview(deps);
    expect(saved).toMatchObject({ outcome: 'saved', created: true });
    expect(review).toMatchObject({ role: 'pathologist_review', primaryInterpretationId: 'hsil', reviewMode: 'pathologist_review', recordedBy: { userId: 'P1', userName: 'Dr P' } });
    expect(review.id).not.toBe(primaryScreen.id);
  });

  it('that review is selectable as the Final Diagnosis, and the stored snapshot carries the pathologist\'s findings', async () => {
    const { deps, updates } = makeWorkspaceDeps();
    const { review } = await pathologistRecordsOwnReview(deps);
    updates.length = 0;
    expect(await selectCytologyFinalDiagnosis({ caseData, specimenId: 'SP1', review, user: pathologist, gate: gate(true) }, deps)).toBe('selected');
    expect(updates[0].patch.specimens[0].cytologyScreening.finalDiagnosis).toMatchObject({
      reviewRecordId: review.id, primaryInterpretationId: 'hsil', selectedBy: 'P1', selectedByName: 'Dr P',
    });
  });

  it('the chosen Final Diagnosis review holds its comparison with the case\'s primary screen: what it added and what it missed', async () => {
    const { deps, updates } = makeWorkspaceDeps();
    const { review } = await pathologistRecordsOwnReview(deps);
    await selectCytologyFinalDiagnosis({ caseData, specimenId: 'SP1', review, user: pathologist, gate: gate(true) }, deps);
    const stored = updates[updates.length - 1].patch.specimens[0].cytologyScreening.finalDiagnosis;
    const chosen = [primaryScreen, review].find(r => r.id === stored.reviewRecordId)!;
    expect(chosen.agreementWithInitial).toMatchObject({
      comparedWithReviewId: 'rv-p', level: 'major_discrepancy', majorSubtype: 'false_negative',
      addedInterpretationIds: ['hsil'], missedInterpretationIds: ['nilm'],
    });
  });
});

// PS-71 (Batch 458): Workspace saves carry the version the screen loaded; a
// stale one is rebuilt from the newer case, never saved over it.
describe('Workspace saves are versioned (PS-71)', () => {
  const stale = { ...(caseData as any), version: 4 } as never;
  const newer = {
    ...(caseData as any), version: 5,
    specimens: [{ ...specimen, cytologyScreening: { ...specimen.cytologyScreening, reviewNotes: ['theirs'], histologyCorrelationCandidates: [{ candidateCaseId: 'H1' }, { candidateCaseId: 'H2' }, { candidateCaseId: 'H3' }] } }],
  } as never;
  const conflictOnce = () => vi.fn(async (_id: string, _p: Record<string, unknown>, v: number) => { if (v !== 5) throw new ConcurrencyConflictError('C1', v, 5); });

  it('dismissing a candidate on a stale copy is re-applied to the newer case: their note and their new candidate survive', async () => {
    const updateCase = conflictOnce();
    const { deps } = makeWorkspaceDeps({ getCase: async () => newer, updateCase });
    expect(await dismissHistologyCorrelationCandidate({ caseData: stale, specimenId: 'SP1', specimen, candidateCaseId: 'H1' }, deps)).toBe('dismissed');
    expect(updateCase.mock.calls.map(c => c[2])).toEqual([4, 5]);
    const saved = (updateCase.mock.calls[1][1].specimens as any[])[0].cytologyScreening;
    expect(saved.reviewNotes).toEqual(['theirs']);
    expect(saved.histologyCorrelationCandidates).toEqual([{ candidateCaseId: 'H1', dismissedAsNotRelevant: true }, { candidateCaseId: 'H2' }, { candidateCaseId: 'H3' }]);
  });

  it('a save that keeps conflicting throws and is never reported as done', async () => {
    const updateCase = vi.fn(async (_id: string, _p: Record<string, unknown>, v: number) => { throw new ConcurrencyConflictError('C1', v, v + 1); });
    const { deps } = makeWorkspaceDeps({ getCase: async () => newer, updateCase });
    await expect(removeCytologyQcFlag({ caseData: stale, specimenId: 'SP1', user }, deps)).rejects.toBeInstanceOf(ConcurrencyConflictError);
    expect(deps.logAudit).not.toHaveBeenCalled();
  });

  it('an up-to-date copy saves once, with its version', async () => {
    const { deps } = makeWorkspaceDeps();
    await applyCytologyCodeChanges({ caseData: stale, codes: [], user }, deps);
    expect(vi.mocked(deps.updateCase).mock.calls.map(c => c[2])).toEqual([4]);
  });
});
