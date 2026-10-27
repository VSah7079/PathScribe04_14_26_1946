import { describe, it, expect } from 'vitest';
import { consultPatientView, maskNamePart, maskDateOfBirth, birthYearOf, formatConsultDateOfBirth } from './consultIdentityMask';

describe('consult identity mask (Batch 669, access-11)', () => {
  it('keeps the first letter of each word and masks the rest', () => {
    expect(maskNamePart('John')).toBe('J***');
    expect(maskNamePart('Mary Ann')).toBe('M*** A**');
    expect(maskNamePart('Jean-Luc')).toBe('J*******');
    expect(maskNamePart('  ')).toBe('');
    expect(maskNamePart(undefined)).toBe('');
  });
  it('keeps only the year of a date of birth, whichever way it is written', () => {
    expect(maskDateOfBirth('1980-04-23')).toBe('**-***-1980');
    expect(maskDateOfBirth('23/04/1980')).toBe('**-***-1980');
    expect(maskDateOfBirth('04/23/1980')).toBe('**-***-1980');
    expect(birthYearOf('unknown')).toBeNull();
    expect(maskDateOfBirth(undefined)).toBeUndefined();
  });
  it('the masked projection never contains the surname, the first name or the full date', () => {
    const v = consultPatientView({ firstName: 'John', lastName: 'Smith', dateOfBirth: '1980-04-23' }, undefined);
    expect(v).toEqual({ identity: 'masked', maskedName: 'J*** S****', birthYearMasked: '**-***-1980' });
    const wire = JSON.stringify(v);
    for (const secret of ['Smith', 'John', 'ohn', 'mith', '04-23', '1980-04']) expect(wire).not.toContain(secret);
    expect(consultPatientView({ firstName: 'John', lastName: 'Smith' }, false)).toEqual({ identity: 'masked', maskedName: 'J*** S****' });
  });
  it('only an explicit true shows the full identity', () => {
    const p = { firstName: 'John', lastName: 'Smith', dateOfBirth: '1980-04-23' };
    expect(consultPatientView(p, true)).toEqual({ identity: 'full', lastName: 'Smith', firstName: 'John', dateOfBirth: '23-APR-1980' });
    expect(consultPatientView(p, 'yes' as never).identity).toBe('masked');
  });
  it('a missing patient record gives an empty masked identity', () => {
    expect(consultPatientView(undefined, undefined)).toEqual({ identity: 'masked', maskedName: '' });
  });
});

describe('fixed date-of-birth format (Batch 669, reviewer ruling)', () => {
  it('writes DD-MMM-YYYY with an English capital month, whatever the language', () => {
    expect(formatConsultDateOfBirth('1980-10-24')).toBe('24-OCT-1980');
    expect(formatConsultDateOfBirth('1958-11-22T07:00:00.000Z')).toBe('22-NOV-1958');
    expect(formatConsultDateOfBirth('2001-01-05')).toBe('05-JAN-2001');
    expect(formatConsultDateOfBirth(undefined)).toBeUndefined();
  });
  it('does not guess a date that is not year-first', () => {
    expect(formatConsultDateOfBirth('03/04/1980')).toBe('03/04/1980');
    expect(formatConsultDateOfBirth('1980-13-40')).toBe('1980-13-40');
  });
  it('is not changed by the interface language or the time zone of the machine', () => {
    const before = process.env.TZ;
    for (const tz of ['Pacific/Kiritimati', 'America/Los_Angeles']) { process.env.TZ = tz; expect(formatConsultDateOfBirth('1980-10-24T00:00:00.000Z')).toBe('24-OCT-1980'); }
    process.env.TZ = before;
  });
  it('the revealed identity carries the fixed form and the masked one the year in the same style', () => {
    const p = { firstName: 'Ana', lastName: 'Ruiz', dateOfBirth: '1980-10-24' };
    expect(consultPatientView(p, true)).toMatchObject({ identity: 'full', dateOfBirth: '24-OCT-1980' });
    expect(consultPatientView(p, false)).toMatchObject({ identity: 'masked', birthYearMasked: '**-***-1980' });
  });
});
