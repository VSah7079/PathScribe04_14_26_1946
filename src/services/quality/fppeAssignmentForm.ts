// src/services/quality/fppeAssignmentForm.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 515 (PS-124): the decisions behind the FPPE assignments screen, moved
// out of FppeAssignmentsSection.tsx when the screen moved to the generic QA
// supervision service (qaSupervisionAssignmentService, activity
// FPPE_ACTIVITY_TYPE_ID). Pure; tested in fppeAssignmentForm.test.ts.
// ─────────────────────────────────────────────────────────────────────────────
import type { QaSupervisionAssignment } from '@/types/quality/QaSupervisionAssignment';
import type { QaSupervisionEndCondition } from '@/types/quality/QaSupervisionAssignmentType';
import { FPPE_ACTIVITY_TYPE_ID } from './qaActivityTypeIds';
import { computeFppeProgress } from '@/services/cases/fppeEndCondition';

export type FppeEndConditionType = 'case_count' | 'duration_days' | 'either';

export interface FppeAssignmentDraft {
  superviseeUserId: string;
  supervisorUserId: string;
  facilityId: string;
  endConditionType: FppeEndConditionType;
  /** As typed in the form. */
  caseCountThreshold: string;
  durationDaysThreshold: string;
}

const positive = (s: string) => Number(s) > 0;

/** Ready to create: both people chosen and different, a facility, and every threshold the condition uses above zero. */
export function canCreateFppeAssignment(d: FppeAssignmentDraft): boolean {
  if (!d.superviseeUserId || !d.supervisorUserId || d.superviseeUserId === d.supervisorUserId || !d.facilityId) return false;
  if (d.endConditionType === 'case_count') return positive(d.caseCountThreshold);
  if (d.endConditionType === 'duration_days') return positive(d.durationDaysThreshold);
  return positive(d.caseCountThreshold) && positive(d.durationDaysThreshold);
}

/** The end condition the form describes. */
export function buildFppeEndCondition(d: Pick<FppeAssignmentDraft, 'endConditionType' | 'caseCountThreshold' | 'durationDaysThreshold'>): QaSupervisionEndCondition {
  if (d.endConditionType === 'case_count') return { type: 'case_count', threshold: Number(d.caseCountThreshold) };
  if (d.endConditionType === 'duration_days') return { type: 'duration_days', threshold: Number(d.durationDaysThreshold) };
  return { type: 'either', caseCountThreshold: Number(d.caseCountThreshold), durationDaysThreshold: Number(d.durationDaysThreshold) };
}

/** FPPE assignments only (the supervision service also holds cytotech competency). */
export function onlyFppeAssignments(all: QaSupervisionAssignment[]): QaSupervisionAssignment[] {
  return all.filter(a => a.activityTypeId === FPPE_ACTIVITY_TYPE_ID);
}

/** FPPE assignments only, optionally one facility's, split into active and completed. */
export function splitFppeAssignments(all: QaSupervisionAssignment[], facilityId: string): { active: QaSupervisionAssignment[]; completed: QaSupervisionAssignment[] } {
  const fppe = all.filter(a => a.activityTypeId === FPPE_ACTIVITY_TYPE_ID && (!facilityId || a.facilityId === facilityId));
  return { active: fppe.filter(a => a.status === 'active'), completed: fppe.filter(a => a.status === 'completed') };
}

/** Progress toward the end condition as a percentage, capped at 100 (the tracking tab's bar). */
export function fppeProgressPercent(a: QaSupervisionAssignment): number {
  return Math.min(100, computeFppeProgress(a).fraction * 100);
}

/** Active FPPE assignments that have reached their end condition but haven't been graduated. */
export function overdueFppeAssignments(active: QaSupervisionAssignment[]): QaSupervisionAssignment[] {
  return active.filter(a => fppeProgressPercent(a) >= 100);
}

/** The tracking tab's CSV rows. Headers and status codes stay English (exported data). */
export function fppeTrackingCsvRows(assignments: QaSupervisionAssignment[], scopeName: (subspecialtyId?: string) => string): Record<string, string | number>[] {
  return assignments.map(a => ({
    'Provisional Hire': a.superviseeUserName,
    'Proctor': a.supervisorUserName,
    'Scope': scopeName(a.subspecialtyId),
    'Status': a.status,
    'Cases Reviewed': a.casesReviewedCount,
    'Started At': a.startedAt,
    'Completed At': a.completedAt ?? '',
    'Completion Reason': a.completedReason ?? '',
    'Progress %': fppeProgressPercent(a).toFixed(0),
  }));
}
