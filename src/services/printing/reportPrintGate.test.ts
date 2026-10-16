// Batch 495 (PS-283 §4.2.4): the case-report print permission.
import { describe, it, expect, vi } from 'vitest';
import { beginReportPrint, checkReportPrint, hasPrintRestrictingFlag } from './reportPrintGate';

// Batch 516: an unrestricted case unless a test says otherwise.
const plain = { checkRestricted: vi.fn(), isRestrictedCase: async () => false };

describe('beginReportPrint', () => {
  it('allows the print when report:case-report:print is granted, checking the case and its facility', async () => {
    const check = vi.fn().mockResolvedValue({ allowed: true });
    await expect(beginReportPrint({ caseId: 'case-1', facilityId: 'fac-1' }, { check, ...plain })).resolves.toBe(true);
    expect(check).toHaveBeenCalledWith({ caseId: 'case-1', facilityId: 'fac-1' });
  });

  it('refuses the print when the capability is not granted', async () => {
    const check = vi.fn().mockResolvedValue({ allowed: false });
    await expect(beginReportPrint({ caseId: 'case-1', facilityId: 'fac-1' }, { check, ...plain })).resolves.toBe(false);
  });

  it('passes a missing facility as null, never undefined', async () => {
    const check = vi.fn().mockResolvedValue({ allowed: true });
    await beginReportPrint({ caseId: 'case-1' }, { check, ...plain });
    expect(check).toHaveBeenCalledWith({ caseId: 'case-1', facilityId: null });
  });
});

describe('restricted cases (Batch 516, PS-283)', () => {
  const allow = async () => ({ allowed: true });
  const deny = async () => ({ allowed: false });

  it('a case with a print-restricting flag also needs report:restricted-case:print', async () => {
    const checkRestricted = vi.fn(deny);
    expect(await checkReportPrint({ caseId: 'vip-1' }, { check: allow, checkRestricted, isRestrictedCase: async () => true })).toBe('restrictedCase');
    expect(checkRestricted).toHaveBeenCalledWith({ caseId: 'vip-1', facilityId: null });
    expect(await checkReportPrint({ caseId: 'vip-1' }, { check: allow, checkRestricted: allow, isRestrictedCase: async () => true })).toBe('allowed');
  });

  it('the general print permission is checked first; an ordinary case never asks for the restricted one', async () => {
    const checkRestricted = vi.fn(allow);
    expect(await checkReportPrint({ caseId: 'c' }, { check: deny, checkRestricted, isRestrictedCase: async () => true })).toBe('notPermitted');
    expect(await checkReportPrint({ caseId: 'c' }, { check: allow, checkRestricted, isRestrictedCase: async () => false })).toBe('allowed');
    expect(checkRestricted).not.toHaveBeenCalled();
  });

  it('only an active flag instance whose active definition restricts printing counts', () => {
    const defs = [{ id: 'conf', restrictsPrinting: true, status: 'Active' }, { id: 'old', restrictsPrinting: true, status: 'Inactive' }, { id: 'stat', status: 'Active' }];
    expect(hasPrintRestrictingFlag([{ flagDefinitionId: 'conf', deletedAt: null }], defs)).toBe(true);
    expect(hasPrintRestrictingFlag([{ flagDefinitionId: 'conf', deletedAt: '2026-10-01' }], defs)).toBe(false);
    expect(hasPrintRestrictingFlag([{ flagDefinitionId: 'old', deletedAt: null }], defs)).toBe(false);
    expect(hasPrintRestrictingFlag([{ flagDefinitionId: 'stat', deletedAt: null }], defs)).toBe(false);
    expect(hasPrintRestrictingFlag(undefined, defs)).toBe(false);
  });
});
