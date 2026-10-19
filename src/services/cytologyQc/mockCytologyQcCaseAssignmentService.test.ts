import { describe, it, expect, beforeEach, vi } from 'vitest';

// Batch 396: taking a review and recording its verdict check cytology:qc-review:record.
const enforce = vi.fn();
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: (...a: unknown[]) => enforce(...a) } }));

beforeEach(() => {
  enforce.mockReset();
  enforce.mockResolvedValue({ allowed: true });
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

const newAssignment = () => ({
  caseId: 'case-1', specimenId: 'spec-1', triggerSource: 'rule_match' as const,
  matchedRuleId: 'rule-1', priorityTier: 'routine_random' as const, badges: [],
  state: 'QC_PENDING' as const, primarySignOutProviderId: 'prov-1', slaEscalationCount: 0,
  slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date().toISOString(),
});

describe('mockCytologyQcCaseAssignmentService', () => {
  it('a real, full happy-path lifecycle: create -> assign -> concurrence -> FINAL_APPROVED', async () => {
    const { mockCytologyQcCaseAssignmentService } = await import('./mockCytologyQcCaseAssignmentService');
    const created = await mockCytologyQcCaseAssignmentService.create(newAssignment());
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const assigned = await mockCytologyQcCaseAssignmentService.assignReviewer(created.data.id, 'prov-2');
    expect(assigned.ok).toBe(true);
    if (assigned.ok) expect(assigned.data.state).toBe('QC_IN_REVIEW');

    const resolved = await mockCytologyQcCaseAssignmentService.recordConcurrence(created.data.id, 'Agree with primary interpretation.');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.data.state).toBe('FINAL_APPROVED');
      expect(resolved.data.concurrenceCommentary).toBe('Agree with primary interpretation.');
      expect(resolved.data.resolvedAt).toBeDefined();
    }
  });

  it('a real self-review attempt is honestly rejected, never silently allowed', async () => {
    const { mockCytologyQcCaseAssignmentService } = await import('./mockCytologyQcCaseAssignmentService');
    const created = await mockCytologyQcCaseAssignmentService.create(newAssignment());
    if (!created.ok) return;
    const result = await mockCytologyQcCaseAssignmentService.assignReviewer(created.data.id, 'prov-1');
    expect(result.ok).toBe(false);
  });

  it('recording a discrepancy on a case that was never assigned a reviewer is honestly rejected, never silently allowed out of order', async () => {
    const { mockCytologyQcCaseAssignmentService } = await import('./mockCytologyQcCaseAssignmentService');
    const created = await mockCytologyQcCaseAssignmentService.create(newAssignment());
    if (!created.ok) return;
    const result = await mockCytologyQcCaseAssignmentService.recordDiscrepancy(created.data.id, {
      primaryDiagnosticCode: 'NILM', secondaryDiagnosticCode: 'HSIL', severity: 'major',
    });
    expect(result.ok).toBe(false);
  });

  it('a real discrepancy path transitions to QC_DISCREPANCY_REVISE and logs the real discrepancy record', async () => {
    const { mockCytologyQcCaseAssignmentService } = await import('./mockCytologyQcCaseAssignmentService');
    const created = await mockCytologyQcCaseAssignmentService.create(newAssignment());
    if (!created.ok) return;
    await mockCytologyQcCaseAssignmentService.assignReviewer(created.data.id, 'prov-2');
    const result = await mockCytologyQcCaseAssignmentService.recordDiscrepancy(created.data.id, {
      primaryDiagnosticCode: 'NILM', secondaryDiagnosticCode: 'HSIL', severity: 'major', reviewerCommentary: 'Missed high-grade cells.',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.state).toBe('QC_DISCREPANCY_REVISE');
      expect(result.data.discrepancy?.severity).toBe('major');
      expect(result.data.discrepancy?.loggedAt).toBeDefined();
    }
  });

  it('the real unified queue only ever contains active (QC_PENDING/QC_IN_REVIEW) assignments, never a resolved one', async () => {
    const { mockCytologyQcCaseAssignmentService } = await import('./mockCytologyQcCaseAssignmentService');
    const created = await mockCytologyQcCaseAssignmentService.create(newAssignment());
    if (!created.ok) return;
    await mockCytologyQcCaseAssignmentService.assignReviewer(created.data.id, 'prov-2');
    await mockCytologyQcCaseAssignmentService.recordConcurrence(created.data.id);
    const queue = await mockCytologyQcCaseAssignmentService.getUnifiedQueue();
    expect(queue.ok).toBe(true);
    if (queue.ok) expect(queue.data.find(a => a.id === created.data.id)).toBeUndefined();
  });

  it('the real unified queue is genuinely sorted by the urgency matrix, high_escalation before routine_random', async () => {
    const { mockCytologyQcCaseAssignmentService } = await import('./mockCytologyQcCaseAssignmentService');
    await mockCytologyQcCaseAssignmentService.create({ ...newAssignment(), priorityTier: 'routine_random' });
    await mockCytologyQcCaseAssignmentService.create({ ...newAssignment(), priorityTier: 'high_escalation', badges: ['ROSE Discrepancy'] });
    const queue = await mockCytologyQcCaseAssignmentService.getUnifiedQueue();
    expect(queue.ok).toBe(true);
    if (queue.ok) expect(queue.data[0].priorityTier).toBe('high_escalation');
  });

  it('a real, genuinely SLA-breached case in review is escalated back to the unified queue, reviewer cleared, escalation count real and incremented', async () => {
    const { mockCytologyQcCaseAssignmentService } = await import('./mockCytologyQcCaseAssignmentService');
    const pastDeadline = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // an hour ago — genuinely breached
    const created = await mockCytologyQcCaseAssignmentService.create({ ...newAssignment(), slaDeadline: pastDeadline });
    if (!created.ok) return;
    await mockCytologyQcCaseAssignmentService.assignReviewer(created.data.id, 'prov-2');
    const result = await mockCytologyQcCaseAssignmentService.escalateForSlaBreach(created.data.id, new Date().toISOString(), 'Reviewer unavailable.');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.state).toBe('QC_PENDING');
      expect(result.data.assignedReviewerId).toBeUndefined();
      expect(result.data.slaEscalationCount).toBe(1);
    }
  });

  it('a real case that has NOT genuinely breached its own SLA is honestly refused escalation, never allowed as an arbitrary bump', async () => {
    const { mockCytologyQcCaseAssignmentService } = await import('./mockCytologyQcCaseAssignmentService');
    const created = await mockCytologyQcCaseAssignmentService.create(newAssignment()); // real, 24h-out deadline
    if (!created.ok) return;
    await mockCytologyQcCaseAssignmentService.assignReviewer(created.data.id, 'prov-2');
    const result = await mockCytologyQcCaseAssignmentService.escalateForSlaBreach(created.data.id, new Date().toISOString(), 'Testing.');
    expect(result.ok).toBe(false);
  });

  it('a real supervisor bypass force-approves the case and logs a real, attributable justification, never silently', async () => {
    const { mockCytologyQcCaseAssignmentService } = await import('./mockCytologyQcCaseAssignmentService');
    const created = await mockCytologyQcCaseAssignmentService.create(newAssignment());
    if (!created.ok) return;
    const result = await mockCytologyQcCaseAssignmentService.supervisorBypass(created.data.id, 'supervisor-1', 'Reviewer on leave, case needed for surgery today.');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.state).toBe('FINAL_APPROVED');
      expect(result.data.supervisorBypass?.supervisorId).toBe('supervisor-1');
      expect(result.data.supervisorBypass?.justification).toContain('surgery');
    }
  });

  it('a real, already-terminal case cannot be bypassed again, per its own real terminal-state guard', async () => {
    const { mockCytologyQcCaseAssignmentService } = await import('./mockCytologyQcCaseAssignmentService');
    const created = await mockCytologyQcCaseAssignmentService.create(newAssignment());
    if (!created.ok) return;
    await mockCytologyQcCaseAssignmentService.supervisorBypass(created.data.id, 'supervisor-1', 'First bypass.');
    const result = await mockCytologyQcCaseAssignmentService.supervisorBypass(created.data.id, 'supervisor-1', 'Second attempt.');
    expect(result.ok).toBe(false);
  });

  it('Batch 396: without cytology:qc-review:record, taking a review and recording a verdict are refused and nothing changes', async () => {
    const { mockCytologyQcCaseAssignmentService } = await import('./mockCytologyQcCaseAssignmentService');
    const { QC_REVIEW_NOT_PERMITTED } = await import('./qcReviewErrors');
    const created = await mockCytologyQcCaseAssignmentService.create(newAssignment());
    if (!created.ok) return;
    enforce.mockResolvedValue({ allowed: false });
    const assign = await mockCytologyQcCaseAssignmentService.assignReviewer(created.data.id, 'prov-2');
    expect(assign).toEqual({ ok: false, error: QC_REVIEW_NOT_PERMITTED });
    expect(enforce).toHaveBeenCalledWith('cytology:qc-review:record', { caseId: 'case-1' });
    const concur = await mockCytologyQcCaseAssignmentService.recordConcurrence(created.data.id);
    expect(concur.ok).toBe(false);
    const after = await mockCytologyQcCaseAssignmentService.getById(created.data.id);
    if (after.ok) expect(after.data.state).toBe('QC_PENDING');
  });

  it('Batch 432: escalating checks cytology:qc-review:record and needs a reason; the bypass checks cytology:qc-review:bypass and needs a justification', async () => {
    const { mockCytologyQcCaseAssignmentService: svc } = await import('./mockCytologyQcCaseAssignmentService');
    const created = await svc.create(newAssignment());
    if (!created.ok) throw new Error('setup failed');
    enforce.mockImplementation(async (c: string) => ({ allowed: c !== 'cytology:qc-review:bypass' }));
    expect(await svc.supervisorBypass(created.data.id, 'supervisor-1', 'Needed today.')).toMatchObject({ ok: false });
    expect(enforce).toHaveBeenCalledWith('cytology:qc-review:bypass', expect.anything());
    enforce.mockResolvedValue({ allowed: true });
    expect((await svc.supervisorBypass(created.data.id, 'supervisor-1', '   ')).ok).toBe(false);
    expect(await svc.escalateForSlaBreach(created.data.id, new Date().toISOString(), ' ')).toMatchObject({ ok: false });
    enforce.mockResolvedValue({ allowed: false });
    expect(await svc.escalateForSlaBreach(created.data.id, new Date().toISOString(), 'Overdue')).toMatchObject({ ok: false });
    expect(enforce).toHaveBeenCalledWith('cytology:qc-review:record', expect.anything());
  });
});


describe('mockCytologyQcCaseAssignmentService.applyAdditionalTrigger (Batch 501)', () => {
  it('upgrades an open assignment with the trigger fields only', async () => {
    const { mockCytologyQcCaseAssignmentService: svc } = await import('./mockCytologyQcCaseAssignmentService');
    const created = await svc.create(newAssignment());
    if (!created.ok) throw new Error('create failed');
    const r = await svc.applyAdditionalTrigger(created.data.id, {
      priorityTier: 'high_escalation', selectionReasons: ['rule:rule-1', 'rose_discrepancy'],
      history: [{ at: 'now', event: 'upgraded', reason: 'rose_discrepancy', detail: 'Upgraded by rose_discrepancy: tier routine_random → high_escalation' }],
      // not a trigger field: ignored
      ...({ state: 'FINAL_APPROVED' } as object),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.priorityTier).toBe('high_escalation');
    expect(r.data.selectionReasons).toEqual(['rule:rule-1', 'rose_discrepancy']);
    expect(r.data.state).toBe('QC_PENDING');
  });

  it('refuses a resolved assignment', async () => {
    const { mockCytologyQcCaseAssignmentService: svc } = await import('./mockCytologyQcCaseAssignmentService');
    const created = await svc.create({ ...newAssignment(), state: 'FINAL_APPROVED' });
    if (!created.ok) throw new Error('create failed');
    const r = await svc.applyAdditionalTrigger(created.data.id, { priorityTier: 'high_escalation' });
    expect(r.ok).toBe(false);
  });

  it('Batch 608: assigning a reviewer outside the rule pool is refused; a member is accepted', async () => {
    const { mockCytologyQcCaseAssignmentService } = await import('./mockCytologyQcCaseAssignmentService');
    const created = await mockCytologyQcCaseAssignmentService.create({ ...newAssignment(), caseId: 'case-pool', eligibleReviewerRoles: ['SENIOR_CT'] } as never);
    if (!created.ok) throw new Error('create failed');
    // Staff 1 is a Pathologist: PATHOLOGIST pool only.
    const refused = await mockCytologyQcCaseAssignmentService.assignReviewer(created.data.id, '1');
    expect(refused).toMatchObject({ ok: false, error: 'CYTOLOGY_QC_REVIEWER_NOT_IN_POOL' });
    const open = await mockCytologyQcCaseAssignmentService.create({ ...newAssignment(), caseId: 'case-pool-2', eligibleReviewerRoles: ['PATHOLOGIST'] } as never);
    if (!open.ok) throw new Error('create failed');
    expect((await mockCytologyQcCaseAssignmentService.assignReviewer(open.data.id, '1')).ok).toBe(true);
  });
});
