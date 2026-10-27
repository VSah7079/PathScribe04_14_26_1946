import { describe, it, expect } from 'vitest';
import { workloadReassignmentNotice } from './workloadReassignmentNotice';

describe('workloadReassignmentNotice', () => {
  it('names the colleagues and the counts when anything was assigned', () => {
    expect(workloadReassignmentNotice({ assigned: 3, colleagueNames: ['Ann', 'Bo'], returnedToPool: 1 }))
      .toEqual({ key: 'cytologyScreening.workload.reassignedSummary', values: { assigned: 3, names: 'Ann, Bo', pool: 1 } });
  });
  it('keeps the earlier pool-only message when nobody had room (or nothing is known)', () => {
    expect(workloadReassignmentNotice({ assigned: 0, colleagueNames: [], returnedToPool: 2 }).key).toBe('cytologyScreening.workload.reassigned');
    expect(workloadReassignmentNotice(undefined).key).toBe('cytologyScreening.workload.reassigned');
  });
});
