import { describe, it, expect } from 'vitest';
import { colleagueRemainingScu, resolveWorkloadReassignmentPlan } from './resolveWorkloadReassignmentPlan';

const A = { userId: 'CT-A', name: 'Ann', remainingScu: 2 };
const B = { userId: 'CT-B', name: 'Bo', remainingScu: 5 };

describe('resolveWorkloadReassignmentPlan', () => {
  it('gives each case to the colleague with the most room, and stops at their room', () => {
    const p = resolveWorkloadReassignmentPlan(['1', '2', '3', '4', '5'], [A, B]);
    expect(p.assignments.map(a => `${a.caseId}:${a.userId}`)).toEqual(['1:CT-B', '2:CT-B', '3:CT-B', '4:CT-A', '5:CT-B']);
    expect(p.poolCaseIds).toEqual([]);
  });
  it('what nobody has room for goes to the pool', () => {
    const p = resolveWorkloadReassignmentPlan(['1', '2', '3', '4'], [{ ...A, remainingScu: 1 }, { ...B, remainingScu: 1 }]);
    expect(p.assignments).toHaveLength(2);
    expect(p.poolCaseIds).toEqual(['3', '4']);
  });
  it('no colleagues: everything goes to the pool (the earlier behaviour)', () => {
    expect(resolveWorkloadReassignmentPlan(['1', '2'], [])).toEqual({ assignments: [], poolCaseIds: ['1', '2'] });
  });
  it('a colleague with less than one SCU of room gets nothing; ties go to the lower id; the input is not changed', () => {
    const input = [{ userId: 'CT-Z', name: 'Z', remainingScu: 3 }, { userId: 'CT-Y', name: 'Y', remainingScu: 3 }, { userId: 'CT-X', name: 'X', remainingScu: 0.5 }];
    const p = resolveWorkloadReassignmentPlan(['1'], input);
    expect(p.assignments[0].userId).toBe('CT-Y');
    expect(input[0].remainingScu).toBe(3);
  });
  it('a colleague\'s room is the daily cap less the last day\'s screening, never negative', () => {
    expect(colleagueRemainingScu(100, 40)).toBe(60);
    expect(colleagueRemainingScu(100, 130)).toBe(0);
  });

  it('Batch 638: a colleague with time logged is held to the prorated limit for those hours; one who has not started gets the full cap', () => {
    // 4 hours logged: limit 50. 45 screened leaves 5, not the 55 the full cap would show.
    expect(colleagueRemainingScu(100, 45, 4 * 3600)).toBe(5);
    // Already over the limit for the hours worked (40 screened in 2 hours: limit 25): no room.
    expect(colleagueRemainingScu(100, 40, 2 * 3600)).toBe(0);
    // No time logged yet: the full cap less what they have screened.
    expect(colleagueRemainingScu(100, 0, 0)).toBe(100);
    expect(colleagueRemainingScu(100, 40)).toBe(60);
  });

  it('Batch 638: hours past 8 never raise the limit above the cap', () => {
    expect(colleagueRemainingScu(100, 90, 10 * 3600)).toBe(10);
    expect(colleagueRemainingScu(100, 90, 8 * 3600)).toBe(10);
  });
});
