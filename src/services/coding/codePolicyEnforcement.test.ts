import { describe, expect, it } from 'vitest';
import { orderDiagnosesAllowed, policyOffersNone, systemAllowed, systemsOffByPolicy, collectCaseEntries, codeOutboundWithheldAudit, codeSignOutOverrideAudit, filterOutbound, isoDayOf, pillStates, signOutCodeCheck } from './codePolicyEnforcement';
import type { CodeSystemPolicy } from './codeSystemPolicy';
import { reconcileEntries, withEntries } from './caseCodingEntries';
import { sideBySide } from './simulatedIcdMap';
import { searchIcdo3Morphology } from './icdO3Morphology';

const policy: CodeSystemPolicy = { rules: [
  { system: 'ICD10', role: 'required' }, { system: 'ICD11', role: 'optional', from: '2027-01-01' }, { system: 'SNOMED', role: 'optional' }, { system: 'CPT', role: 'off' },
] };

describe('pillStates', () => {
  it('lists only allowed systems and marks required', () => {
    const p = pillStates(['SNOMED', 'ICD10', 'ICD11', 'CPT', 'OPCS4'], policy, '2026-10-18');
    expect(p.map(x => x.system)).toEqual(['SNOMED', 'ICD10']);
    expect(p.find(x => x.system === 'ICD10')?.required).toBe(true);
  });
  it('turns a system on from its start date', () => {
    expect(pillStates(['ICD11'], policy, '2027-01-01').length).toBe(1);
  });
});

describe('signOutCodeCheck', () => {
  it('finds a required system with no code', () => {
    const c = signOutCodeCheck([{ system: 'SNOMED', code: '1', source: 'typed' }], policy, '2026-10-18');
    expect(c.ok).toBe(false);
    expect(c.missing).toEqual(['ICD10']);
  });
  it('passes when covered, and reports codes outside the policy', () => {
    const c = signOutCodeCheck([{ system: 'ICD10', code: 'C50.9', source: 'typed' }, { system: 'CPT', code: '88305', source: 'typed' }], policy, '2026-10-18');
    expect(c.ok).toBe(true);
    expect(c.outside.map(e => e.system)).toEqual(['CPT']);
  });
});

describe('filterOutbound', () => {
  it('withholds codes the policy has off', () => {
    const r = filterOutbound([{ system: 'ICD10', code: 'C50.9', source: 'typed' }, { system: 'CPT', code: '88305', source: 'typed' }], policy, '2026-10-18');
    expect(r.allowed.map(e => e.system)).toEqual(['ICD10']);
    expect(r.withheld.map(e => e.system)).toEqual(['CPT']);
  });
});

describe('audit entries', () => {
  it('name systems and counts only, never code values', () => {
    const a = codeSignOutOverrideAudit('C-1', 'Dr A', ['ICD10']);
    expect(a.detail).toContain('ICD10');
    const b = codeOutboundWithheldAudit('C-1', 'Dr A', [{ system: 'CPT', code: '88305', source: 'typed' }]);
    expect(b.detail).not.toContain('88305');
  });
});

describe('collectCaseEntries', () => {
  it('reads case level, entries and specimen level codes', () => {
    const e = collectCaseEntries({ coding: { icd10: ['C50.9'] }, specimens: [{ coding: { icdO: [{ code: '8500/3' }], cpt: ['88305'] } }] });
    expect(e.map(x => `${x.system}:${x.code}`).sort()).toEqual(['CPT:88305', 'ICD10:C50.9', 'ICDO:8500/3']);
  });
});

describe('isoDayOf', () => { it('pads', () => expect(isoDayOf(new Date(2026, 0, 5))).toBe('2026-01-05')); });

describe('reconcileEntries / withEntries', () => {
  it('keeps recorded source and AI detail for a code already on the case', () => {
    const prev = [{ system: 'ICD10', code: 'C50.9', source: 'ai' as const, ai: { model: 'm', confidence: 90 } }];
    const out = reconcileEntries(prev, [{ system: 'ICD10', code: 'C50.9', source: 'typed' }, { system: 'SNOMED', code: '1', source: 'typed' }]);
    expect(out[0].source).toBe('ai');
    expect(out).toHaveLength(2);
  });
  it('writes the older lists and the entries together', () => {
    const c = withEntries({ cpt: ['1'] }, [{ system: 'ICD10', code: 'C50.9', source: 'typed' }, { system: 'OPCS4', code: 'H07', source: 'typed' }]);
    expect(c.icd10).toEqual(['C50.9']);
    expect(c.entries).toHaveLength(2);
    expect(c.cpt).toEqual(['1']);
  });
});

describe('simulated ICD map', () => {
  it('pairs an ICD-10 code with the seeded ICD-11 stem, cluster aware', () => {
    const rows = sideBySide([{ system: 'ICD10', code: 'C50.9', source: 'typed' }, { system: 'ICD11', code: '2C60.Y&XH0P4', source: 'typed' }, { system: 'ICD10', code: 'Z99', source: 'typed' }]);
    expect(rows[0].icd11?.code).toBe('2C60.Y&XH0P4');
    expect(rows[1].mappedIcd11).toBeUndefined();
  });
});

describe('ICD-O-3 morphology table', () => {
  it('finds by code, by code with behaviour and by words', () => {
    expect(searchIcdo3Morphology('8500').map(h => h.code)).toEqual(['8500/2', '8500/3']);
    expect(searchIcdo3Morphology('8500/3').map(h => h.code)).toEqual(['8500/3']);
    expect(searchIcdo3Morphology('glioblastoma')[0].code).toBe('9440/3');
    expect(searchIcdo3Morphology('')).toEqual([]);
  });
});

describe('Batch 614 (PS-762): policy on the other coding screens', () => {
  const all = ['SNOMED', 'ICD10', 'ICD11', 'CPT'] as const;
  it('lists the systems switched off today, and treats a system with no rule as off', () => {
    expect(systemsOffByPolicy(all, policy, '2026-06-01')).toEqual(['ICD11', 'CPT']);
    expect(systemsOffByPolicy(all, policy, '2027-02-01')).toEqual(['CPT']);
  });
  it('allows a system unless it is off', () => {
    expect(systemAllowed('ICD10', policy, '2026-06-01')).toBe(true);
    expect(systemAllowed('CPT', policy, '2026-06-01')).toBe(false);
  });
  it('drops order diagnoses only when ICD-10 is off', () => {
    const dx = [{ code: 'C50.9' }];
    expect(orderDiagnosesAllowed(dx, policy, '2026-06-01')).toEqual(dx);
    expect(orderDiagnosesAllowed(dx, { rules: [{ system: 'ICD10', role: 'off' }] }, '2026-06-01')).toEqual([]);
    expect(orderDiagnosesAllowed(undefined, policy, '2026-06-01')).toBeUndefined();
  });
  it('reports when the policy offers nothing the screen could use', () => {
    expect(policyOffersNone(['CPT'], policy, '2026-06-01')).toBe(true);
    expect(policyOffersNone(all, policy, '2026-06-01')).toBe(false);
    expect(policyOffersNone([], policy, '2026-06-01')).toBe(false);
  });
});
