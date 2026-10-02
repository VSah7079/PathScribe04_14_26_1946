import { describe, it, expect } from 'vitest';
import { activeReferenceLabs, normalizeReferenceLabLink } from './referenceLabLink';

describe('reference labs linked to a test (Batch 403)', () => {
  it('only active facilities with the reference_lab role can be picked', () => {
    const f = [
      { id: 'a', roles: ['reference_lab'], status: 'Active' },
      { id: 'b', roles: ['reference_lab'], status: 'Inactive' },
      { id: 'c', roles: ['performing_lab'], status: 'Active' },
    ];
    expect(activeReferenceLabs(f).map(x => x.id)).toEqual(['a']);
  });
  it('keeps the default only when it is one of the ticked labs, and stores nothing for a non-molecular test', () => {
    expect(normalizeReferenceLabLink('Molecular', ['mayo', 'arup', 'mayo'], 'arup')).toEqual({ referenceLabFacilityIds: ['mayo', 'arup'], defaultReferenceLabFacilityId: 'arup' });
    expect(normalizeReferenceLabLink('Molecular', ['mayo'], 'arup')).toEqual({ referenceLabFacilityIds: ['mayo'], defaultReferenceLabFacilityId: undefined });
    expect(normalizeReferenceLabLink('Molecular', [], 'arup')).toEqual({ referenceLabFacilityIds: undefined, defaultReferenceLabFacilityId: undefined });
    expect(normalizeReferenceLabLink('IHC', ['mayo'], 'mayo')).toEqual({ referenceLabFacilityIds: undefined, defaultReferenceLabFacilityId: undefined });
  });
});
