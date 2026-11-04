// src/services/cytology/resolveCytologyHistologyCorrelationCandidates.test.ts
// CYT-QA-04 candidate selection. Batch 452 (PS-156): the window is the one
// stored for the specimen (from collection by default), and a later case
// matches on its specimens' collection or receipt date.
import { describe, it, expect } from 'vitest';
import { otherPatientCasesForCorrelation, resolveCytologyHistologyCorrelationCandidates } from './resolveCytologyHistologyCorrelationCandidates';
import { resolveCorrelationWindow } from './cytologyHistologyCorrelationWindow';

const DAY = 86_400_000;
const at = (base: string, days: number) => new Date(Date.parse(base) + days * DAY).toISOString();
const window180 = (start: string, days = 180) => ({ startsAt: start, endsAt: at(start, days) });
const cyto = (rank: number | undefined, w = window180('2026-01-01T00:00:00.000Z'), id = 'r1') =>
  ({ reviewId: id, caseId: 'c1', specimenId: 'sp1', diagnosticRank: rank, window: w });
const other = (caseId: string, hasNonCytologySpecimen: boolean, ...specimenDates: (string | undefined)[]) => ({ caseId, hasNonCytologySpecimen, specimenDates });

describe('resolveCytologyHistologyCorrelationCandidates (CYT-QA-04, PS-156)', () => {
  it('a negative (rank 0) or unresolved rank produces no candidates', () => {
    expect(resolveCytologyHistologyCorrelationCandidates([cyto(0)], [other('c2', true, '2026-02-01T00:00:00.000Z')])).toEqual([]);
    expect(resolveCytologyHistologyCorrelationCandidates([cyto(undefined)], [other('c2', true, '2026-02-01T00:00:00.000Z')])).toEqual([]);
  });

  it('ASC-US or worse produces a candidate for a later non-cytology case inside the window', () => {
    const result = resolveCytologyHistologyCorrelationCandidates([cyto(1)], [other('c2', true, '2026-02-01T00:00:00.000Z')]);
    expect(result).toEqual([{ cytologyCaseId: 'c1', cytologySpecimenId: 'sp1', cytologyReviewId: 'r1', candidateCaseId: 'c2' }]);
  });

  it('a later case with no non-cytology specimen is never a candidate', () => {
    expect(resolveCytologyHistologyCorrelationCandidates([cyto(4)], [other('c2', false, '2026-02-01T00:00:00.000Z')])).toEqual([]);
  });

  it('outside the window (after it ends, or before it starts) is excluded; both ends are included', () => {
    const start = '2026-01-01T00:00:00.000Z';
    expect(resolveCytologyHistologyCorrelationCandidates([cyto(4)], [other('late', true, at(start, 212))])).toEqual([]);
    expect(resolveCytologyHistologyCorrelationCandidates([cyto(4)], [other('early', true, at(start, -1))])).toEqual([]);
    expect(resolveCytologyHistologyCorrelationCandidates([cyto(4)], [other('first', true, start), other('last', true, at(start, 180))]).map(c => c.candidateCaseId)).toEqual(['first', 'last']);
  });

  it("Pete's example: biopsy 175 days after collection, 157 days after sign-out, IS matched with the collection anchor", () => {
    const collected = '2026-01-01T09:00:00.000Z';
    const signedOut = at(collected, 18);
    const biopsy = at(collected, 175);
    const rule = { windowDays: 180, anchor: 'collection' as const, source: 'enterprise' as const };
    const w = resolveCorrelationWindow({ collectedAt: collected, receivedAt: at(collected, 2) }, signedOut, rule)!;
    expect(resolveCytologyHistologyCorrelationCandidates([cyto(4, w)], [other('bx', true, biopsy)]).map(c => c.candidateCaseId)).toEqual(['bx']);
  });

  it('a biopsy collected inside the window but received after it closes is still matched (collection or receipt date)', () => {
    const start = '2026-01-01T00:00:00.000Z';
    expect(resolveCytologyHistologyCorrelationCandidates([cyto(4)], [other('bx', true, at(start, 179), at(start, 184))])).toHaveLength(1);
  });

  it('a case without usable dates, or no window at all, gives no candidate', () => {
    expect(resolveCytologyHistologyCorrelationCandidates([cyto(4)], [other('bx', true, undefined, 'not a date')])).toEqual([]);
    expect(resolveCytologyHistologyCorrelationCandidates([cyto(4, null as never)], [other('bx', true, '2026-02-01T00:00:00.000Z')])).toEqual([]);
  });

  it('each abnormal specimen produces its own candidates, never against its own case', () => {
    const result = resolveCytologyHistologyCorrelationCandidates(
      [cyto(4, undefined, 'r1'), { ...cyto(2, undefined, 'r2'), specimenId: 'sp2' }],
      [other('c1', true, '2026-02-01T00:00:00.000Z'), other('c2', true, '2026-02-01T00:00:00.000Z')],
    );
    expect(result.map(c => `${c.cytologyReviewId}->${c.candidateCaseId}`)).toEqual(['r1->c2', 'r2->c2']);
  });
});

describe('otherPatientCasesForCorrelation', () => {
  const dict = new Map([['cyto-entry', { type: 'Cytology' }], ['fna-entry', { type: 'FNA' }], ['bx-entry', { type: 'Biopsy' }]]);
  it("lists the patient's other cases with every collection and receipt date, and whether any specimen is non-cytology", () => {
    const cases = [
      { id: 'c1', patient: { id: 'P1' }, specimens: [] },
      { id: 'c2', patient: { id: 'P1' }, specimens: [{ specimenDictionaryEntryId: 'bx-entry', collectedAt: 'A', receivedAt: 'B' }] },
      { id: 'c3', patient: { id: 'P1' }, specimens: [{ specimenDictionaryEntryId: 'cyto-entry' }, { specimenDictionaryEntryId: 'fna-entry' }] },
      { id: 'c4', patient: { id: 'P1' }, specimens: [{ /* no dictionary entry: counts as non-cytology */ }] },
      { id: 'c5', patient: { id: 'P2' }, specimens: [{ specimenDictionaryEntryId: 'bx-entry' }] },
    ];
    expect(otherPatientCasesForCorrelation(cases, 'c1', 'P1', dict)).toEqual([
      { caseId: 'c2', hasNonCytologySpecimen: true, specimenDates: ['A', 'B'] },
      { caseId: 'c3', hasNonCytologySpecimen: false, specimenDates: [undefined, undefined, undefined, undefined] },
      { caseId: 'c4', hasNonCytologySpecimen: true, specimenDates: [undefined, undefined] },
    ]);
  });
});
