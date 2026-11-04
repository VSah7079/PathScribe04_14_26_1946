// Batch 453 (PS-156 follow-up): windows for abnormal Paps signed out before
// Batch 452, so later biopsies are found for them too.
import { describe, expect, it, vi } from 'vitest';
import { backfillCytologyHistologyCorrelationWindows, latestSignOutBySpecimen } from './backfillCytologyHistologyCorrelationWindows';
import { refreshCytologyHistologyCorrelationCandidates } from './cytologyHistologyCorrelationLive';

const DAY = 86_400_000;
const COLLECTED = '2025-06-01T09:00:00.000Z';
const at = (d: number) => new Date(Date.parse(COLLECTED) + d * DAY).toISOString();
const RULE = { windowDays: 180, anchor: 'collection' as const, source: 'enterprise' as const };
const RANKS = new Map<string, number | undefined>([['nilm', 0], ['ascus', 1], ['hsil', 4]]);
const pap = (id: string, interp: string | undefined, screening: object = {}) => ({
  id, patient: { id: 'P1' }, order: { facilityId: 'F1' },
  specimens: [{ id: `${id}-sp`, specimenDictionaryEntryId: 'pap', collectedAt: COLLECTED, cytologyScreening: { ...(interp ? { finalDiagnosis: { reviewRecordId: 'r', primaryInterpretationId: interp } } : {}), ...screening } }],
});
const signOuts = (ids: string[]) => latestSignOutBySpecimen(ids.map(id => ({ specimenId: `${id}-sp`, signedAt: at(15), reviewRecordId: `rev-${id}` })));

describe('backfillCytologyHistologyCorrelationWindows', () => {
  it('fills a window for an old abnormal sign-out, from collection, with the rank and the released review', () => {
    const { cases, changes } = backfillCytologyHistologyCorrelationWindows({ cases: [pap('OLD', 'hsil')], latestSignOutBySpecimenId: signOuts(['OLD']), rankByCategoryId: RANKS, ruleFor: () => RULE });
    expect(changes).toEqual([{ caseId: 'OLD', specimenIds: ['OLD-sp'] }]);
    expect(cases[0].specimens[0].cytologyScreening.histologyCorrelationWindow).toMatchObject({ anchorUsed: 'collection', startsAt: COLLECTED, endsAt: at(180), diagnosticRank: 4, reviewId: 'rev-OLD' });
  });

  it('leaves alone: negative results, unsigned specimens, no final diagnosis, unknown categories and windows already stored', () => {
    const stored = { histologyCorrelationWindow: { startsAt: 'x', endsAt: 'y' } };
    const input = [pap('NEG', 'nilm'), pap('UNSIGNED', 'hsil'), pap('NODX', undefined), pap('UNKNOWN', 'zzz'), pap('HAS', 'hsil', stored)];
    const { cases, changes } = backfillCytologyHistologyCorrelationWindows({ cases: input, latestSignOutBySpecimenId: signOuts(['NEG', 'NODX', 'UNKNOWN', 'HAS']), rankByCategoryId: RANKS, ruleFor: () => RULE });
    expect(changes).toEqual([]);
    expect(cases).toEqual(input);
  });

  it('uses the facility rule today (e.g. a jurisdiction rule from receipt) and the latest sign-out', () => {
    const latest = latestSignOutBySpecimen([
      { specimenId: 'OLD-sp', signedAt: at(10), reviewRecordId: 'first' },
      { specimenId: 'OLD-sp', signedAt: at(40), reviewRecordId: 'amended' },
    ]);
    const ruleFor = vi.fn(() => ({ windowDays: 365, anchor: 'signOut' as const, source: 'jurisdiction' as const }));
    const { cases } = backfillCytologyHistologyCorrelationWindows({ cases: [pap('OLD', 'ascus')], latestSignOutBySpecimenId: latest, rankByCategoryId: RANKS, ruleFor });
    expect(ruleFor).toHaveBeenCalledWith('F1');
    expect(cases[0].specimens[0].cytologyScreening.histologyCorrelationWindow).toMatchObject({ anchorUsed: 'signOut', startsAt: at(40), windowDays: 365, reviewId: 'amended', ruleSource: 'jurisdiction' });
  });
});

describe('the live sweep backfills, then finds later biopsies for old sign-outs', () => {
  it('saves the window and the new candidate together; a case needing only a window is saved too', async () => {
    const biopsy = { id: 'BX', patient: { id: 'P1' }, specimens: [{ id: 'BX-A', specimenDictionaryEntryId: 'bx', collectedAt: at(170) }] };
    const other = { ...pap('ALONE', 'hsil'), patient: { id: 'P2' } };
    const updateCase = vi.fn().mockResolvedValue(undefined);
    const changes = await refreshCytologyHistologyCorrelationCandidates({
      getAllCases: async () => ({ ok: true, data: [pap('OLD', 'hsil'), biopsy, other] }),
      getSpecimenDictionary: async () => ({ ok: true, data: [{ id: 'pap', type: 'Cytology' }, { id: 'bx', type: 'Biopsy' }] }),
      getCase: async () => undefined,
      updateCase, now: () => new Date('2025-12-01T00:00:00Z'),
      getSignOutsForCase: async id => [{ specimenId: `${id}-sp`, signedAt: at(15), reviewRecordId: `rev-${id}` }],
      getCategoryRanks: async () => RANKS,
      getRule: async () => RULE,
    });
    const old = changes.find(c => c.caseId === 'OLD')!;
    expect(old.added).toEqual([{ specimenId: 'OLD-sp', candidateCaseId: 'BX' }]);
    expect(old.windowsBackfilled).toEqual(['OLD-sp']);
    expect(changes.find(c => c.caseId === 'ALONE')).toMatchObject({ added: [], windowsBackfilled: ['ALONE-sp'] });
    expect(updateCase).toHaveBeenCalledTimes(2);
    const saved = updateCase.mock.calls.find(c => c[0] === 'OLD')![1].specimens[0].cytologyScreening;
    expect(saved.histologyCorrelationWindow).toBeDefined();
    expect(saved.histologyCorrelationCandidates).toEqual([{ candidateCaseId: 'BX', detectedAt: '2025-12-01T00:00:00.000Z' }]);
  });
});
