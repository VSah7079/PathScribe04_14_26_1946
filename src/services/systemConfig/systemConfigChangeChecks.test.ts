// Batch 428: which capability each system-settings field needs.
import { describe, expect, it, vi } from 'vitest';
import { permitEnterpriseConfigPatch, permitSystemConfigPatch } from './systemConfigChangeChecks';

const deps = (allowed: string[]) => {
  const enforce = vi.fn(async (c: string) => ({ allowed: allowed.includes(c) }));
  return { enforce };
};

describe('system settings changes (Batch 428)', () => {
  it('each field needs its section\'s capability', async () => {
    const d = deps(['config:voice:manage']);
    expect(await permitSystemConfigPatch({ voiceEnabled: false }, d)).toBe(true);
    expect(await permitSystemConfigPatch({ approvedFonts: [] }, d)).toBe(false);
    expect(await permitSystemConfigPatch({ facilityTimezone: 'UTC' }, d)).toBe(false);
    expect(d.enforce.mock.calls.map(c => c[0])).toEqual(['config:voice:manage', 'config:report-appearance:manage', 'config:contribution-settings:manage']);
  });
  it('the English fuzzy-match switch (Batch 609) needs config:voice:manage, checked once with the other voice setting', async () => {
    const denied = deps([]);
    expect(await permitSystemConfigPatch({ voiceEnglishFuzzyFallback: false }, denied)).toBe(false);
    const allowed = deps(['config:voice:manage']);
    expect(await permitSystemConfigPatch({ voiceEnglishFuzzyFallback: false, voiceEnabled: true }, allowed)).toBe(true);
    expect(allowed.enforce.mock.calls.map(c => c[0])).toEqual(['config:voice:manage']);
  });
  it('a field no Configuration screen changes needs nothing', async () => {
    const d = deps([]);
    expect(await permitSystemConfigPatch({ somethingElse: 1 }, d)).toBe(true);
    expect(d.enforce).not.toHaveBeenCalled();
  });
  it('switching abnormal-result detection needs config:abnormal-triggers:manage', async () => {
    expect(await permitEnterpriseConfigPatch({ features: { abnormalDetectionEnabled: false } }, deps([]))).toBe(false);
    expect(await permitEnterpriseConfigPatch({ features: { abnormalDetectionEnabled: false } }, deps(['config:abnormal-triggers:manage']))).toBe(true);
  });
  it('recording a terminology licence needs config:code-systems:manage (Batch 623, PS-130)', async () => {
    const patch = { terminologyLicences: { SNOMED_CT: { enabled: true, holder: 'H', edition: 'E', reference: 'R', expiresOn: '' } } };
    expect(await permitEnterpriseConfigPatch(patch, deps([]))).toBe(false);
    const allowed = deps(['config:code-systems:manage']);
    expect(await permitEnterpriseConfigPatch(patch, allowed)).toBe(true);
    expect(allowed.enforce.mock.calls.map(c => c[0])).toEqual(['config:code-systems:manage']);
  });
});
