// Batch 620 (part C, PS-800): the UK destination editor's draft and back.
import { describe, it, expect } from 'vitest';
import { draftFromSettings, parseList, toInput } from './cosdDestinationForm';

describe('cosdDestinationForm', () => {
  it('starts from the default when nothing is stored, and from the stored settings otherwise', () => {
    expect(draftFromSettings(null, null)).toEqual({ facilityId: null, transport: 'restMtls', daysText: '5', datesText: '' });
    expect(draftFromSettings({ transport: 'sftp', correctionWorkingDays: 7, nonWorkingDates: ['2026-12-25', '2026-12-26'] }, 'fac-a'))
      .toEqual({ facilityId: 'fac-a', transport: 'sftp', daysText: '7', datesText: '2026-12-25, 2026-12-26' });
  });
  it('parses the dates box into a sorted, unique list', () => {
    expect(parseList('2026-12-26, 2026-12-25;2026-12-25')).toEqual(['2026-12-25', '2026-12-26']);
  });
  it('turns the draft into the service input; an empty or text days box becomes NaN', () => {
    expect(toInput({ facilityId: 'fac-a', transport: 'sftp', daysText: ' 6 ', datesText: '2026-12-25' }))
      .toEqual({ facilityId: 'fac-a', transport: 'sftp', correctionWorkingDays: 6, nonWorkingDates: ['2026-12-25'] });
    expect(Number.isNaN(toInput({ facilityId: null, transport: 'sftp', daysText: '', datesText: '' }).correctionWorkingDays)).toBe(true);
    expect(Number.isNaN(toInput({ facilityId: null, transport: 'sftp', daysText: 'five', datesText: '' }).correctionWorkingDays)).toBe(true);
  });
});
