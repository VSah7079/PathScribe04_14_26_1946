import { describe, it, expect } from 'vitest';
import { resolvePatientFullDisplayName, resolvePatientNameValue, formatDisplayNameForLanguage } from './personName';
import type { Patient } from '@/types/case/Patient';

function buildPatient(overrides: Partial<Patient>): Patient {
  return { id: 'p1', ...overrides } as Patient;
}

describe('resolvePatientFullDisplayName', () => {
  it('a missing patient honestly resolves to null, not a fabricated placeholder', () => {
    expect(resolvePatientFullDisplayName(undefined)).toBeNull();
    expect(resolvePatientFullDisplayName(null)).toBeNull();
  });

  it('prefers real givenNames/familyNames when both are present', () => {
    const patient = buildPatient({ givenNames: 'David', familyNames: 'Martinez', firstName: 'Dave', lastName: 'M' });
    expect(resolvePatientFullDisplayName(patient)).toBe('David Martinez');
  });

  it('falls back to the legacy firstName/lastName bridge when givenNames/familyNames are absent', () => {
    const patient = buildPatient({ firstName: 'Grace', lastName: 'Thompson' });
    expect(resolvePatientFullDisplayName(patient)).toBe('Grace Thompson');
  });
});

describe('formatDisplayNameForLanguage (Batch 514, Korean charting convention)', () => {
  it('Korean: full name + 님 instead of a Western title; family name first for a Hangul name', () => {
    expect(formatDisplayNameForLanguage({ namePrefix: 'Mr.', givenNames: '민준', familyNames: '김' }, 'ko')).toBe('김민준 님');
    expect(formatDisplayNameForLanguage({ namePrefix: 'Ms.', givenNames: 'Grace', familyNames: 'Thompson' }, 'ko')).toBe('Grace Thompson 님');
    expect(formatDisplayNameForLanguage({ givenNames: 'Grace', familyNames: 'Thompson' }, 'ko')).toBe('Grace Thompson 님');
  });

  it('Korean: a doctor or professor is 선생님', () => {
    expect(formatDisplayNameForLanguage({ namePrefix: 'Dr.', givenNames: '서연', familyNames: '이' }, 'ko')).toBe('이서연 선생님');
    expect(formatDisplayNameForLanguage({ namePrefix: 'Dr', givenNames: 'Priya', familyNames: 'Nair' }, 'ko')).toBe('Priya Nair 선생님');
    expect(formatDisplayNameForLanguage({ namePrefix: 'Prof.', givenNames: 'Priya', familyNames: 'Nair' }, 'ko')).toBe('Priya Nair 선생님');
  });

  it('Korean: no name, no honorific', () => {
    expect(formatDisplayNameForLanguage({ namePrefix: 'Mr.', givenNames: ' ', familyNames: '' }, 'ko')).toBe('');
  });

  it('every other language keeps the stored title', () => {
    const name = { namePrefix: 'Dr.', givenNames: 'Juan Carlos', familyNames: 'García López', nameSuffix: 'Jr.' };
    for (const lng of ['en', 'fr', 'de', 'nl', 'nl-BE', 'fr-BE']) {
      expect(formatDisplayNameForLanguage(name, lng)).toBe('Dr. Juan Carlos García López Jr.');
    }
  });

  it('a patient formats in the language asked for, and the name fields resolve the same way', () => {
    const patient = buildPatient({ givenNames: 'David', familyNames: 'Martinez', namePrefix: 'Mr.' });
    expect(resolvePatientFullDisplayName(patient, 'ko')).toBe('David Martinez 님');
    expect(resolvePatientFullDisplayName(patient, 'en')).toBe('Mr. David Martinez');
    expect(resolvePatientNameValue(buildPatient({ firstName: 'Grace', lastName: 'Thompson' }))).toEqual({ givenNames: 'Grace', familyNames: 'Thompson' });
    expect(resolvePatientNameValue(null)).toBeNull();
  });
});
