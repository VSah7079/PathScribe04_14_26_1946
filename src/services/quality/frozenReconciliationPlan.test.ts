import { describe, it, expect } from 'vitest';
import { createReconciliationQueue, planFrozenReconciliation } from './frozenReconciliationPlan';
import type { IntraoperativeEntry, IntraopSpecimen } from '@/types/intraop/IntraoperativeEntry';

const sp = (id: string, cat?: IntraopSpecimen['frozenCategory']): IntraopSpecimen =>
  ({ id, specimenLabel: `Part ${id}`, arrivalTimestamp: 't', milestones: [], preparations: [], frozenCategory: cat, frozenSectionDiagnosis: cat ? `dx ${id}` : undefined });
const session = (specimens: IntraopSpecimen[], caseId = 'C1', status: 'merged' | 'pending' = 'merged') =>
  ({ status, mergedIntoCaseId: caseId, specimens } as Pick<IntraoperativeEntry, 'status' | 'mergedIntoCaseId' | 'specimens'>);
const on = { aiComparisonEnabled: true, reviewScreenEnabled: true };

describe('planFrozenReconciliation', () => {
  it('covers every non-deferred frozen specimen, not just the first', () => {
    const plan = planFrozenReconciliation('C1', [session([sp('a', 'benign'), sp('b', 'deferred'), sp('c', 'malignant'), sp('d')])], on);
    expect(plan.map(p => p.specimenId)).toEqual(['a', 'c']);
    expect(plan[1]).toMatchObject({ caseType: 'Part c', frozenCategory: 'malignant', frozenDx: 'dx c' });
  });
  it('spans several merged sessions and ignores other cases and pending sessions', () => {
    const plan = planFrozenReconciliation('C1', [session([sp('a', 'benign')]), session([sp('x', 'benign')], 'C2'), session([sp('p', 'benign')], 'C1', 'pending'), session([sp('b', 'atypical_suspicious')])], on);
    expect(plan.map(p => p.specimenId)).toEqual(['a', 'b']);
  });
  it('is empty when the comparison or the review screen is off', () => {
    const s = [session([sp('a', 'benign')])];
    expect(planFrozenReconciliation('C1', s, { ...on, aiComparisonEnabled: false })).toEqual([]);
    expect(planFrozenReconciliation('C1', s, { ...on, reviewScreenEnabled: false })).toEqual([]);
  });
});

describe('createReconciliationQueue', () => {
  it('hands items out in order and reloads cleanly', () => {
    const q = createReconciliationQueue();
    q.load(planFrozenReconciliation('C1', [session([sp('a', 'benign'), sp('b', 'benign')])], on));
    expect(q.next()?.specimenId).toBe('a');
    expect(q.next()?.specimenId).toBe('b');
    expect(q.next()).toBeUndefined();
    q.load([{ specimenId: 'z', caseType: '', frozenCategory: 'benign', frozenDx: '' }]);
    q.clear();
    expect(q.next()).toBeUndefined();
  });
});
