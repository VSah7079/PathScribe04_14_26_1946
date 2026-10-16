import { describe, it, expect, vi } from 'vitest';
import { recordInkingGateOverride, INKING_GATE_OVERRIDE_CAPABILITY } from './recordInkingGateOverride';
import type { InkingGateIssue } from './evaluateInkingGate';

const issue: InkingGateIssue = {
  marginId: 'm1', specimenId: 'sp-1', specimenDisplayName: 'A', severity: 3, code: 'margin_ink_color_unmapped',
  message: 'Margin "Lateral" on specimen sp-1 recorded an ink colour code ("#0000FF") that does not map to any colour in the active ink-colour dictionary.',
};

const BASE_INPUT = {
  caseId: 'S26-001', specimenId: 'sp-1', facilityId: 'fac-1',
  jurisdictionCode: 'US_CAP' as const, inkingValidationMode: 'STRICT_ENFORCE' as const,
  unresolvedIssues: [issue], overrideReasonCode: 'FOREIGN_OBJECT_PRE_INKED' as const,
  overrideByUserId: 'u-1', overrideByUserName: 'Dr. Lee', overrideRole: 'lab-director',
};

describe('recordInkingGateOverride', () => {
  it('enforces case:inking-gate:override and refuses when not permitted', async () => {
    const enforce = vi.fn().mockResolvedValue({ allowed: false });
    const logEvent = vi.fn();
    const result = await recordInkingGateOverride(BASE_INPUT, { authorization: { enforce }, audit: { logEvent } });
    expect(enforce).toHaveBeenCalledWith(INKING_GATE_OVERRIDE_CAPABILITY, { caseId: 'S26-001', facilityId: 'fac-1' });
    expect(result).toEqual({ ok: false, notPermitted: true });
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('on success, records a PHI-safe audit entry and returns the InkOverrideAuditLogEntry', async () => {
    const enforce = vi.fn().mockResolvedValue({ allowed: true });
    const logEvent = vi.fn().mockResolvedValue({ ok: true });
    const result = await recordInkingGateOverride(BASE_INPUT, { authorization: { enforce }, audit: { logEvent } });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.entry).toMatchObject({
      caseId: 'S26-001', specimenId: 'sp-1', facilityId: 'fac-1',
      jurisdictionCode: 'US_CAP', overrideReasonCode: 'FOREIGN_OBJECT_PRE_INKED',
      overrideByUserId: 'u-1', overrideRole: 'lab-director',
    });
    expect(logEvent).toHaveBeenCalledTimes(1);
    const entry = logEvent.mock.calls[0][0];
    expect(entry.event).toBe('Inking gate override');
    expect(entry.facilityId).toBe('fac-1');
    expect(entry.detail).toContain('FOREIGN_OBJECT_PRE_INKED');
    expect(entry.detail).not.toMatch(/patient|mrn/i);
  });

  it('includes the free-text reason in the audit detail when supplied (OTHER)', async () => {
    const enforce = vi.fn().mockResolvedValue({ allowed: true });
    const logEvent = vi.fn().mockResolvedValue({ ok: true });
    await recordInkingGateOverride({ ...BASE_INPUT, overrideReasonCode: 'OTHER', overrideReasonText: 'Pathologist conference decision' }, { authorization: { enforce }, audit: { logEvent } });
    expect(logEvent.mock.calls[0][0].detail).toContain('Pathologist conference decision');
  });
});
