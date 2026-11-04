import { describe, expect, it, vi } from 'vitest';
import { createCodeSystemPolicyService, type CodeSystemPolicyDeps } from './codeSystemPolicyService';
import type { CodeSystemPolicyRecord } from './codeSystemPolicyRules';
import { codeSystemRecordProblem, isIsoDay, normalizeCodeSystemRecord } from './codeSystemPolicyRules';
import { roleOn } from './codeSystemPolicy';

function setup(allowed = true) {
  let stored: CodeSystemPolicyRecord[] | null = null;
  const audit = vi.fn(async () => undefined);
  const refused = vi.fn();
  const deps: CodeSystemPolicyDeps = {
    read: () => stored, write: r => { stored = r; },
    enforce: async () => ({ allowed }), audit, actorName: () => 'Dr Test', now: () => new Date('2026-10-16T12:00:00Z'),
    facilityJurisdictions: async () => ['US', 'KR'], defaultJurisdiction: () => 'US', refused,
  };
  return { svc: createCodeSystemPolicyService(deps), audit, refused, stored: () => stored };
}
const transition: CodeSystemPolicyRecord = { jurisdiction: 'US', rules: [
  { system: 'ICD10', role: 'required' }, { system: 'ICD11', role: 'optional', from: '2027-01-01' },
] };

describe('records and checks', () => {
  it('knows a real calendar day', () => {
    expect(isIsoDay('2027-02-28')).toBe(true);
    expect(isIsoDay('2027-02-30')).toBe(false);
    expect(isIsoDay('27-02-28')).toBe(false);
  });
  it.each([
    [{ jurisdiction: 'US', rules: [] }, 'NO_RULES'],
    [{ jurisdiction: 'US', rules: [{ system: '', role: 'required' }] }, 'BAD_SYSTEM'],
    [{ jurisdiction: 'US', rules: [{ system: 'ICD 10', role: 'required' }] }, 'BAD_SYSTEM'],
    [{ jurisdiction: 'US', rules: [{ system: 'ICD10', role: 'mandatory' }] }, 'BAD_ROLE'],
    [{ jurisdiction: 'US', rules: [{ system: 'ICD11', role: 'optional', from: '2027-13-01' }] }, 'BAD_DATE'],
    [{ jurisdiction: 'US', rules: [{ system: 'ICD11', role: 'off' }, { system: 'ICD11', role: 'optional' }] }, 'DUPLICATE'],
  ])('refuses %j with %s', (record, problem) => {
    expect(codeSystemRecordProblem(normalizeCodeSystemRecord(record as unknown as CodeSystemPolicyRecord))).toBe(problem);
  });
  it('accepts a later revision nobody has heard of, and trims blank dates', () => {
    const r = normalizeCodeSystemRecord({ jurisdiction: 'US', rules: [{ system: ' ICD12 ', role: 'optional', from: ' ' }] });
    expect(r.rules).toEqual([{ system: 'ICD12', role: 'optional' }]);
    expect(codeSystemRecordProblem(r)).toBeNull();
  });
});

describe('codeSystemPolicyService', () => {
  it('saves, reads back and audits before and after', async () => {
    const { svc, audit } = setup();
    const res = await svc.save(transition);
    expect(res.ok).toBe(true);
    const list = await svc.list();
    expect(list.ok && list.data[0]).toMatchObject({ jurisdiction: 'US', updatedBy: 'Dr Test', updatedAt: '2026-10-16T12:00:00.000Z' });
    expect(audit).toHaveBeenCalledTimes(1);
    const entry = (audit.mock.calls[0] as unknown as [{ event: string; detail: string }])[0];
    expect(entry.event).toBe('CODE_SYSTEM_POLICY_CHANGED');
    expect(entry.detail).toContain('default policy →');
    expect(entry.detail).toContain('ICD11 optional from 2027-01-01');
  });
  it('refuses without the capability, tells the user, and changes nothing', async () => {
    const { svc, audit, refused, stored } = setup(false);
    expect(await svc.save(transition)).toEqual({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    expect(await svc.reset('US')).toEqual({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    expect(refused).toHaveBeenCalledWith('config:code-systems:manage');
    expect(audit).not.toHaveBeenCalled();
    expect(stored()).toBeNull();
  });
  it('refuses an invalid record without saving it', async () => {
    const { svc, stored } = setup();
    expect(await svc.save({ jurisdiction: 'US', rules: [] })).toEqual({ ok: false, error: 'NO_RULES' });
    expect(stored()).toBeNull();
  });
  it('gives the default policy until one is saved, then the saved one, and the default again after a reset', async () => {
    const { svc, audit } = setup();
    expect(roleOn(await svc.policyFor('US'), 'ICD11', '2026-10-16')).toBe('off');
    await svc.save(transition);
    expect(roleOn(await svc.policyFor('US'), 'ICD11', '2027-02-01')).toBe('optional');
    expect(roleOn(await svc.policyFor('KR'), 'ICD11', '2027-02-01')).toBe('off');
    const reset = await svc.reset('US');
    expect(reset.ok && reset.data).toEqual([]);
    expect(roleOn(await svc.policyFor('US'), 'ICD11', '2027-02-01')).toBe('off');
    expect(audit).toHaveBeenCalledTimes(2);
  });
  it('a reset with nothing saved says so', async () => {
    expect(await setup().svc.reset('FR')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
  it('lists the laboratory jurisdiction and the facility ones once each', async () => {
    expect(await setup().svc.served()).toEqual(['US', 'KR']);
  });
});
