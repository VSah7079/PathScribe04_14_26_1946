// src/services/reports/workupParts.test.ts
import { describe, it, expect } from 'vitest';
import { setWorkupParts, workupParts, partCoveredBy } from './workupParts';
import { applyTemplateProposals } from '../assistPolling/assistMilestoneRules';
import type { Case, SynopticReportInstance } from '@/types/case/Case';

const inst = (id: string, specimenId: string, templateId: string, over: Partial<SynopticReportInstance> = {}): SynopticReportInstance =>
  ({ instanceId: id, specimenId, templateId, templateName: templateId, answers: {}, status: 'draft', createdAt: '', updatedAt: '', ...over });
const parts = ['A', 'B', 'C'];

describe('workup parts (Batch 427)', () => {
  it('combines further parts into a draft workup, and back to independent', () => {
    const reports = [inst('i1', 'A', 'colon')];
    const r = setWorkupParts(reports, parts, 'i1', { mode: 'combined', additionalSpecimenIds: ['B', 'A', 'B'] }, 'now');
    expect(r).toMatchObject({ ok: true, added: ['B'], removed: [] });
    const combined = r.ok ? r.reports[0] : null;
    expect(workupParts(combined!)).toEqual(['A', 'B']);
    expect(partCoveredBy(r.ok ? r.reports : [], 'B', 'colon')?.instanceId).toBe('i1');
    const back = setWorkupParts(r.ok ? r.reports : [], parts, 'i1', { mode: 'independent', additionalSpecimenIds: ['B'] }, 'now');
    expect(back.ok && back.reports[0].additionalSpecimenIds).toBeUndefined();
    expect(back).toMatchObject({ removed: ['B'] });
  });
  it('refuses a released workup, an unknown part, and a part another workup already reports with this protocol', () => {
    expect(setWorkupParts([inst('i1', 'A', 'colon', { status: 'finalized' })], parts, 'i1', { mode: 'combined', additionalSpecimenIds: ['B'] }, 'n')).toMatchObject({ ok: false, reason: 'notDraft' });
    expect(setWorkupParts([inst('i1', 'A', 'colon')], parts, 'i1', { mode: 'combined', additionalSpecimenIds: ['Z'] }, 'n')).toMatchObject({ ok: false, reason: 'unknownPart', specimenId: 'Z' });
    expect(setWorkupParts([inst('i1', 'A', 'colon'), inst('i2', 'B', 'colon')], parts, 'i1', { mode: 'combined', additionalSpecimenIds: ['B'] }, 'n'))
      .toMatchObject({ ok: false, reason: 'alreadyCovered', specimenId: 'B', coveredBy: 'i2' });
    // A different protocol on Part B doesn't block it.
    expect(setWorkupParts([inst('i1', 'A', 'colon'), inst('i2', 'B', 'liver')], parts, 'i1', { mode: 'combined', additionalSpecimenIds: ['B'] }, 'n').ok).toBe(true);
    expect(setWorkupParts([], parts, 'zz', { mode: 'independent', additionalSpecimenIds: [] }, 'n')).toMatchObject({ ok: false, reason: 'notFound' });
  });
  it('the AI does not add a second workup of the same protocol for a part a combined workup covers', () => {
    const caseData = { id: 'S', synopticReports: [inst('i1', 'A', 'colon', { additionalSpecimenIds: ['B'] })], pendingProtocolChanges: [] } as unknown as Case;
    const r = applyTemplateProposals(caseData, [
      { id: 'c1', specimenId: 'B', action: 'add', proposedTemplateId: 'colon' } as any,
      { id: 'c2', specimenId: 'C', action: 'add', proposedTemplateId: 'colon' } as any,
    ], 'gross_complete', 'now');
    expect(r.draftsCreated).toBe(1);
    expect(r.synopticReports.map(x => x.specimenId)).toEqual(['A', 'C']);
  });
});
