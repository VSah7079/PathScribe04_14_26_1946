// Batch 410 (PS-359): the Cytology Workspace's other actions, moved out of the
// page, each with its permission checked first.
import { describe, it, expect, vi } from 'vitest';
import {
  addCytologyDecant, applyCytologyCodeChanges, buildCytologyPrintDocument, completeCytologyRetrospectiveReview,
  dismissHistologyCorrelationCandidate, recordCytologyHistologyCorrelation, removeCytologyQcFlag, resolveHistologyCorrelations,
  selectCytologyFinalDiagnosis,
} from './cytologyCaseActions';
import { makeWorkspaceDeps } from './cytologyWorkspaceTestDeps';
import type { CytologyGateContext } from './cytologyWorkspaceView';

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
});

describe('material, codes, print', () => {
  it('a decant is labelled D1 with its cassette colour and display id', async () => {
    const { deps, updates } = makeWorkspaceDeps();
    const specimens = await addCytologyDecant({ caseData, specimen, decantType: 'cell_block', user }, deps);
    expect(specimens[0].decants[0]).toMatchObject({ id: 'dcnt-SP1-n1', label: 'D1', decantType: 'cell_block', cassetteColorId: 'blue', createdBy: 'Dr U' });
    expect(updates[0].caseId).toBe('C1');
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
