// Batch 452 (PS-156): biopsies that arrive after an abnormal Pap was signed
// out are found by the sweep, against the window stored at sign-out.
import { describe, expect, it, vi } from 'vitest';
import { sweepCytologyHistologyCorrelationCandidates } from './sweepCytologyHistologyCorrelationCandidates';
import { refreshCytologyHistologyCorrelationCandidates } from './cytologyHistologyCorrelationLive';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';

const DAY = 86_400_000;
const COLLECTED = '2026-01-01T09:00:00.000Z';
const at = (days: number) => new Date(Date.parse(COLLECTED) + days * DAY).toISOString();
const dict = new Map([['pap', { type: 'Cytology' }], ['cervix-bx', { type: 'Biopsy' }]]);
const window = { anchor: 'collection', anchorUsed: 'collection', startsAt: COLLECTED, endsAt: at(180), windowDays: 180, ruleSource: 'enterprise', diagnosticRank: 4, reviewId: 'rev-1' };

const papCase = (screening: object = {}) => ({
  id: 'PAP-1', patient: { id: 'P1' },
  specimens: [{ id: 'sp-pap', specimenDictionaryEntryId: 'pap', collectedAt: COLLECTED, cytologyScreening: { histologyCorrelationWindow: window, ...screening } }],
});
const biopsy = (id: string, collectedDay: number, patientId = 'P1', entry = 'cervix-bx') =>
  ({ id, patient: { id: patientId }, specimens: [{ id: `${id}-A`, specimenDictionaryEntryId: entry, collectedAt: at(collectedDay), receivedAt: at(collectedDay + 1) }] });

describe('sweepCytologyHistologyCorrelationCandidates', () => {
  it("adds a biopsy accessioned after sign-out (Pete's example: day 175 from collection)", () => {
    const changes = sweepCytologyHistologyCorrelationCandidates([papCase(), biopsy('BX-175', 175)], dict, '2026-07-01T00:00:00.000Z');
    expect(changes).toHaveLength(1);
    expect(changes[0].added).toEqual([{ specimenId: 'sp-pap', candidateCaseId: 'BX-175' }]);
    expect(changes[0].specimens[0].cytologyScreening.histologyCorrelationCandidates).toEqual([{ candidateCaseId: 'BX-175', detectedAt: '2026-07-01T00:00:00.000Z' }]);
  });

  it('keeps existing candidates and what reviewers recorded or dismissed, and adds nothing twice', () => {
    const existing = [{ candidateCaseId: 'BX-30', detectedAt: 'x', recordedActivityRecordId: 'qa-1' }, { candidateCaseId: 'BX-60', detectedAt: 'y', dismissedAsNotRelevant: true }];
    const cases = [papCase({ histologyCorrelationCandidates: existing }), biopsy('BX-30', 30), biopsy('BX-60', 60), biopsy('BX-90', 90)];
    const [change] = sweepCytologyHistologyCorrelationCandidates(cases, dict, 'now');
    expect(change.specimens[0].cytologyScreening.histologyCorrelationCandidates).toEqual([...existing, { candidateCaseId: 'BX-90', detectedAt: 'now' }]);
    // a second sweep finds nothing new
    const again = [{ ...cases[0], specimens: change.specimens }, ...cases.slice(1)];
    expect(sweepCytologyHistologyCorrelationCandidates(again, dict, 'later')).toEqual([]);
  });

  it("ignores cases outside the window, other patients' cases, cytology-only cases, and specimens without a stored window", () => {
    const noWindow = { ...papCase(), id: 'PAP-OLD', specimens: [{ id: 'sp-old', specimenDictionaryEntryId: 'pap', cytologyScreening: {} }] };
    const cases = [papCase(), noWindow, biopsy('BX-LATE', 200), biopsy('BX-OTHER', 20, 'P2'), biopsy('PAP-2', 20, 'P1', 'pap')];
    expect(sweepCytologyHistologyCorrelationCandidates(cases, dict, 'now')).toEqual([]);
  });

  it('the live runner saves only the changed cases and never throws', async () => {
    const updateCase = vi.fn().mockResolvedValue(undefined);
    const changes = await refreshCytologyHistologyCorrelationCandidates({
      getAllCases: async () => ({ ok: true, data: [papCase(), biopsy('BX-100', 100)] }),
      getSpecimenDictionary: async () => ({ ok: true, data: [{ id: 'pap', type: 'Cytology' }, { id: 'cervix-bx', type: 'Biopsy' }] }),
      getCase: async () => undefined,
      updateCase, now: () => new Date('2026-05-01T00:00:00.000Z'),
    });
    expect(changes.map(c => c.caseId)).toEqual(['PAP-1']);
    expect(updateCase).toHaveBeenCalledTimes(1);
    expect(updateCase.mock.calls[0][0]).toBe('PAP-1');
    const failing = await refreshCytologyHistologyCorrelationCandidates({
      getAllCases: async () => { throw new Error('offline'); },
      getSpecimenDictionary: async () => ({ ok: true, data: [] }), getCase: async () => undefined, updateCase, now: () => new Date(),
    });
    expect(failing).toEqual([]);
  });
});

// PS-71 (Batch 458): the sweep saves with the version it read; if the case was
// saved since, the new candidates are re-applied to the newer case.
describe('the live sweep saves with a version (PS-71)', () => {
  it('a candidate dismissed by someone else meanwhile stays dismissed, and the new candidate is added to their version', async () => {
    const swept = { ...papCase(), version: 2 };
    const theirs = JSON.parse(JSON.stringify(swept));
    theirs.version = 3;
    theirs.specimens[0].cytologyScreening.histologyCorrelationCandidates = [{ candidateCaseId: 'BX-OLD', detectedAt: 'x', dismissedAsNotRelevant: true }];
    const updateCase = vi.fn(async (_id: string, _p: Record<string, unknown>, v: number) => { if (v !== 3) throw new ConcurrencyConflictError('PAP-1', v, 3); });
    const changes = await refreshCytologyHistologyCorrelationCandidates({
      getAllCases: async () => ({ ok: true, data: [swept, biopsy('BX-100', 100)] }),
      getSpecimenDictionary: async () => ({ ok: true, data: [{ id: 'pap', type: 'Cytology' }, { id: 'cervix-bx', type: 'Biopsy' }] }),
      getCase: async () => theirs,
      updateCase, now: () => new Date('2026-05-01T00:00:00.000Z'),
    });
    expect(changes.map(c => c.caseId)).toEqual(['PAP-1']);
    expect(updateCase.mock.calls.map(c => c[2])).toEqual([2, 3]);
    const saved = (updateCase.mock.calls[1][1].specimens as any[])[0].cytologyScreening.histologyCorrelationCandidates;
    expect(saved).toEqual([
      { candidateCaseId: 'BX-OLD', detectedAt: 'x', dismissedAsNotRelevant: true },
      { candidateCaseId: 'BX-100', detectedAt: '2026-05-01T00:00:00.000Z' },
    ]);
  });

  it('a case that keeps conflicting is not reported as saved, and the sweep does not throw', async () => {
    const updateCase = vi.fn(async (_id: string, _p: Record<string, unknown>, v: number) => { throw new ConcurrencyConflictError('PAP-1', v, v + 1); });
    const changes = await refreshCytologyHistologyCorrelationCandidates({
      getAllCases: async () => ({ ok: true, data: [papCase(), biopsy('BX-100', 100)] }),
      getSpecimenDictionary: async () => ({ ok: true, data: [{ id: 'pap', type: 'Cytology' }, { id: 'cervix-bx', type: 'Biopsy' }] }),
      getCase: async () => papCase(),
      updateCase, now: () => new Date('2026-05-01T00:00:00.000Z'),
    });
    expect(changes).toEqual([]);
  });
});
