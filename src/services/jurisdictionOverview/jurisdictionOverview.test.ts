import { describe, expect, it } from 'vitest';
import { buildJurisdictionOverview, jurisdictionsToList, type JurisdictionOverviewInput } from './jurisdictionOverview';
import { loadJurisdictionOverview } from './jurisdictionOverviewLoader';
import type { ParticipationTypeRecord } from '../participationTypes/IParticipationTypeService';

const type = (over: Partial<ParticipationTypeRecord>): ParticipationTypeRecord => ({
  id: 'p1', label: 'Pathologist', description: '', color: '#000', allowsMultiple: false, requiresNote: false, active: true, isSystem: true,
  sortOrder: 1, canFinalize: true, ...over,
});

const input = (over: Partial<JurisdictionOverviewInput> = {}): JurisdictionOverviewInput => ({
  jurisdictions: ['US', 'GB_EW'], labJurisdiction: 'US',
  facilities: [
    { id: 'f1', name: 'North Clinic', jurisdiction: 'US' },
    { id: 'f2', name: 'Old Lab', jurisdiction: 'US', status: 'Inactive' },
    { id: 'f3', name: 'London', jurisdiction: 'GB_EW' },
  ],
  participationTypes: [
    type({}),
    type({ id: 'p2', label: 'Resident', sortOrder: 2, canFinalize: false, requiresCountersign: true }),
    type({ id: 'p3', label: 'Reporting Biomedical Scientist', sortOrder: 3, scopedJurisdictions: ['GB_EW'], canFinalize: true }),
    type({ id: 'p4', label: 'Retired', sortOrder: 4, active: false }),
  ],
  codePolicies: {
    US: { rules: [{ system: 'ICD10', role: 'required' }, { system: 'ICD11', role: 'off' }] },
    GB_EW: { rules: [{ system: 'ICD10', role: 'optional' }, { system: 'ICD11', role: 'required', from: '2099-01-01' }, { system: 'OPCS4', role: 'optional' }] },
  },
  customCodePolicies: ['GB_EW'],
  aiRules: [
    { scope: { jurisdiction: 'GB_EW' }, allowedServices: ['gemini'] as never, allowedRegions: { gemini: ['europe-west2'] } as never },
    { scope: { jurisdiction: 'GB_EW', facilityId: 'f3' }, allowedServices: null, allowedRegions: {} },
  ],
  governingBodies: [
    { id: 'cap', label: 'CAP', fullName: '', region: '', website: '', enabled: true, syncEnabled: false, isCustom: false, jurisdictions: ['US'], retentionPolicyVersions: [{ id: 'v1' } as never] },
    { id: 'iccr', label: 'ICCR', fullName: '', region: '', website: '', enabled: true, syncEnabled: false, isCustom: false, jurisdictions: ['US'] },
    { id: 'rcp', label: 'RCPath', fullName: '', region: '', website: '', enabled: false, syncEnabled: false, isCustom: false, jurisdictions: ['GB_EW'], retentionPolicyVersions: [{ id: 'v1' } as never] },
  ],
  registries: [
    { id: 'naaccr_us', labelId: 'naaccrUs', jurisdictions: ['US'] } as never,
    { id: 'cosd_uk', labelId: 'cosdUk', jurisdictions: ['GB_EW'] } as never,
  ],
  today: '2026-10-18',
  ...over,
});

describe('buildJurisdictionOverview', () => {
  const rows = buildJurisdictionOverview(input());
  const us = rows.find(r => r.jurisdiction === 'US')!;
  const uk = rows.find(r => r.jurisdiction === 'GB_EW')!;

  it('lists facilities with inactive ones marked', () => {
    expect(us.isLabDefault).toBe(true);
    expect(us.facilities).toEqual([{ id: 'f1', name: 'North Clinic', active: true }, { id: 'f2', name: 'Old Lab', active: false }]);
    expect(uk.isLabDefault).toBe(false);
  });
  it('offers global roles everywhere and scoped ones only where scoped, skipping inactive', () => {
    expect(us.rolesOffered.map(r => r.label)).toEqual(['Pathologist', 'Resident']);
    expect(uk.rolesOffered.map(r => r.label)).toEqual(['Pathologist', 'Resident', 'Reporting Biomedical Scientist']);
  });
  it('shows who can sign out and who needs a countersign', () => {
    expect(us.canSignOut).toEqual(['Pathologist']);
    expect(us.needsCountersign).toEqual(['Resident']);
    expect(uk.canSignOut).toEqual(['Pathologist', 'Reporting Biomedical Scientist']);
  });
  it('shows code systems in use today, and a rule that has not started yet as not in use', () => {
    expect(us.codeSystems).toEqual([{ system: 'ICD10', role: 'required' }]);
    expect(uk.codeSystems.map(c => c.system)).toEqual(['ICD10', 'OPCS4']);
    expect(us.codePolicyIsCustom).toBe(false);
    expect(uk.codePolicyIsCustom).toBe(true);
  });
  it('summarises the AI policy', () => {
    expect(us.aiPolicy).toEqual({ kind: 'unrestricted' });
    expect(uk.aiPolicy).toEqual({ kind: 'restricted', services: ['gemini'], regionLimited: true, facilityRules: 1 });
  });
  it('names enabled retention bodies only, and the registries for the jurisdiction', () => {
    expect(us.retentionBodies).toEqual(['CAP']);
    expect(uk.retentionBodies).toEqual([]);
    expect(us.registryLabelIds).toEqual(['naaccrUs']);
    expect(uk.registryLabelIds).toEqual(['cosdUk']);
  });
});

describe('jurisdictionsToList', () => {
  it('adds the lab\'s and the facilities\' jurisdictions after the country-rule ones, once', () => {
    expect(jurisdictionsToList(['US', 'CA'], [{ id: 'f', name: 'x', jurisdiction: 'IN' as never }, { id: 'g', name: 'y', jurisdiction: 'US' }], 'IN' as never)).toEqual(['US', 'CA', 'IN']);
  });
});

describe('loadJurisdictionOverview', () => {
  it('reads each setting through the deps it is given and changes nothing', async () => {
    const calls: string[] = [];
    const base = input();
    const rows = await loadJurisdictionOverview({
      facilities: async () => { calls.push('facilities'); return [...base.facilities]; },
      participationTypes: async () => { calls.push('types'); return base.participationTypes; },
      savedCodePolicyJurisdictions: async () => { calls.push('saved'); return ['GB_EW']; },
      codePolicyFor: async j => base.codePolicies[j],
      aiRules: async () => { calls.push('ai'); return base.aiRules; },
      governingBodies: async () => { calls.push('bodies'); return base.governingBodies; },
      labJurisdiction: () => 'US',
      today: () => '2026-10-18',
    });
    expect(calls.sort()).toEqual(['ai', 'bodies', 'facilities', 'saved', 'types']);
    expect(rows.find(r => r.jurisdiction === 'US')?.facilities).toHaveLength(2);
    expect(rows.length).toBeGreaterThanOrEqual(13);
  });
});
