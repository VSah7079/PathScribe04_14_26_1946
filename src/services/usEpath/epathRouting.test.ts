import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { profileForFacility, resolveEpathRouting } from './epathRouting';
import type { EpathProfileAssignment, EpathStateProfile } from './epathProfile';
import { exampleProfile } from './epathProfile';

// Batch 620 (part E, PS-800, Pete Oct 19): the state registry follows the facility that performed the work, never the patient's address.
const base = exampleProfile('t');
const profile = (id: string, state: string, facilityBasis: EpathStateProfile['facilityBasis'] = 'technicalComponent'): EpathStateProfile => ({ ...base, id, state, example: false, name: id, facilityBasis });
const az = profile('p-az', 'AZ'); const ca = profile('p-ca', 'CA'); const ny = profile('p-ny', 'NY', 'reading');
const facilities = [{ id: 'f-az', state: 'AZ' }, { id: 'f-ca', state: 'ca ' }, { id: 'f-none' }, { id: 'f-ny', state: 'NY' }];
const asg = (facilityId: string | null, profileId: string): EpathProfileAssignment => ({ id: `a-${facilityId}`, facilityId, profileId, updatedAt: '' });

describe('profileForFacility', () => {
  it('prefers the facility\'s own choice, then the profile for its state, then the enterprise default', () => {
    const i = { facilities, profiles: [az, ca, base], assignments: [asg('f-az', 'p-ca'), asg(null, 'example-us')] };
    expect(profileForFacility('f-az', i)).toMatchObject({ profile: ca, via: 'facilityOverride' });
    expect(profileForFacility('f-ca', i)).toMatchObject({ profile: ca, via: 'facilityState' });
    expect(profileForFacility('f-none', i)).toMatchObject({ profile: base, via: 'enterpriseDefault' });
  });
  it('never picks the example profile by state, and returns nothing with no choice at all', () => {
    expect(profileForFacility('f-az', { facilities, profiles: [{ ...base, state: 'AZ' }], assignments: [] })).toBeUndefined();
  });
});

describe('resolveEpathRouting', () => {
  const i = { facilities, profiles: [az, ca, ny], assignments: [] as EpathProfileAssignment[] };
  it('routes by the performing facility\'s state', () => {
    expect(resolveEpathRouting({ ...i, performingFacilityId: 'f-ca' })).toMatchObject({ ok: true, profile: ca, stateCode: 'CA', basisFacilityId: 'f-ca' });
  });
  it('a technical-component facility in another state decides when the profile says so (the default)', () => {
    expect(resolveEpathRouting({ ...i, performingFacilityId: 'f-ca', technicalComponentFacilityId: 'f-az' })).toMatchObject({ ok: true, profile: az, basisFacilityId: 'f-az' });
  });
  it('the reading facility decides when its profile says reading', () => {
    expect(resolveEpathRouting({ ...i, performingFacilityId: 'f-ny', technicalComponentFacilityId: 'f-none' })).toMatchObject({ ok: true, profile: ny, basisFacilityId: 'f-ny' });
  });
  it('the same technical facility as the reader is just the reader', () => {
    expect(resolveEpathRouting({ ...i, performingFacilityId: 'f-az', technicalComponentFacilityId: 'f-az' })).toMatchObject({ ok: true, basisFacilityId: 'f-az' });
  });
  it('refuses with a fixed reason when there is no facility or no profile', () => {
    expect(resolveEpathRouting({ ...i })).toEqual({ ok: false, reason: 'noFacility' });
    expect(resolveEpathRouting({ ...i, performingFacilityId: 'f-none' })).toEqual({ ok: false, reason: 'noProfile', basisFacilityId: 'f-none' });
  });
  it('never reads the patient: routing has no patient input and the source does not mention one', () => {
    const src = readFileSync('src/services/usEpath/epathRouting.ts', 'utf8').split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    expect(src).not.toMatch(/patient/i);
    expect(src).not.toMatch(/\.address/);
  });
});
