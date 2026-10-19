import { describe, it, expect } from 'vitest';
import type { Case } from '@/types/case/Case';
import {
  amendedRelatedCases, buildRelatedSnapshot, findRelatedCandidates, MAX_RELATED_CASES,
  relatedCaseTextLines, toggleRelatedSelection,
} from './relatedCaseRules';
import type { RelatedCaseAttachment, RelatedCaseSnapshot } from './relatedCaseTypes';

const mk = (id: string, over: Record<string, unknown> = {}): Case => ({
  id, status: 'finalized', version: 2, releasedAt: `2026-0${(Number(id.replace(/\D/g, '')) % 9) + 1}-10T10:00:00Z`,
  accession: { fullAccession: `S26-${id}` }, patient: { id: 'P1' },
  specimens: [{ description: 'A: Skin' }],
  diagnostic: { primaryDiagnosis: 'Nevus', secondaryDiagnoses: ['Seborrheic keratosis'], finalizedBy: 'Dr. Lee' },
  order: { requestingProvider: 'Dr. Ng', facilityName: 'North Clinic', copyToProviders: ['Dr. Oh'] },
  ...over,
}) as unknown as Case;

const snap = (id: string, releasedAt: string, version = 2): RelatedCaseSnapshot => ({
  sourceCaseId: id, accession: `S26-${id}`, releasedAt, sourceVersion: version, specimens: [], diagnosis: 'Dx', copyToPhysicians: [],
});

describe('buildRelatedSnapshot', () => {
  it('copies the released text, the physicians and the intraoperative diagnosis', () => {
    const s = buildRelatedSnapshot(mk('1'), 'A: Benign');
    expect(s).toMatchObject({
      accession: 'S26-1', sourceVersion: 2, specimens: ['A: Skin'], diagnosis: 'Nevus\nSeborrheic keratosis',
      intraoperativeDiagnosis: 'A: Benign', signedBy: 'Dr. Lee', orderingPhysician: 'Dr. Ng', copyToPhysicians: ['Dr. Oh'], client: 'North Clinic',
    });
  });
  it('leaves the intraoperative line out when there is none', () => {
    expect('intraoperativeDiagnosis' in buildRelatedSnapshot(mk('1'), null)).toBe(false);
  });
});

describe('findRelatedCandidates', () => {
  it('offers only this patient\'s other released cases, oldest first', () => {
    const cases = [
      mk('3', { releasedAt: '2026-03-01T00:00:00Z' }),
      mk('1', { releasedAt: '2026-01-01T00:00:00Z' }),
      mk('cur'),
      mk('open', { status: 'in-progress', releasedAt: undefined }),
      mk('other', { patient: { id: 'P2' } }),
    ];
    const out = findRelatedCandidates({ visibleCases: cases, patientIds: ['P1'], currentCaseId: 'cur' });
    expect(out.map(o => o.sourceCaseId)).toEqual(['1', '3']);
  });
  it('includes cases of a linked identity of the same person', () => {
    const out = findRelatedCandidates({ visibleCases: [mk('1', { patient: { id: 'P9' } })], patientIds: ['P1', 'P9'] });
    expect(out).toHaveLength(1);
  });
  it('carries the intraoperative text of each case', () => {
    const out = findRelatedCandidates({ visibleCases: [mk('1')], patientIds: ['P1'], intraopByCaseId: new Map([['1', 'A: Malignant']]) });
    expect(out[0].intraoperativeDiagnosis).toBe('A: Malignant');
  });
});

describe('toggleRelatedSelection', () => {
  it('ticks and unticks, keeping date order', () => {
    const a = snap('a', '2026-01-01'); const b = snap('b', '2026-02-01');
    let chosen = toggleRelatedSelection([], b);
    chosen = toggleRelatedSelection(chosen, a);
    expect(chosen.map(c => c.sourceCaseId)).toEqual(['a', 'b']);
    expect(toggleRelatedSelection(chosen, a).map(c => c.sourceCaseId)).toEqual(['b']);
  });
  it('stops at the limit', () => {
    let chosen: RelatedCaseSnapshot[] = [];
    for (let i = 0; i < MAX_RELATED_CASES + 3; i++) chosen = toggleRelatedSelection(chosen, snap(`c${i}`, `2026-01-${String(i + 1).padStart(2, '0')}`));
    expect(chosen).toHaveLength(MAX_RELATED_CASES);
  });
});

describe('amendedRelatedCases', () => {
  const attachment = (frozenAt?: string): RelatedCaseAttachment => ({
    caseId: 'cur', cases: [snap('a', '2026-01-01', 2), snap('b', '2026-02-01', 2)], updatedAt: 'x', updatedBy: 'u', ...(frozenAt ? { frozenAt } : {}),
  });
  it('flags a source whose record moved past the copy, and only after sign-out', () => {
    const versions: Record<string, number> = { a: 3, b: 2 };
    expect(amendedRelatedCases(attachment('t'), id => versions[id]).map(x => x.sourceCaseId)).toEqual(['a']);
    expect(amendedRelatedCases(attachment(), id => versions[id])).toEqual([]);
    expect(amendedRelatedCases(null, id => versions[id])).toEqual([]);
  });
  it('does not flag a case the viewer can no longer see', () => {
    expect(amendedRelatedCases(attachment('t'), () => undefined)).toEqual([]);
  });
});

describe('relatedCaseTextLines', () => {
  const labels = { title: 'Related cases', notice: 'Notice', released: 'Released', intraop: 'Intraop', ordering: 'Ordering', copyTo: 'Copy to', client: 'Client' };
  it('is empty with nothing attached, and lists each case when attached', () => {
    expect(relatedCaseTextLines([], labels)).toEqual([]);
    const lines = relatedCaseTextLines([{ ...snap('a', '2026-01-05T00:00:00Z'), orderingPhysician: 'Dr. Ng', copyToPhysicians: ['Dr. Oh'] }], labels);
    expect(lines).toContain('S26-a — Released 2026-01-05');
    expect(lines).toContain('  Ordering: Dr. Ng');
    expect(lines).toContain('  Copy to: Dr. Oh');
  });
});
