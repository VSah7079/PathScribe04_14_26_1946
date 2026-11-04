// src/services/signoutGates/signOutReviewGates.test.ts
// Batch 649: the review checks shared by Assist Finalize and Orchestration Sign Out Case.
import { describe, it, expect, vi } from 'vitest';
import type { Case } from '@/types/case/Case';
import {
  runSignOutReviewGates, findSynopticSignOutFieldProblems, synopticFieldProblemsFor, findMicroscopicBlockingSpecimens,
  type SignOutReviewGateDeps,
} from './signOutReviewGates';

const caseOf = (o: Partial<Case> = {}) => ({ id: 'C1', status: 'in-progress', specimens: [], synopticReports: [], ...o }) as unknown as Case;

const passing = (o: Partial<SignOutReviewGateDeps> = {}): SignOutReviewGateDeps => ({
  staleOrganMapFigures: vi.fn(async () => []), mohsBlockGaps: vi.fn(async () => []), derivedMarginConflicts: vi.fn(async () => []),
  synopticEntryChecks: vi.fn(async () => ({ blocking: [], warnings: [] })), invasiveMarginGaps: vi.fn(async () => []), molecularDifferences: vi.fn(async () => []),
  microscopicBlocking: vi.fn(async () => []), criticalAcknowledged: false, detectFindings: vi.fn(async () => []),
  synopticFieldProblems: vi.fn(async () => ({ missing: [], unverifiedAi: [] })),
  ...o,
});

const field = { sectionId: 's1', sectionTitle: 'Tumor', fieldId: 'f1', fieldLabel: 'Grade' };

describe('runSignOutReviewGates', () => {
  it('passes a clean case', async () => {
    expect(await runSignOutReviewGates(caseOf(), passing())).toEqual({ ok: true });
  });

  it('a case in its recall window stops first', async () => {
    const deps = passing();
    expect(await runSignOutReviewGates(caseOf({ status: 'pending-release' } as Partial<Case>), deps)).toEqual({ ok: false, stop: { gate: 'pendingRelease' } });
    expect(deps.staleOrganMapFigures).not.toHaveBeenCalled();
  });

  it('an active case hold stops before every other check, with its note', async () => {
    const deps = passing({ microscopicBlocking: vi.fn(async () => [{ specimenId: 'SP1', specimenLabel: 'A', reasonKey: 'k' }]) });
    const r = await runSignOutReviewGates(caseOf({ caseHolds: [{ active: true, note: 'Await recut' }] } as Partial<Case>), deps);
    expect(r).toEqual({ ok: false, stop: { gate: 'caseHold', note: 'Await recut' } });
    expect(deps.microscopicBlocking).not.toHaveBeenCalled();
  });

  it('a released (inactive) hold does not stop', async () => {
    expect((await runSignOutReviewGates(caseOf({ caseHolds: [{ active: false, note: 'old' }] } as Partial<Case>), passing())).ok).toBe(true);
  });

  it('microscopic documentation stops with the blocking specimens', async () => {
    const blocking = [{ specimenId: 'SP1', specimenLabel: 'A', reasonKey: 'evaluateMicroscopicFinalizeGate.unsavedDraft' }];
    expect(await runSignOutReviewGates(caseOf(), passing({ microscopicBlocking: vi.fn(async () => blocking) }))).toEqual({ ok: false, stop: { gate: 'microscopic', blocking } });
  });

  it('a Critical or Malignant finding stops (and is remembered); an Abnormal one alone does not', async () => {
    const critical = { term: 'carcinoma', severity: 'Malignant', sourceField: 'microscopic', sourceQuote: 'x' } as never;
    const abnormal = { term: 'atypia', severity: 'Abnormal', sourceField: 'microscopic', sourceQuote: 'y' } as never;
    const remember = vi.fn();
    const r = await runSignOutReviewGates(caseOf(), passing({ detectFindings: vi.fn(async () => [critical, abnormal]), rememberCriticalFindings: remember }));
    expect(r).toEqual({ ok: false, stop: { gate: 'criticalFindings', findings: [critical] } });
    expect(remember).toHaveBeenCalledWith([critical]);
    expect((await runSignOutReviewGates(caseOf(), passing({ detectFindings: vi.fn(async () => [abnormal]) }))).ok).toBe(true);
  });

  it('findings already acknowledged this session are not detected again', async () => {
    const detect = vi.fn(async () => []);
    await runSignOutReviewGates(caseOf(), passing({ criticalAcknowledged: true, detectFindings: detect }));
    expect(detect).not.toHaveBeenCalled();
  });

  it('missing required fields stop, then a required field holding an unverified AI answer', async () => {
    expect(await runSignOutReviewGates(caseOf(), passing({ synopticFieldProblems: vi.fn(async () => ({ missing: [field], unverifiedAi: [field] })) })))
      .toEqual({ ok: false, stop: { gate: 'requiredFields', missing: [field] } });
    expect(await runSignOutReviewGates(caseOf(), passing({ synopticFieldProblems: vi.fn(async () => ({ missing: [], unverifiedAi: [field] })) })))
      .toEqual({ ok: false, stop: { gate: 'unverifiedAi', fields: [field] } });
  });

  it('report content blocks stop; a declined warning stops; with no way to ask, a warning passes', async () => {
    expect((await runSignOutReviewGates(caseOf(), passing({ staleOrganMapFigures: vi.fn(async () => ['m']) }))).ok).toBe(false);
    const block = { kind: 'exceeds', instanceId: 'I1', fieldId: 'f', fieldLabel: 'Nodes' } as never;
    expect(await runSignOutReviewGates(caseOf(), passing({ synopticEntryChecks: vi.fn(async () => ({ blocking: [block], warnings: [] })) })))
      .toEqual({ ok: false, stop: { gate: 'entryCount', block } });
    const gaps = vi.fn(async () => [{ instanceId: 'I1', templateName: 'T', mapType: 'breast', margins: ['deep'] }] as never);
    const declined = { entryTotals: vi.fn(async () => true), invasiveMargins: vi.fn(async () => false), molecular: vi.fn(async () => true) };
    expect(await runSignOutReviewGates(caseOf(), passing({ invasiveMarginGaps: gaps, confirm: declined }))).toEqual({ ok: false, stop: { gate: 'warningDeclined' } });
    expect((await runSignOutReviewGates(caseOf(), passing({ invasiveMarginGaps: gaps }))).ok).toBe(true);
  });
});

describe('synopticFieldProblemsFor / findSynopticSignOutFieldProblems', () => {
  const sections = [{ id: 's1', title: 'Tumor', fields: [
    { id: 'grade', label: 'Grade', required: true, type: 'text' },
    { id: 'size', label: 'Size', required: true, type: 'text' },
    { id: 'note', label: 'Note', type: 'text' },
  ] }];
  const loadTemplate = vi.fn(async () => ({ template: { sections } }));

  it('a required field left blank, and a required shown field with an unverified AI answer; a non-required one is not held', () => {
    const r = synopticFieldProblemsFor({ instanceId: 'I1', answers: { grade: 'G2' }, aiSuggestions: { grade: { verification: 'unverified' }, note: { verification: 'unverified' } } }, sections);
    expect(r.missing.map(m => m.fieldId)).toEqual(['size']);
    expect(r.unverifiedAi.map(m => m.fieldId)).toEqual(['grade']);
  });

  it("'case' scope checks every report not yet finalized; the stored suggestions (the panel's saves) win", async () => {
    const c = { synopticReports: [
      { instanceId: 'I1', templateId: 'T', templateName: 'T', answers: { grade: 'G1', size: '2' }, status: 'draft', aiSuggestions: { grade: { verification: 'unverified' } } },
      { instanceId: 'I2', templateId: 'T', templateName: 'T', answers: {}, status: 'finalized' },
    ] } as unknown as Case;
    const verified = await findSynopticSignOutFieldProblems(c, { scope: 'case', loadTemplate, storedSuggestions: { I1: { grade: { verification: 'verified' } } } });
    expect(verified).toEqual({ missing: [], unverifiedAi: [] });
    const stale = await findSynopticSignOutFieldProblems(c, { scope: 'case', loadTemplate });
    expect(stale.unverifiedAi.map(m => [m.instanceId, m.fieldId])).toEqual([['I1', 'grade']]);
  });

  it("'active' scope uses the open panel when there is one, else the stored open report", async () => {
    const c = { synopticReports: [{ instanceId: 'I1', templateId: 'T', templateName: 'T', answers: {}, status: 'draft' }] } as unknown as Case;
    const live = { instanceId: 'I1', missing: [field], unverifiedAi: [] };
    expect(await findSynopticSignOutFieldProblems(c, { scope: 'active', activeInstanceId: 'I1', live, loadTemplate })).toEqual({ missing: [field], unverifiedAi: [] });
    const stored = await findSynopticSignOutFieldProblems(c, { scope: 'active', activeInstanceId: 'I1', loadTemplate });
    expect(stored.missing.map(m => m.fieldId)).toEqual(['grade', 'size']);
  });

  it('a template that cannot be loaded stops sign-out rather than passing unchecked', async () => {
    const c = { synopticReports: [{ instanceId: 'I1', templateId: 'T', templateName: 'Breast', answers: {}, status: 'draft' }] } as unknown as Case;
    const r = await findSynopticSignOutFieldProblems(c, { scope: 'case', loadTemplate: vi.fn(async () => { throw new Error('down'); }) });
    expect(r.missing).toHaveLength(1);
    expect(r.missing[0].fieldLabel).toBe('Breast');
  });
});

describe('findMicroscopicBlockingSpecimens', () => {
  it('an unsaved draft blocks; saved text passes; nothing documenting a specimen blocks', async () => {
    const c = caseOf({
      specimens: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }, { id: 'C', label: 'C' }],
      microscopicReports: [{ specimenId: 'A', status: 'draft', text: 'x' }, { specimenId: 'B', status: 'saved', text: 'Benign.' }],
    } as unknown as Partial<Case>);
    const r = await findMicroscopicBlockingSpecimens(c, vi.fn(async () => ({ template: { sections: [] } })));
    expect(r.map(b => b.specimenId)).toEqual(['A', 'C']);
  });
});
