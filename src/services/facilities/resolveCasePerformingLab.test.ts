// Batch 434: a case's performing lab, including legacy tenant ids.
import { describe, it, expect } from 'vitest';
import { enterpriseOf, resolveCasePerformingLab } from './resolveCasePerformingLab';
import type { Facility } from './IFacilityService';

const f = (over: Partial<Facility>): Facility => ({ id: 'x', name: 'X', roles: [], ...over } as Facility);
const ent = f({ id: 'ent', name: 'Enterprise', isEnterprise: true, roles: ['performing_lab'], legacyTenantIds: ['HOSP-002'] });
const lab = f({ id: 'lab', name: 'Lab', roles: ['performing_lab'], parentId: 'ent' });
const clinic = f({ id: 'clinic', name: 'Clinic', roles: [], performingLabFacilityId: 'lab', parentId: 'ent' });
const all = [ent, lab, clinic];

describe('resolveCasePerformingLab', () => {
  it('an ordering facility uses its performing lab', () => {
    expect(resolveCasePerformingLab({ originHospitalId: 'clinic' }, all)?.id).toBe('lab');
  });
  it('a legacy tenant id resolves through the enterprise that carries it', () => {
    expect(resolveCasePerformingLab({ originHospitalId: 'HOSP-002' }, all)?.id).toBe('ent');
  });
  it('nothing when the id is unknown or missing', () => {
    expect(resolveCasePerformingLab({ originHospitalId: 'HOSP-999' }, all)).toBeUndefined();
    expect(resolveCasePerformingLab({}, all)).toBeUndefined();
  });
  it('the enterprise of a lab', () => {
    expect(enterpriseOf(lab, all)?.id).toBe('ent');
    expect(enterpriseOf(ent, all)?.id).toBe('ent');
    expect(enterpriseOf(undefined, all)).toBeUndefined();
  });
});
