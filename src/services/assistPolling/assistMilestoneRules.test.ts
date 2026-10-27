// src/services/assistPolling/assistMilestoneRules.test.ts — PS-87 rules.
import { describe, it, expect } from 'vitest';
import type { Case, SynopticReportInstance, ProtocolChange } from '@/types/case/Case';
import {
  mapLisStatusToMilestone, findCrosswalkProblems, textFingerprint, planMilestoneWork, lisTextPatch,
  caseForAiFill, isUntouchedAiDraft, applyTemplateProposals, mergeSuggestionsIntoInstance, resolveReevaluation,
  summarizeRun, DEFAULT_ASSIST_POLLING_SETTINGS,
} from './assistMilestoneRules';
import type { LisCaseSnapshot } from './types';

const NOW = '2026-09-24T15:00:00.000Z';
const crosswalk = DEFAULT_ASSIST_POLLING_SETTINGS.statusCrosswalk;
const snap = (over: Partial<LisCaseSnapshot> = {}): LisCaseSnapshot =>
  ({ accession: 'S1', lisStatus: 'GROSSED', updatedAt: '2026-09-24T10:00:00Z', grossText: 'gross', ...over });
const assistCase = { reportingMode: 'assist', status: 'in-progress' } as Pick<Case, 'reportingMode' | 'status'>;
const on = { gross: true, microscopic: true };

const inst = (over: Partial<SynopticReportInstance> = {}): SynopticReportInstance => ({
  instanceId: 'i1', specimenId: 'sp1', templateId: 'colon', templateName: 'Colon', answers: {}, status: 'draft',
  createdAt: NOW, updatedAt: NOW, ...over,
});
const change = (over: Partial<ProtocolChange>): ProtocolChange =>
  ({ id: 'c1', specimenId: 'sp1', specimenLabel: 'A', specimenDesc: 'd', reason: 'r', confidence: 90, ...over } as ProtocolChange);

describe('mapLisStatusToMilestone / findCrosswalkProblems', () => {
  it('matches ignoring case and surrounding spaces', () => {
    expect(mapLisStatusToMilestone(' grossed ', crosswalk)).toBe('gross_complete');
    expect(mapLisStatusToMilestone('DX_COMPLETE', crosswalk)).toBe('micro_diagnosis_complete');
    expect(mapLisStatusToMilestone('RECEIVED', crosswalk)).toBeUndefined();
  });
  it('flags blank and duplicate statuses', () => {
    expect(findCrosswalkProblems([
      { lisStatus: 'A', milestone: 'gross_complete' },
      { lisStatus: ' ', milestone: 'gross_complete' },
      { lisStatus: 'a', milestone: 'micro_diagnosis_complete' },
    ])).toEqual({ blank: [1], duplicates: [2] });
  });
});

describe('textFingerprint', () => {
  it('is stable and changes with the text', () => {
    expect(textFingerprint('abc')).toBe(textFingerprint('abc'));
    expect(textFingerprint('abc')).not.toBe(textFingerprint('abd'));
  });
});

describe('planMilestoneWork', () => {
  const plan = (over: Partial<Parameters<typeof planMilestoneWork>[0]>) =>
    planMilestoneWork({ snapshot: snap(), milestone: 'gross_complete', caseData: assistCase, record: undefined, aiEnabled: on, ...over });

  it('skips with a reason', () => {
    expect(plan({ milestone: undefined })).toEqual({ kind: 'skip', outcome: 'no_milestone' });
    expect(plan({ caseData: null })).toEqual({ kind: 'skip', outcome: 'case_not_found' });
    expect(plan({ caseData: { reportingMode: 'orchestrator', status: 'draft' } as never })).toEqual({ kind: 'skip', outcome: 'not_assist_case' });
    expect(plan({ caseData: { reportingMode: 'assist', status: 'finalized' } as never })).toEqual({ kind: 'skip', outcome: 'case_signed_out' });
  });

  it('drafts Gross from the gross only, and Micro/Diagnosis in full', () => {
    expect(plan({})).toMatchObject({ kind: 'draft', fill: 'gross' });
    expect(plan({ milestone: 'micro_diagnosis_complete' })).toMatchObject({ kind: 'draft', fill: 'full' });
  });

  it('skips a milestone already drafted from the same text, but redrafts amended text', () => {
    const first = plan({});
    if (first.kind !== 'draft') throw new Error('setup');
    expect(plan({ record: { gross_complete: { processedAt: NOW, textHash: first.textHash } } })).toEqual({ kind: 'skip', outcome: 'already_processed' });
    expect(plan({ snapshot: snap({ grossText: 'amended' }), record: { gross_complete: { processedAt: NOW, textHash: first.textHash } } }).kind).toBe('draft');
  });

  it('only syncs text when the AI toggle is off or Micro was already drafted', () => {
    expect(plan({ aiEnabled: { gross: false, microscopic: true } })).toMatchObject({ kind: 'text_only', outcome: 'text_only_ai_disabled' });
    expect(plan({ milestone: 'micro_diagnosis_complete', aiEnabled: { gross: true, microscopic: false } })).toMatchObject({ kind: 'text_only', outcome: 'text_only_ai_disabled' });
    expect(plan({ record: { micro_diagnosis_complete: { processedAt: NOW, textHash: 'x' } } })).toMatchObject({ kind: 'text_only', outcome: 'text_only_superseded' });
  });
});

describe('lisTextPatch / caseForAiFill', () => {
  const c = { id: 'S1', diagnostic: { grossDescription: 'old', microscopicDescription: 'm', ancillaryStudies: 'anc', primaryDiagnosis: 'dx' } } as Case;

  it('writes only the fields the LIS sent', () => {
    expect(lisTextPatch(c, snap({ grossText: 'new' })).diagnostic).toMatchObject({ grossDescription: 'new', microscopicDescription: 'm', primaryDiagnosis: 'dx' });
  });

  it('Batch 426: keeps the LIS order numbers on the case\'s order', () => {
    const withOrder = { ...c, order: { priority: 'Routine' } } as unknown as Case;
    expect(lisTextPatch(withOrder, snap({ placerOrderNumber: 'ORD-1', fillerOrderNumber: 'LIS-9' })).order).toEqual({ priority: 'Routine', placerOrderNumber: 'ORD-1', fillerOrderNumber: 'LIS-9' });
    expect(lisTextPatch(withOrder, snap({ grossText: 'g' })).order).toBeUndefined();
  });

  it('hides microscopic and ancillary text from a gross-stage fill', () => {
    expect(caseForAiFill(c, 'gross').diagnostic).toMatchObject({ grossDescription: 'old', microscopicDescription: '', ancillaryStudies: '' });
  });

  it('appends the diagnosis to the microscopic text for a full fill', () => {
    expect(caseForAiFill(c, 'full').diagnostic?.microscopicDescription).toBe('m\n\nDIAGNOSIS: dx');
  });
});

describe('isUntouchedAiDraft', () => {
  const src = { milestone: 'gross_complete' as const, generatedAt: NOW };
  it('is true only for an AI draft whose answers are still the AI values', () => {
    const sug = { size: { value: '5.8 cm', confidence: 90, source: 'g', verification: 'unverified' as const } };
    expect(isUntouchedAiDraft(inst({ aiDraftSource: src, answers: { size: '5.8 cm' }, aiSuggestions: sug }))).toBe(true);
    expect(isUntouchedAiDraft(inst({ aiDraftSource: src, answers: { size: '6 cm' }, aiSuggestions: sug }))).toBe(false);
    expect(isUntouchedAiDraft(inst({ aiDraftSource: src, answers: { size: '5.8 cm' }, aiSuggestions: { size: { ...sug.size, verification: 'verified' } } }))).toBe(false);
    expect(isUntouchedAiDraft(inst({ answers: {} }))).toBe(false); // not an AI draft
  });
});

describe('applyTemplateProposals', () => {
  const base = { id: 'S1', synopticReports: [] } as unknown as Case;

  it('adds a draft instance for an "add" proposal, once', () => {
    const res = applyTemplateProposals(base, [change({ action: 'add', proposedTemplateId: 'colon', proposedTemplateName: 'Colon' })], 'gross_complete', NOW);
    expect(res.draftsCreated).toBe(1);
    expect(res.synopticReports[0]).toMatchObject({ specimenId: 'sp1', templateId: 'colon', status: 'draft', answers: {}, aiDraftSource: { milestone: 'gross_complete', reason: 'r', confidence: 90 } });
    const again = applyTemplateProposals({ ...base, synopticReports: res.synopticReports } as Case, [change({ action: 'add', proposedTemplateId: 'colon' })], 'gross_complete', NOW);
    expect(again.draftsCreated).toBe(0);
  });

  it('applies a replace to an untouched AI draft directly', () => {
    const draft = inst({ aiDraftSource: { milestone: 'gross_complete', generatedAt: NOW } });
    const res = applyTemplateProposals({ ...base, synopticReports: [draft] } as Case,
      [change({ action: 'replace', currentInstanceId: 'i1', currentTemplateId: 'colon', proposedTemplateId: 'colon_resection' })], 'micro_diagnosis_complete', NOW);
    expect(res.synopticReports.map(r => r.templateId)).toEqual(['colon_resection']);
    expect(res.pendingReviewChanges).toBe(0);
  });

  it('leaves a change to a pathologist\'s own work for review', () => {
    const own = inst({ answers: { x: 'typed' } });
    const res = applyTemplateProposals({ ...base, synopticReports: [own] } as Case,
      [change({ action: 'remove', currentInstanceId: 'i1' })], 'micro_diagnosis_complete', NOW);
    expect(res.synopticReports).toEqual([own]);
    expect(res.pendingProtocolChanges).toEqual([expect.objectContaining({ id: 'c1', reviewStatus: 'pending' })]);
    expect(res.pendingReviewChanges).toBe(1);
  });
});

describe('mergeSuggestionsIntoInstance', () => {
  const s = (value: string) => ({ value, confidence: 80, source: 'x', verification: 'unverified' as const });

  it('fills empty answers and refreshes the AI\'s own unverified ones, keeping human input', () => {
    const before = inst({
      answers: { a: '', b: 'old-ai', c: 'typed' },
      aiSuggestions: { b: s('old-ai'), c: s('ai-c') },
    });
    const { instance, fieldsSuggested, fieldsToReview } = mergeSuggestionsIntoInstance(before, { a: s('A'), b: s('B'), c: s('C') }, NOW);
    expect(instance.answers).toEqual({ a: 'A', b: 'B', c: 'typed' });
    // Batch 426: the typed field keeps its earlier suggestion; the new one waits for "keep or update?".
    expect(instance.aiSuggestions?.c.value).toBe('ai-c');
    expect(instance.reevaluations).toEqual({ c: { value: 'C', confidence: 80, source: 'x', suggestedAt: NOW } });
    expect(fieldsSuggested).toBe(3);
    expect(fieldsToReview).toBe(1);
  });

  it('Batch 426: a confirmed field stays confirmed; the same value again asks nothing; a later run never overwrites it', () => {
    const confirmed = { ...s('pT2'), verification: 'verified' as const };
    const before = inst({ answers: { t: 'pT2' }, aiSuggestions: { t: confirmed } });
    const again = mergeSuggestionsIntoInstance(before, { t: s('pT2') }, NOW).instance;
    expect(again.aiSuggestions?.t.verification).toBe('verified');
    expect(again.reevaluations).toBeUndefined();
    const changed = mergeSuggestionsIntoInstance(again, { t: s('pT3') }, NOW).instance;
    expect(changed.answers.t).toBe('pT2');
    expect(changed.reevaluations?.t.value).toBe('pT3');
  });
});

describe('resolveReevaluation (Batch 426)', () => {
  const pending = { value: 'pT3', confidence: 90, source: 'Micro: "invades subserosa"', suggestedAt: NOW };
  const base = inst({ answers: { t: 'pT2', u: 'x' }, aiSuggestions: { t: { value: 'pT2', confidence: 70, source: 's', verification: 'verified' } }, reevaluations: { t: pending, u: { ...pending, value: 'y' } } });
  it('keep: the pathologist\'s value stays, only that question goes', () => {
    const r = resolveReevaluation(base, 't', 'keep');
    expect(r.answers.t).toBe('pT2');
    expect(Object.keys(r.reevaluations ?? {})).toEqual(['u']);
  });
  it('accept: the new value becomes the answer, confirmed', () => {
    const r = resolveReevaluation(resolveReevaluation(base, 'u', 'keep'), 't', 'accept');
    expect(r.answers.t).toBe('pT3');
    expect(r.aiSuggestions?.t).toMatchObject({ value: 'pT3', verification: 'verified' });
    expect(r.reevaluations).toBeUndefined();
  });
  it('nothing pending: unchanged', () => {
    expect(resolveReevaluation(base, 'zz', 'accept')).toBe(base);
  });
});

describe('summarizeRun', () => {
  it('counts outcomes', () => {
    const item = (outcome: string) => ({ outcome }) as never;
    expect(summarizeRun({ items: [item('draft_prepared'), item('text_only_ai_disabled'), item('failed'), item('no_milestone')] }))
      .toEqual({ drafted: 1, textOnly: 1, failed: 1, skipped: 1 });
  });
});

describe('a polled fill is always a draft (Batch 682)', () => {
  it('stores the suggestion as unverified even if the generator said otherwise', () => {
    const inst = { instanceId: 'i1', templateId: 't', answers: {}, aiSuggestions: {} } as never;
    const sug = { value: 'x', confidence: 90, source: 'Gross description', verification: 'verified' } as never;
    const { instance } = mergeSuggestionsIntoInstance(inst, { f1: sug }, '2026-10-26T00:00:00Z');
    expect((instance.aiSuggestions as Record<string, { verification: string }>).f1.verification).toBe('unverified');
    expect((instance.answers as Record<string, unknown>).f1).toBe('x');
  });
});
