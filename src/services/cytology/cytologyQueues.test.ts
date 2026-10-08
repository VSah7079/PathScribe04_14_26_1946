// Batch 440 (PS-271 follow-up): who works which GYN cytology case.
import { describe, it, expect } from 'vitest';
import {
  awaitingPathologistReview, cytologyReviewTrayState, isOwnPrimaryScreen, isQcRole,
  pathologistsOnCase, primaryScreenerId, qcByPrimaryScreener, takeCytologyReviewProblem,
} from './cytologyQueues';
import type { Case, CaseParticipant } from '@/types/case/Case';
import { syncPrimaryAssignee } from '../cases/caseAssignmentSync';

const by = (userId: string) => ({ userId, userName: userId });
const primary = (requiresPathologistReview = false, userId = 'CT1') => ({ role: 'primary_screen' as const, recordedBy: by(userId), requiresPathologistReview });
const person = (staffId: string, types: string[], status: 'active' | 'removed' = 'active'): CaseParticipant =>
  ({ staffId, staffName: staffId, source: 'system', participationTypeIds: types, addedBy: 'x', addedAt: '2026-10-02T00:00:00Z', status });

describe('QC / Rescreen queue', () => {
  it('QC roles are the random and targeted rescreens', () => {
    expect(isQcRole('qc_random_selection')).toBe(true);
    expect(isQcRole('qc_targeted_high_risk')).toBe(true);
    expect(isQcRole('primary_screen')).toBe(false);
    expect(isQcRole('pathologist_review')).toBe(false);
  });

  it('the primary screener is whoever recorded the primary screen', () => {
    expect(primaryScreenerId([primary()])).toBe('CT1');
    expect(primaryScreenerId([])).toBeUndefined();
  });

  it("a case you did the primary screen on is marked as yours (shown, not hidden); anyone else's isn't", () => {
    expect(isOwnPrimaryScreen([primary()], 'CT1')).toBe(true);
    expect(isOwnPrimaryScreen([primary()], 'CT2')).toBe(false);
    expect(isOwnPrimaryScreen([], 'CT1')).toBe(false);
  });

  it('a QC rescreen by the primary screener is refused; by anyone else, or in another role, it is not', () => {
    expect(qcByPrimaryScreener('qc_random_selection', [primary()], 'CT1')).toBe(true);
    expect(qcByPrimaryScreener('qc_targeted_high_risk', [primary()], 'CT1')).toBe(true);
    expect(qcByPrimaryScreener('qc_random_selection', [primary()], 'CT2')).toBe(false);
    expect(qcByPrimaryScreener('pathologist_review', [primary()], 'CT1')).toBe(false);
  });
});

describe('Cytology Review tray (positive GYN)', () => {
  it('waits for a pathologist when a screen asked for one and no pathologist has reviewed', () => {
    expect(awaitingPathologistReview([primary(true)], 'in-progress')).toBe(true);
    expect(awaitingPathologistReview([primary(false)], 'in-progress')).toBe(false);
    expect(awaitingPathologistReview([], 'in-progress')).toBe(false);
  });

  it('a QC rescreen that finds an abnormality follows the same route', () => {
    expect(awaitingPathologistReview([primary(false), { role: 'qc_random_selection', recordedBy: by('CT2'), requiresPathologistReview: true }], 'in-progress')).toBe(true);
  });

  it('leaves the tray once a pathologist has reviewed, or once the case is signed out', () => {
    expect(awaitingPathologistReview([primary(true), { role: 'pathologist_review', recordedBy: by('P1'), requiresPathologistReview: true }], 'in-progress')).toBe(false);
    for (const status of ['finalized', 'closed', 'pending-release']) expect(awaitingPathologistReview([primary(true)], status)).toBe(false);
  });

  it('pathologists on the case are active participants on anything but the cytotechnologist track', () => {
    expect(pathologistsOnCase([person('CT1', ['cytotechnologist']), person('P1', ['primary']), person('P2', ['primary'], 'removed')])).toEqual(['P1']);
    expect(pathologistsOnCase(undefined)).toEqual([]);
  });

  it('open while no pathologist is on the case, mine once I am, hidden when someone else is', () => {
    expect(cytologyReviewTrayState([person('CT1', ['cytotechnologist'])], 'P1')).toBe('open');
    expect(cytologyReviewTrayState([person('CT1', ['cytotechnologist']), person('P1', ['primary'])], 'P1')).toBe('mine');
    expect(cytologyReviewTrayState([person('P2', ['primary'])], 'P1')).toBe('hidden');
  });

  it('taking is refused when the case no longer needs a pathologist, or another one has it', () => {
    expect(takeCytologyReviewProblem([], 'P1', false)).toBe('NOT_AWAITING');
    expect(takeCytologyReviewProblem([person('P2', ['primary'])], 'P1', true)).toBe('ALREADY_TAKEN');
    expect(takeCytologyReviewProblem([person('CT1', ['cytotechnologist'])], 'P1', true)).toBeNull();
    expect(takeCytologyReviewProblem([person('P1', ['primary'])], 'P1', true)).toBeNull();
  });

  it('taking makes the pathologist primary; the cytotechnologist (claimed from the pool) stays on the case', () => {
    const before = { id: 'C1', order: { assignedTo: 'CT1' }, participants: [person('CT1', ['cytotechnologist'])] } as unknown as Case;
    const after = syncPrimaryAssignee(before, 'P1', 'P1', 'Dr P');
    expect(after.order?.assignedTo).toBe('P1');
    expect(after.participants?.map(x => [x.staffId, x.participationTypeIds, x.status])).toEqual([
      ['CT1', ['cytotechnologist'], 'active'], ['P1', ['primary'], 'active'],
    ]);
    expect(cytologyReviewTrayState(after.participants, 'P1')).toBe('mine');
    expect(cytologyReviewTrayState(after.participants, 'P2')).toBe('hidden');
  });

  it('Batch 441: a cytotech who became primary under the old claim fallback is still not the pathologist', () => {
    const isCytotech = (id: string) => id === 'CT1';
    expect(cytologyReviewTrayState([person('CT1', ['primary'])], 'P1', { isCytotech })).toBe('open');
    expect(pathologistsOnCase([person('CT1', ['primary']), person('P1', ['primary'])], { isCytotech })).toEqual(['P1']);
  });

  it('Batch 441: with no participants list, order.assignedTo decides (a cytotech assignee leaves it open)', () => {
    const isCytotech = (id: string) => id === 'CT1';
    expect(cytologyReviewTrayState([], 'P1', { assignedTo: 'P1', isCytotech })).toBe('mine');
    expect(cytologyReviewTrayState(undefined, 'P2', { assignedTo: 'P1', isCytotech })).toBe('hidden');
    expect(cytologyReviewTrayState([], 'P1', { assignedTo: 'CT1', isCytotech })).toBe('open');
    expect(takeCytologyReviewProblem([], 'P2', true, { assignedTo: 'P1' })).toBe('ALREADY_TAKEN');
  });
});

