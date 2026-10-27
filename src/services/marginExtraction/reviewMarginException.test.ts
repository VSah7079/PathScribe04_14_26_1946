// @vitest-environment happy-dom
// src/services/marginExtraction/reviewMarginException.test.ts
// Batch 669 (ws-16 / ws-17): Resolve and Dismiss write an audit entry, run the tumor board margin rules again for the
// case, and the decided items stay listable. Uses the real mock services, with only the permission check controlled.
import { describe, it, expect, vi } from 'vitest';

const { allowed } = vi.hoisted(() => ({ allowed: { current: true } }));
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: vi.fn(async (capability: string) => ({ capability, allowed: allowed.current, grantedBy: [], missingRequirements: [], context: {} })) },
}));

const { mockMarginExtractionService: svc } = await import('./mockMarginExtractionService');
const { mockTumorBoardService } = await import('../tumorBoard/mockTumorBoardService');
const { mockTumorBoardRuleService } = await import('../tumorBoardRules/mockTumorBoardRuleService');
const { runMarginRuleEvaluation } = await import('../tumorBoardRules/runMarginRuleEvaluation');
const {
  resolveMarginExceptionWithFollowUp, dismissMarginExceptionWithFollowUp, marginExceptionAuditEntry, partitionMarginExceptions, marginOutcomeNotices,
} = await import('./reviewMarginException');

const FIELDS = [{ id: 'distance_to_closest_margin_mm', label: 'Distance to closest margin', type: 'text' }];
const ACTOR = { id: 'u1', name: 'Dr A' };

function deps(over: Record<string, unknown> = {}) {
  const logEvent = vi.fn(async () => ({ ok: true as const, data: undefined }));
  return {
    logEvent,
    d: {
      marginExtractionService: svc,
      auditService: { logEvent },
      getCase: async (caseId: string) => ({ id: caseId, synopticReports: [{ instanceId: 'i1', templateId: 't1', answers: { distance_to_closest_margin_mm: 'about two or so' } }] }) as never,
      runRules: async (input: Record<string, unknown>) => {
        const { caseData: _ignored, ...rest } = input;
        void _ignored;
        return runMarginRuleEvaluation({ ...(rest as object), getTemplateFields: async () => FIELDS } as never);
      },
      now: () => '2026-10-24T10:00:00.000Z',
      ...over,
    } as never,
  };
}

async function openException(caseId: string) {
  const r = await svc.extractAndStore({ caseId, instanceId: 'i1', fields: FIELDS, answers: { distance_to_closest_margin_mm: 'about two or so' } });
  if (!r.ok) throw new Error('setup');
  return r.data.exceptions[0];
}
async function clearCase(caseId: string) {
  const active = await mockTumorBoardService.getActiveForCase(caseId);
  if (active.ok && active.data) await mockTumorBoardService.update(active.data.id, { status: 'Cancelled' }, 'test', 'test');
}

describe('Resolve', () => {
  it('writes the audit entry, re-runs the rules and flags the case at once, keeping the recorded value', async () => {
    const rules = await mockTumorBoardRuleService.getAll();
    if (rules.ok) for (const r of rules.data) await mockTumorBoardRuleService.update(r.id, { marginThresholdMm: 1, active: true });
    await clearCase('case-rv-1');
    const exc = await openException('case-rv-1');
    const { d, logEvent } = deps();

    const res = await resolveMarginExceptionWithFollowUp(exc.id, 0.5, ACTOR, 'S26-0100', d);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.auditWritten).toBe(true);
    expect(res.data.ruleCheck.status).toBe('flagged');
    expect((await mockTumorBoardService.getActiveForCase('case-rv-1')) as { ok: boolean; data: { source: string } | null }).toMatchObject({ data: { source: 'Rule' } });

    expect(logEvent).toHaveBeenCalledTimes(1);
    const entry = (logEvent.mock.calls[0] as unknown as [{ event: string; detail: string; caseId: string; user: string }])[0];
    expect(entry).toMatchObject({ event: 'Margin exception resolved', caseId: 'case-rv-1', user: 'Dr A' });
    expect(entry.detail).toContain(exc.id);
    expect(entry.detail).toContain('S26-0100');
    expect(entry.detail).toContain('0.5 mm');
    expect(entry.detail).toContain('2026-10-24T10:00:00.000Z');
    expect(entry.detail).not.toContain('about two or so');

    // The rule re-run did not throw the human number away or reopen the item.
    const attr = await svc.getShadowAttribute('case-rv-1', 'i1', 'distance_to_closest_margin_mm');
    expect(attr.ok && attr.data?.valueMm).toBe(0.5);
    const pending = await svc.listExceptions({ caseId: 'case-rv-1', status: 'Pending' });
    expect(pending.ok && pending.data).toHaveLength(0);
  });

  it('writes nothing and runs nothing when the permission check refuses', async () => {
    const exc = await openException('case-rv-2');
    const { d, logEvent } = deps();
    const runRules = vi.fn();
    allowed.current = false;
    const res = await resolveMarginExceptionWithFollowUp(exc.id, 3, ACTOR, undefined, { ...(d as object), runRules } as never);
    allowed.current = true;
    expect(res.ok).toBe(false);
    expect(logEvent).not.toHaveBeenCalled();
    expect(runRules).not.toHaveBeenCalled();
  });

  it('a rule-check failure or audit failure never undoes the decision, and is reported', async () => {
    const exc = await openException('case-rv-3');
    const { d } = deps({ runRules: async () => { throw new Error('boom'); }, auditService: { logEvent: async () => { throw new Error('down'); } } });
    const res = await resolveMarginExceptionWithFollowUp(exc.id, 4, ACTOR, undefined, d);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.exception.status).toBe('Resolved');
    expect(res.data.auditWritten).toBe(false);
    expect(res.data.ruleCheck.status).toBe('failed');
    expect(marginOutcomeNotices(res.data).map(n => n.key)).toEqual([
      'marginExceptionReview.notice.ruleCheckFailed', 'marginExceptionReview.notice.auditNotWritten',
    ]);
  });
});

describe('Dismiss', () => {
  it('audits who, when, case, item and the reason, re-runs the rules, and the item stays dismissed', async () => {
    await clearCase('case-dm-1');
    const exc = await openException('case-dm-1');
    const { d, logEvent } = deps();
    const res = await dismissMarginExceptionWithFollowUp(exc.id, 'Margin not assessable', ACTOR, 'S26-0200', d);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.ruleCheck.status).toBe('notFlagged');
    const entry = (logEvent.mock.calls[0] as unknown as [{ event: string; detail: string }])[0];
    expect(entry.event).toBe('Margin exception dismissed');
    expect(entry.detail).toContain('Margin not assessable');
    expect(entry.detail).toContain('S26-0200');
    const pending = await svc.listExceptions({ caseId: 'case-dm-1', status: 'Pending' });
    expect(pending.ok && pending.data).toHaveLength(0);
    const all = await svc.listExceptions({ caseId: 'case-dm-1' });
    expect(all.ok && all.data.map(e => e.status)).toEqual(['Dismissed']);
  });
});

describe('pure helpers', () => {
  it('the audit text uses plain English for the original reason and falls back to the code', () => {
    const e = marginExceptionAuditEntry({ action: 'dismissed', exception: { id: 'm1', caseId: 'c1', fieldLabel: 'F', reason: 'weird' }, actorName: 'X', at: 'T', dismissReason: 'r' });
    expect(e.detail).toContain('flagged because: weird');
    expect(e.detail).toContain('case c1');
  });
  it('partitions pending from decided, newest decision first', () => {
    const mk = (id: string, status: 'Pending' | 'Resolved' | 'Dismissed', resolvedAt?: string) => ({ id, status, resolvedAt }) as never;
    const p = partitionMarginExceptions([mk('a', 'Pending'), mk('b', 'Resolved', '2026-01-01'), mk('c', 'Dismissed', '2026-02-01')]);
    expect(p.pending.map((e: { id: string }) => e.id)).toEqual(['a']);
    expect(p.decided.map((e: { id: string }) => e.id)).toEqual(['c', 'b']);
  });
  it('notices: flagged names the board', () => {
    expect(marginOutcomeNotices({ exception: {} as never, auditWritten: true, ruleCheck: { status: 'flagged', board: 'GI MDT' } }))
      .toEqual([{ kind: 'info', key: 'marginExceptionReview.notice.flagged', params: { board: 'GI MDT' } }]);
  });
});
