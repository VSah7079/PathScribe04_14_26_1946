// src/services/quality/fppeAssignmentForm.test.ts
import { describe, it, expect } from 'vitest';
import { canCreateFppeAssignment, buildFppeEndCondition, splitFppeAssignments, type FppeAssignmentDraft } from './fppeAssignmentForm';
import { FPPE_ACTIVITY_TYPE_ID, CYTOTECH_COMPETENCY_ACTIVITY_TYPE_ID } from './mockQaSupervisionAssignmentService';
import type { QaSupervisionAssignment } from '@/types/quality/QaSupervisionAssignment';

const draft = (over: Partial<FppeAssignmentDraft> = {}): FppeAssignmentDraft => ({
  superviseeUserId: 'u1', supervisorUserId: 'u2', facilityId: 'lab-1',
  endConditionType: 'either', caseCountThreshold: '20', durationDaysThreshold: '90', ...over,
});

describe('FPPE assignment form (Batch 515, PS-124)', () => {
  it('needs two different people, a facility and positive thresholds for the chosen condition', () => {
    expect(canCreateFppeAssignment(draft())).toBe(true);
    expect(canCreateFppeAssignment(draft({ supervisorUserId: 'u1' }))).toBe(false);
    expect(canCreateFppeAssignment(draft({ facilityId: '' }))).toBe(false);
    expect(canCreateFppeAssignment(draft({ durationDaysThreshold: '0' }))).toBe(false);
    expect(canCreateFppeAssignment(draft({ endConditionType: 'case_count', durationDaysThreshold: '0' }))).toBe(true);
    expect(canCreateFppeAssignment(draft({ endConditionType: 'duration_days', caseCountThreshold: '' }))).toBe(true);
  });

  it('builds the end condition the form describes', () => {
    expect(buildFppeEndCondition(draft())).toEqual({ type: 'either', caseCountThreshold: 20, durationDaysThreshold: 90 });
    expect(buildFppeEndCondition(draft({ endConditionType: 'case_count' }))).toEqual({ type: 'case_count', threshold: 20 });
    expect(buildFppeEndCondition(draft({ endConditionType: 'duration_days' }))).toEqual({ type: 'duration_days', threshold: 90 });
  });

  it('lists FPPE assignments only, filtered by facility, split by status', () => {
    const a = (id: string, activityTypeId: string, status: 'active' | 'completed', facilityId: string) =>
      ({ id, activityTypeId, status, facilityId }) as QaSupervisionAssignment;
    const all = [
      a('1', FPPE_ACTIVITY_TYPE_ID, 'active', 'lab-1'),
      a('2', FPPE_ACTIVITY_TYPE_ID, 'completed', 'lab-2'),
      a('3', CYTOTECH_COMPETENCY_ACTIVITY_TYPE_ID, 'active', 'lab-1'),
    ];
    expect(splitFppeAssignments(all, '')).toEqual({ active: [all[0]], completed: [all[1]] });
    expect(splitFppeAssignments(all, 'lab-2')).toEqual({ active: [], completed: [all[1]] });
  });
});
