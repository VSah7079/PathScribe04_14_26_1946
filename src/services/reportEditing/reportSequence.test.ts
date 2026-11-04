// src/services/reportEditing/reportSequence.test.ts — Batch 579: the Sequencer's reorder.
import { describe, it, expect } from 'vitest';
import { sequenceCaseReports } from './reportSequence';

const sp = (id: string) => ({ id });
const rep = (instanceId: string, specimenId: string) => ({ instanceId, specimenId });

describe('sequenceCaseReports (Batch 579)', () => {
  const specimens = [sp('A'), sp('B'), sp('C')];
  const reports = [rep('a1', 'A'), rep('a2', 'A'), rep('b1', 'B')];

  it('orders specimens and their reports as chosen, and says what changed', () => {
    const r = sequenceCaseReports(specimens, reports, ['B', 'A', 'C'], { A: ['a2', 'a1'], B: ['b1'] });
    expect(r.specimens.map(s => s.id)).toEqual(['B', 'A', 'C']);
    expect(r.synopticReports.map(x => x.instanceId)).toEqual(['b1', 'a2', 'a1']);
    expect(r.specimensChanged).toBe(true);
    expect(r.reportsChanged).toBe(true);
  });

  it('nothing the order leaves out is dropped (it used to be)', () => {
    const r = sequenceCaseReports(specimens, [...reports, rep('x1', 'gone')], ['C', 'A'], { A: ['a2'] });
    expect(r.specimens.map(s => s.id)).toEqual(['C', 'A', 'B']);
    expect(r.synopticReports.map(x => x.instanceId)).toEqual(['a2', 'a1', 'b1', 'x1']);
  });

  it('the same order changes nothing', () => {
    const r = sequenceCaseReports(specimens, reports, ['A', 'B', 'C'], { A: ['a1', 'a2'], B: ['b1'] });
    expect(r.specimensChanged).toBe(false);
    expect(r.reportsChanged).toBe(false);
    expect(r.specimens).toEqual(specimens);
  });

  it('ignores unknown and repeated ids in the order', () => {
    const r = sequenceCaseReports(specimens, reports, ['B', 'zz', 'B', 'A'], { A: ['nope', 'a2', 'a2'] });
    expect(r.specimens.map(s => s.id)).toEqual(['B', 'A', 'C']);
    expect(r.synopticReports.map(x => x.instanceId)).toEqual(['b1', 'a2', 'a1']);
  });
});
