// Batch 415 (Pete): the CLIA workload cap and CAP 5-year lookback are features, on for a US lab by default.
import { describe, it, expect, vi } from 'vitest';
import { resolveCytologyComplianceFeatures } from './cytologyComplianceFeatures';
import { saveCytologyComplianceFeatures } from './saveCytologyComplianceFeatures';

describe('resolveCytologyComplianceFeatures', () => {
  it('Automatic: on for a US lab, off in every other jurisdiction', () => {
    expect(resolveCytologyComplianceFeatures('US', null, null)).toEqual({ workloadCap: true, fiveYearLookback: true });
    for (const j of ['GB_EW', 'GB_SCT', 'IE', 'NL', 'DE', 'FR', 'BE', 'AU', 'NZ', 'KR', 'CA'] as const) {
      expect(resolveCytologyComplianceFeatures(j, {}, null), j).toEqual({ workloadCap: false, fiveYearLookback: false });
    }
  });
  it('the enterprise can switch each one; a facility\'s own setting wins', () => {
    expect(resolveCytologyComplianceFeatures('GB_EW', { workloadCap: 'on' }, null)).toEqual({ workloadCap: true, fiveYearLookback: false });
    expect(resolveCytologyComplianceFeatures('US', { fiveYearLookback: 'off' }, null).fiveYearLookback).toBe(false);
    expect(resolveCytologyComplianceFeatures('US', { workloadCap: 'off' }, { workloadCap: 'auto' }).workloadCap).toBe(true);
  });
});

describe('saveCytologyComplianceFeatures', () => {
  const deps = (allowed = true) => ({ enforce: vi.fn(async () => ({ allowed })), setEnterprise: vi.fn(async () => undefined), setFacility: vi.fn(async () => undefined), logAudit: vi.fn() });
  it('needs config:cytology-compliance:manage', async () => {
    const d = deps(false);
    expect(await saveCytologyComplianceFeatures(null, { workloadCap: 'on' }, { id: 'A', name: 'Admin' }, d)).toBe('notPermitted');
    expect(d.enforce).toHaveBeenCalledWith('config:cytology-compliance:manage', undefined);
    expect(d.setEnterprise).not.toHaveBeenCalled();
  });
  it('saves the enterprise or a facility (null removes it), and audits', async () => {
    const d = deps();
    await saveCytologyComplianceFeatures(null, { workloadCap: 'on' }, { id: 'A', name: 'Admin' }, d);
    await saveCytologyComplianceFeatures('F1', null, { id: 'A', name: 'Admin' }, d);
    expect(d.setEnterprise).toHaveBeenCalledWith({ workloadCap: 'on' });
    expect(d.setFacility).toHaveBeenCalledWith('F1', null);
    expect(d.logAudit).toHaveBeenCalledTimes(2);
  });
});
