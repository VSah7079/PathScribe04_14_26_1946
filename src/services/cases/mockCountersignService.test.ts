// src/services/cases/mockCountersignService.test.ts
// Batch 483 (PS-359 tracker follow-up — "Cytology: case-level countersign"):
// no test file existed for this service at all. Covers the existing
// single-release-per-case behavior (surgical pathology, autopsy — neither
// ever sets specimenId) and the new per-specimen scoping cytology needs
// (CountersignRecord.specimenId; ICountersignService.release's own doc
// comment has the full reasoning for why this was a real, disclosed bug).
import { describe, it, expect, beforeEach } from 'vitest';
import { mockCountersignService } from './mockCountersignService';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

const release = (over: Partial<Parameters<typeof mockCountersignService.release>[0]> = {}) =>
  mockCountersignService.release({
    caseId: 'C1', residentId: 'R1', residentName: 'Dr R', releasedAnswersSnapshot: {}, ...over,
  });

describe('mockCountersignService — a single case (surgical pathology, autopsy: never set specimenId)', () => {
  it('re-triggering the release before the attending acts replaces the pending record, not duplicates it', async () => {
    const first = await release({ releasedAnswersSnapshot: { i1: { f: 'v1' } } });
    expect(first.ok).toBe(true);
    const second = await release({ releasedAnswersSnapshot: { i1: { f: 'v2' } } });
    expect(second.ok).toBe(true);
    const all = await mockCountersignService.getAll();
    expect(all.ok && all.data.filter(r => r.caseId === 'C1' && r.status === 'pending')).toHaveLength(1);
    const forCase = await mockCountersignService.getForCase('C1');
    expect(forCase.ok && forCase.data?.releasedAnswersSnapshot).toEqual({ i1: { f: 'v2' } });
  });

  it('countersign() completes the one pending record for the case', async () => {
    await release();
    const result = await mockCountersignService.countersign({ caseId: 'C1', attendingId: 'A1', attendingName: 'Dr A', currentAnswersByInstance: {} });
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.status).toBe('countersigned');
    expect(await mockCountersignService.getForCase('C1')).toMatchObject({ data: null });
  });
});

describe('Batch 483 — a cytology case with more than one specimen released independently', () => {
  it("a second specimen's release does NOT replace the first specimen's still-pending record", async () => {
    const first = await release({ specimenId: 'SP1', releasedAnswersSnapshot: { SP1: { dx: 'nilm' } } });
    const second = await release({ specimenId: 'SP2', residentName: 'Dr R2', releasedAnswersSnapshot: { SP2: { dx: 'ascus' } } });
    expect(first.ok && second.ok).toBe(true);

    const all = await mockCountersignService.getAll();
    const pending = all.ok ? all.data.filter(r => r.caseId === 'C1' && r.status === 'pending') : [];
    expect(pending).toHaveLength(2);
    expect(pending.map(r => r.specimenId).sort()).toEqual(['SP1', 'SP2']);
    // SP1's own snapshot survived SP2's release — the data-loss bug this fixes.
    expect(pending.find(r => r.specimenId === 'SP1')?.releasedAnswersSnapshot).toEqual({ SP1: { dx: 'nilm' } });
  });

  it('re-releasing the SAME specimen still replaces only that specimen\'s own prior pending record', async () => {
    await release({ specimenId: 'SP1', releasedAnswersSnapshot: { SP1: { dx: 'nilm' } } });
    await release({ specimenId: 'SP2', releasedAnswersSnapshot: { SP2: { dx: 'ascus' } } });
    await release({ specimenId: 'SP1', releasedAnswersSnapshot: { SP1: { dx: 'hsil' } } });

    const all = await mockCountersignService.getAll();
    const pending = all.ok ? all.data.filter(r => r.caseId === 'C1' && r.status === 'pending') : [];
    expect(pending).toHaveLength(2);
    expect(pending.find(r => r.specimenId === 'SP1')?.releasedAnswersSnapshot).toEqual({ SP1: { dx: 'hsil' } });
    expect(pending.find(r => r.specimenId === 'SP2')?.releasedAnswersSnapshot).toEqual({ SP2: { dx: 'ascus' } });
  });
});

describe('Batch 485 — completing a cytology specimen\'s own countersign (the deeper gap Batch 483 disclosed but didn\'t build)', () => {
  it('getForSpecimen finds only the record for that specimen, not another pending one on the same case', async () => {
    await release({ specimenId: 'SP1', releasedAnswersSnapshot: { SP1: { dx: 'nilm' } } });
    await release({ specimenId: 'SP2', releasedAnswersSnapshot: { SP2: { dx: 'ascus' } } });

    const sp1 = await mockCountersignService.getForSpecimen('C1', 'SP1');
    expect(sp1.ok && sp1.data?.specimenId).toBe('SP1');
    const sp3 = await mockCountersignService.getForSpecimen('C1', 'SP3');
    expect(sp3).toMatchObject({ ok: true, data: null });
  });

  it('countersign() with a specimenId completes only THAT specimen\'s record, leaving a sibling specimen\'s record pending', async () => {
    await release({ specimenId: 'SP1', releasedAnswersSnapshot: { SP1: { dx: 'nilm' } } });
    await release({ specimenId: 'SP2', releasedAnswersSnapshot: { SP2: { dx: 'ascus' } } });

    const result = await mockCountersignService.countersign({
      caseId: 'C1', specimenId: 'SP1', attendingId: 'A1', attendingName: 'Dr A', currentAnswersByInstance: { SP1: { dx: 'nilm' } },
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.status).toBe('countersigned');

    // SP1's own record closed; SP2's own, separate record is untouched.
    expect(await mockCountersignService.getForSpecimen('C1', 'SP1')).toMatchObject({ ok: true, data: null });
    const sp2 = await mockCountersignService.getForSpecimen('C1', 'SP2');
    expect(sp2.ok && sp2.data?.status).toBe('pending');
  });

  it('countersign() without a matching specimenId record returns an error rather than completing an unrelated one', async () => {
    await release({ specimenId: 'SP1', releasedAnswersSnapshot: { SP1: { dx: 'nilm' } } });
    const result = await mockCountersignService.countersign({
      caseId: 'C1', specimenId: 'SP9', attendingId: 'A1', attendingName: 'Dr A', currentAnswersByInstance: {},
    });
    expect(result.ok).toBe(false);
    // SP1's own record is still pending — untouched by the mismatched call.
    const sp1 = await mockCountersignService.getForSpecimen('C1', 'SP1');
    expect(sp1.ok && sp1.data?.status).toBe('pending');
  });

  it('reject() with a specimenId returns only that specimen\'s record, leaving a sibling pending', async () => {
    await release({ specimenId: 'SP1', releasedAnswersSnapshot: {} });
    await release({ specimenId: 'SP2', releasedAnswersSnapshot: {} });

    const result = await mockCountersignService.reject({
      caseId: 'C1', specimenId: 'SP1', attendingId: 'A1', attendingName: 'Dr A', attendingFeedback: 'Please re-check the adequacy call.',
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.status).toBe('returned');

    const sp2 = await mockCountersignService.getForSpecimen('C1', 'SP2');
    expect(sp2.ok && sp2.data?.status).toBe('pending');
  });
});
