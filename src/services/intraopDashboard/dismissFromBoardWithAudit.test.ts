import { describe, it, expect, vi } from 'vitest';
import { dismissFromBoardWithAudit, dismissalNoticeKey } from './dismissFromBoardWithAudit';

const request = { sessionId: 's1', specimenId: 'sp1', locationId: 'l1', orNumber: 'OR-1', frozenSectionDiagnosis: 'x', frozenDiagnosisRenderedAt: '2026-10-24T10:00:00Z', arrivalTimestamp: '2026-10-24T09:00:00Z' } as never;
const staff = { id: 'u1', name: 'Staff One' };

describe('dismissalNoticeKey (ops-15)', () => {
  it('a dismissed case whose log write failed is told to the person; the other outcomes need no extra notice', () => {
    expect(dismissalNoticeKey('dismissedLogFailed')).toBe('orSuiteDashboard.dismissLogFailed');
    expect(dismissalNoticeKey('dismissed')).toBeNull();
    expect(dismissalNoticeKey('refused')).toBeNull();
  });
});

describe('dismissFromBoardWithAudit outcomes', () => {
  it('reports dismissedLogFailed when the log write throws or is refused, and refused when the dismissal is', async () => {
    const dismissOk = { dismissFromBoard: vi.fn(async () => ({ ok: true as const, data: {} })) } as never;
    const throwing = { record: vi.fn(async () => { throw new Error('down'); }) };
    expect((await dismissFromBoardWithAudit(request, staff, { intraoperativeService: dismissOk, orEventLogService: throwing })).outcome).toBe('dismissedLogFailed');
    const refusedLog = { record: vi.fn(async () => ({ ok: false as const, error: 'no' })) };
    expect((await dismissFromBoardWithAudit(request, staff, { intraoperativeService: dismissOk, orEventLogService: refusedLog as never })).outcome).toBe('dismissedLogFailed');
    const refusedDismiss = { dismissFromBoard: vi.fn(async () => ({ ok: false as const, error: 'no diagnosis' })) } as never;
    expect((await dismissFromBoardWithAudit(request, staff, { intraoperativeService: refusedDismiss, orEventLogService: throwing })).outcome).toBe('refused');
  });
});
