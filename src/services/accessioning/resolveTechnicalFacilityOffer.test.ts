import { describe, it, expect } from 'vitest';
import { shouldOfferTechnicalFacility, technicalFacilityChoices, technicalFacilityForOrder } from './resolveTechnicalFacilityOffer';
import type { Facility } from '../facilities/IFacilityService';

const fac = (over: Partial<Facility>): Facility => ({ id: 'f', name: 'F', roles: ['performing_lab'], status: 'Active', ...over } as Facility);

describe('shouldOfferTechnicalFacility (Batch 618, PS-336)', () => {
  it('is offered for outside intake and for a consultation department', () => {
    expect(shouldOfferTechnicalFacility({ intakeType: 'outside' })).toBe(true);
    expect(shouldOfferTechnicalFacility({ intakeType: 'standard', departmentName: 'Histology-Only / Consultation' })).toBe(true);
  });
  it('is not offered for an ordinary case, so no extra click', () => {
    expect(shouldOfferTechnicalFacility({ intakeType: 'standard', departmentName: 'Surgical Tissue' })).toBe(false);
    expect(shouldOfferTechnicalFacility({ intakeType: 'downtime' })).toBe(false);
  });
});

describe('technicalFacilityChoices', () => {
  it('lists active performing labs only', () => {
    const all = [
      fac({ id: 'a' }), fac({ id: 'b', roles: ['client'] as never }), fac({ id: 'c', status: 'Inactive' }),
      fac({ id: 'd', isEnterprise: true }),
    ];
    expect(technicalFacilityChoices(all).map(f => f.id)).toEqual(['a']);
  });
});

describe('technicalFacilityForOrder', () => {
  const reporting = fac({ id: 'rep' });
  const other = fac({ id: 'oth' });
  const all = [reporting, other];
  it('saves another performing lab', () => expect(technicalFacilityForOrder('oth', reporting, all)).toBe('oth'));
  it('saves nothing for none, an unknown lab, or the reporting lab itself', () => {
    expect(technicalFacilityForOrder('', reporting, all)).toBeUndefined();
    expect(technicalFacilityForOrder('zzz', reporting, all)).toBeUndefined();
    expect(technicalFacilityForOrder('rep', reporting, all)).toBeUndefined();
  });
});
