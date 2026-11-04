// Batch 620 (part C, PS-800): the UK destination: validation and enterprise / facility resolution.
import { describe, it, expect } from 'vitest';
import { DEFAULT_COSD_DESTINATION, resolveCosdDestination, validateDestination, type CosdDestination } from './cosdDestination';

const entry = (facilityId: string | null, over: Partial<CosdDestination> = {}): CosdDestination => ({
  id: `d-${facilityId ?? 'ent'}`, facilityId, transport: 'sftp', correctionWorkingDays: 7, nonWorkingDates: ['2026-12-25'], updatedAt: '', ...over,
});

describe('validateDestination', () => {
  it('accepts the default', () => { expect(validateDestination(DEFAULT_COSD_DESTINATION)).toEqual([]); });
  it('names every problem', () => {
    expect(validateDestination({ transport: 'carrierPigeon' as never, correctionWorkingDays: 0, nonWorkingDates: ['25/12/2026'] })).toEqual(['transportInvalid', 'daysInvalid', 'dateInvalid']);
  });
  it('refuses a fraction, NaN and more than 30 days', () => {
    for (const days of [2.5, Number.NaN, 31]) expect(validateDestination({ ...DEFAULT_COSD_DESTINATION, correctionWorkingDays: days })).toEqual(['daysInvalid']);
  });
});

describe('resolveCosdDestination', () => {
  it('defaults to the UK 5 working days over a secure API when nothing is stored', () => {
    expect(resolveCosdDestination([], 'fac-a')).toEqual({ transport: 'restMtls', correctionWorkingDays: 5, nonWorkingDates: [], source: 'default' });
  });
  it('a facility with no entry follows the enterprise', () => {
    expect(resolveCosdDestination([entry(null)], 'fac-a')).toMatchObject({ transport: 'sftp', correctionWorkingDays: 7, source: 'enterprise' });
  });
  it('a facility entry wins over the enterprise', () => {
    expect(resolveCosdDestination([entry(null), entry('fac-a', { correctionWorkingDays: 3 })], 'fac-a')).toMatchObject({ correctionWorkingDays: 3, source: 'facility' });
  });
  it('with no facility it is the enterprise one', () => {
    expect(resolveCosdDestination([entry('fac-a'), entry(null)], undefined).source).toBe('enterprise');
  });
  it('returns a copy of the dates', () => {
    const stored = entry(null);
    resolveCosdDestination([stored], null).nonWorkingDates.push('2027-01-01');
    expect(stored.nonWorkingDates).toEqual(['2026-12-25']);
  });
});
