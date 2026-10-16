// src/services/tumorBoard/tumorBoardPresenterEligibility.test.ts
import { describe, it, expect } from 'vitest';
import { isPresenterEligibleRoles, PRESENTER_ELIGIBLE_ROLES } from './tumorBoardPresenterEligibility';

describe('isPresenterEligibleRoles', () => {
  it('is true for a pathologist, fellow, or resident', () => {
    expect(isPresenterEligibleRoles(['pathologist'])).toBe(true);
    expect(isPresenterEligibleRoles(['fellow'])).toBe(true);
    expect(isPresenterEligibleRoles(['resident'])).toBe(true);
  });

  it('is true when ANY one of several roles is eligible', () => {
    expect(isPresenterEligibleRoles(['accessioner', 'resident'])).toBe(true);
  });

  it('is false for a PA — grosses specimens, does not present findings', () => {
    expect(isPresenterEligibleRoles(['pa'])).toBe(false);
  });

  it('is false for bench roles', () => {
    expect(isPresenterEligibleRoles(['accessioner'])).toBe(false);
    expect(isPresenterEligibleRoles(['histotechnologist'])).toBe(false);
    expect(isPresenterEligibleRoles(['cytotechnologist'])).toBe(false);
    expect(isPresenterEligibleRoles(['molecular-technologist'])).toBe(false);
  });

  it('is false for an empty role list', () => {
    expect(isPresenterEligibleRoles([])).toBe(false);
  });

  it('PRESENTER_ELIGIBLE_ROLES is exactly pathologist/fellow/resident', () => {
    expect(PRESENTER_ELIGIBLE_ROLES).toEqual(['pathologist', 'fellow', 'resident']);
  });
});
