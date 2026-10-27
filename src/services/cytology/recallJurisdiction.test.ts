// Batch 631: the recall rules follow the performing lab's jurisdiction, not the ordering facility's.
import { describe, it, expect } from 'vitest';
import { effectiveRecallJurisdiction, performingLabJurisdictionOf } from './recallJurisdiction';

const F = (id: string, jurisdiction: any, over: any = {}) => ({ id, jurisdiction, roles: [] as string[], performingLabFacilityId: undefined as string | undefined, ...over });
const FACILITIES = [
  F('clinic-us', 'US', { performingLabFacilityId: 'lab-syd' }),
  F('lab-syd', 'AU', { roles: ['performing_lab'] }),
  F('lab-akl', 'NZ', { roles: ['performing_lab'] }),
  F('clinic-nz', 'NZ', { performingLabFacilityId: 'lab-us' }),
  F('lab-us', 'US', { roles: ['performing_lab'] }),
  F('clinic-nowhere', 'AU'),
];

describe('performingLabJurisdictionOf', () => {
  it('a US clinic whose specimen is performed in Sydney gets Australia\'s rules', () => {
    expect(performingLabJurisdictionOf('clinic-us', FACILITIES)).toBe('AU');
  });
  it('a New Zealand clinic whose specimen is performed in a US lab does not get New Zealand\'s rules', () => {
    expect(performingLabJurisdictionOf('clinic-nz', FACILITIES)).toBe('US');
  });
  it('a facility that is itself a performing lab uses its own jurisdiction', () => {
    expect(performingLabJurisdictionOf('lab-akl', FACILITIES)).toBe('NZ');
  });
  it('no performing lab, an unknown facility, or no facility gives none, never the ordering facility\'s own jurisdiction', () => {
    expect(performingLabJurisdictionOf('clinic-nowhere', FACILITIES)).toBeUndefined();
    expect(performingLabJurisdictionOf('missing', FACILITIES)).toBeUndefined();
    expect(performingLabJurisdictionOf(undefined, FACILITIES)).toBeUndefined();
  });
});

describe('effectiveRecallJurisdiction', () => {
  it('the performing lab wins; otherwise the institution-wide setting', () => {
    expect(effectiveRecallJurisdiction('AU', 'US')).toBe('AU');
    expect(effectiveRecallJurisdiction(undefined, 'NZ')).toBe('NZ');
    expect(effectiveRecallJurisdiction(undefined, undefined)).toBeUndefined();
  });
});
