import { describe, it, expect, beforeEach } from 'vitest';
import { demoCytologyQcAssignments } from './demoCytologyQcAssignments';
import { resolveQcReviewerEligibility } from './resolveQcReviewerEligibility';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } };
});

describe('demo Cytology QC assignments (Batch 395)', () => {
  it('one per priority tier, all pending, and Pete Nimmo may review them (he did not sign them out)', () => {
    const demo = demoCytologyQcAssignments();
    expect(demo.map(a => a.priorityTier).sort()).toEqual(['high_escalation', 'routine_random', 'targeted_high_consequence']);
    expect(demo.every(a => a.state === 'QC_PENDING' && new Date(a.slaDeadline).getTime() > Date.now())).toBe(true);
    expect(demo.every(a => resolveQcReviewerEligibility('PATH-001', a.primarySignOutProviderId))).toBe(true);
  });
  it('a store that was never written starts with them', async () => {
    const { mockCytologyQcCaseAssignmentService } = await import('./mockCytologyQcCaseAssignmentService?fresh=1' as string);
    const q = await mockCytologyQcCaseAssignmentService.getUnifiedQueue();
    expect(q.ok && q.data.map((a: any) => a.id).sort()).toEqual(['qc-demo-1', 'qc-demo-2', 'qc-demo-3']);
  });
});
