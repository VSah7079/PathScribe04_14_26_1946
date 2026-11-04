import { describe, it, expect } from 'vitest';
import { resolveQcAssignmentUpsert, QC_TIER_RANK, type QcAssignmentCandidate } from './resolveQcAssignmentUpsert';
import { ROSE_DISCREPANCY_QC_CANDIDATE } from './resolveNewQcCaseAssignment';
import type { CytologyQcCaseAssignment } from '@/types/cytologyQc/CytologyQcRule';

const NOW = '2026-10-09T12:00:00.000Z';
const rule = (over: Partial<QcAssignmentCandidate> = {}): QcAssignmentCandidate => ({
  triggerSource: 'rule_match', matchedRuleId: 'r-104', priorityTier: 'targeted_high_consequence', slaHours: 24,
  eligibleReviewerRoles: ['PATHOLOGIST'], selectionReason: 'rule:r-104', ...over,
});
const open = (over: Partial<CytologyQcCaseAssignment> = {}): CytologyQcCaseAssignment => ({
  id: 'qc-1', caseId: 'c1', specimenId: 's1', triggerSource: 'rule_match', matchedRuleId: 'r-70', priorityTier: 'routine_random',
  badges: [], state: 'QC_PENDING', primarySignOutProviderId: 'u1', slaDeadline: '2026-10-11T12:00:00.000Z', slaEscalationCount: 0,
  createdAt: '2026-10-09T11:00:00.000Z', eligibleReviewerRoles: ['CT'], selectionReasons: ['rule:r-70'], ...over,
});
const base = { caseId: 'c1', specimenId: 's1', primarySignOutProviderId: 'u1', now: NOW };

describe('resolveQcAssignmentUpsert (Batch 501, layered QC)', () => {
  it('no open assignment: creates one with the trigger tier, SLA, pool, reasons and a history line', () => {
    const r = resolveQcAssignmentUpsert({ ...base, existing: [], candidate: rule(), otherReasons: ['peer_review_flag:random_selection'] });
    expect(r.kind).toBe('create');
    if (r.kind !== 'create') return;
    expect(r.assignment).toMatchObject({
      triggerSource: 'rule_match', matchedRuleId: 'r-104', priorityTier: 'targeted_high_consequence', state: 'QC_PENDING',
      slaDeadline: '2026-10-10T12:00:00.000Z', eligibleReviewerRoles: ['PATHOLOGIST'],
      selectionReasons: ['rule:r-104', 'peer_review_flag:random_selection'],
    });
    expect(r.assignment.history?.[0].event).toBe('created');
  });

  it('a ROSE discrepancy on an open rule assignment upgrades it: top tier, 4-hour SLA, ROSE as the trigger, both reasons kept', () => {
    const r = resolveQcAssignmentUpsert({ ...base, existing: [open()], candidate: ROSE_DISCREPANCY_QC_CANDIDATE });
    expect(r.kind).toBe('update');
    if (r.kind !== 'update') return;
    expect(r.upgraded).toBe(true);
    expect(r.changes).toMatchObject({
      priorityTier: 'high_escalation', slaDeadline: '2026-10-09T16:00:00.000Z', triggerSource: 'rose_discrepancy',
      badges: ['ROSE Discrepancy'], selectionReasons: ['rule:r-70', 'rose_discrepancy'],
    });
    expect(r.history.detail).toContain('tier routine_random → high_escalation');
  });

  it('a rule on an open rule assignment: higher tier and stricter SLA win, and the more senior pool follows the tier', () => {
    const r = resolveQcAssignmentUpsert({ ...base, existing: [open()], candidate: rule({ eligibleReviewerRoles: ['SENIOR_PATHOLOGIST'] }) });
    if (r.kind !== 'update') throw new Error('expected update');
    expect(r.changes.priorityTier).toBe('targeted_high_consequence');
    expect(r.changes.slaDeadline).toBe('2026-10-10T12:00:00.000Z');
    expect(r.changes.eligibleReviewerRoles).toEqual(['SENIOR_PATHOLOGIST']);
    expect(r.changes.matchedRuleId).toBeUndefined(); // the original rule stays named; both are in the reasons
    expect(r.changes.selectionReasons).toEqual(['rule:r-70', 'rule:r-104']);
  });

  it('a weaker trigger never lowers the tier or loosens the SLA; it only adds its reason', () => {
    const strong = open({ priorityTier: 'high_escalation', slaDeadline: '2026-10-09T13:00:00.000Z', triggerSource: 'rose_discrepancy', selectionReasons: ['rose_discrepancy'] });
    const r = resolveQcAssignmentUpsert({ ...base, existing: [strong], candidate: rule({ priorityTier: 'routine_random', slaHours: 72 }) });
    if (r.kind !== 'update') throw new Error('expected update');
    expect(r.upgraded).toBe(false);
    expect(r.changes.priorityTier).toBeUndefined();
    expect(r.changes.slaDeadline).toBeUndefined();
    expect(r.changes.triggerSource).toBeUndefined();
    expect(r.changes.eligibleReviewerRoles).toBeUndefined();
    expect(r.changes.selectionReasons).toEqual(['rose_discrepancy', 'rule:r-104']);
    expect(r.history.event).toBe('reason_added');
  });

  it('at an equal tier the existing pool stays, unless it had none', () => {
    const same = open({ priorityTier: 'targeted_high_consequence' });
    const r1 = resolveQcAssignmentUpsert({ ...base, existing: [same], candidate: rule({ eligibleReviewerRoles: ['X'] }) });
    if (r1.kind !== 'update') throw new Error();
    expect(r1.changes.eligibleReviewerRoles).toBeUndefined();
    const r2 = resolveQcAssignmentUpsert({ ...base, existing: [open({ priorityTier: 'targeted_high_consequence', eligibleReviewerRoles: undefined })], candidate: rule({ eligibleReviewerRoles: ['X'] }) });
    if (r2.kind !== 'update') throw new Error();
    expect(r2.changes.eligibleReviewerRoles).toEqual(['X']);
  });

  it('only an OPEN assignment for the same specimen is upgraded; a resolved one, or another specimen, gets a new assignment', () => {
    expect(resolveQcAssignmentUpsert({ ...base, existing: [open({ state: 'FINAL_APPROVED' })], candidate: rule() }).kind).toBe('create');
    expect(resolveQcAssignmentUpsert({ ...base, existing: [open({ specimenId: 's2' })], candidate: rule() }).kind).toBe('create');
    expect(resolveQcAssignmentUpsert({ ...base, existing: [open({ state: 'QC_IN_REVIEW' })], candidate: rule() }).kind).toBe('update');
  });

  it('an older assignment with no recorded reasons starts from its own trigger', () => {
    const r = resolveQcAssignmentUpsert({ ...base, existing: [open({ selectionReasons: undefined })], candidate: ROSE_DISCREPANCY_QC_CANDIDATE });
    if (r.kind !== 'update') throw new Error();
    expect(r.changes.selectionReasons).toEqual(['rule:r-70', 'rose_discrepancy']);
  });

  it('tier order: ROSE (high_escalation) > targeted > routine', () => {
    expect(QC_TIER_RANK.high_escalation).toBeGreaterThan(QC_TIER_RANK.targeted_high_consequence);
    expect(QC_TIER_RANK.targeted_high_consequence).toBeGreaterThan(QC_TIER_RANK.routine_random);
  });
});
