// Batch 747: a case's legacy tenant id resolves to its enterprise facility, so a wall display profile (which names a
// Facility.id) sees the case's batches, slides and add-ons; an id that is already a facility's is kept.
import { describe, expect, it } from 'vitest';
import { caseFacilityId } from './caseFacility';
import type { Facility } from '../facilities/IFacilityService';

const facilities = [
  { id: 'c-ent-dvmc', isEnterprise: true, legacyTenantIds: ['ORG-DVMC', 'HOSP-001'] },
  { id: 'c-trust-fenwick', isEnterprise: true, legacyTenantIds: ['c-fenwick-womens'] },
  { id: 'c-fenwick-womens', isEnterprise: false },
] as unknown as Facility[];

describe('caseFacilityId', () => {
  it('resolves a legacy tenant id, keeps a facility id, and passes anything else through', () => {
    expect(caseFacilityId('HOSP-001', facilities)).toBe('c-ent-dvmc');
    expect(caseFacilityId('c-fenwick-womens', facilities)).toBe('c-fenwick-womens');
    expect(caseFacilityId('c-unknown', facilities)).toBe('c-unknown');
    expect(caseFacilityId(undefined, facilities)).toBeUndefined();
  });
});
