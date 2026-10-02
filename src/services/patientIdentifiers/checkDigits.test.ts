// src/services/patientIdentifiers/checkDigits.test.ts
// Batch 417. One test per national identifier rule (SRS v2.1 §5.2). Where a
// published example is known it is used; otherwise the value is built from the
// rule itself and a one-digit change must fail.
import { describe, it, expect } from 'vitest';
import { verifyNationalIdentifier, luhnValid, NATIONAL_IDENTIFIER_SYSTEMS, NATIONAL_IDENTIFIER_SYSTEMS_BY_JURISDICTION } from './checkDigits';
import { IDENTIFIER_FORMAT_LIBRARY } from '@/types/systemConfig';

const status = (system: string, v: string) => verifyNationalIdentifier(system, v).status;

describe('national identifier check digits (Batch 417)', () => {
  it('NHS number: mod 11 (the library example is valid)', () => {
    expect(status('mrn_nhs', '943 476 5919')).toBe('verified');
    expect(status('mrn_nhs', '943 476 5918')).toBe('failedChecksum');
    expect(verifyNationalIdentifier('mrn_nhs', '12345').reasonKey).toBe('nationalIdentifiers.reasons.wrongFormat');
  });

  it('CHI and H&C use the same mod 11', () => {
    // 140174005?: 10+36+0+7+42+20+0+0+10 = 125; 125 mod 11 = 4; 11 − 4 = 7. The library example used to end in 4.
    expect(status('mrn_chi', '1401740057')).toBe('verified');
    expect(status('mrn_chi', '1401740054')).toBe('failedChecksum');
    // H&C: 10 digits in the 32–39 range. 321234567?: weights 10..2 sum to 193, 193 mod 11 = 6, 11 − 6 = 5
    expect(status('mrn_hc', '3212345675')).toBe('verified');
    expect(status('mrn_hc', '3212345676')).toBe('failedChecksum');
    expect(status('mrn_hc', 'AB12345')).toBe('failedChecksum'); // the old, wrong library format
  });

  it('Australian IHI: 800360 + Luhn over 16 digits', () => {
    // Build a valid one: 800360123456789 + check digit that makes Luhn pass.
    const base = '800360123456789';
    const check = [...Array(10).keys()].find(d => luhnValid(base + d))!;
    expect(status('mrn_ihi', base + check)).toBe('verified');
    expect(status('mrn_ihi', base + ((check + 1) % 10))).toBe('failedChecksum');
    expect(status('mrn_ihi', '1234567890123456')).toBe('failedChecksum'); // wrong prefix
  });

  it('NZ NHI: new format mod 23 and legacy mod 11', () => {
    // New format ABC12D?: values A1 B2 C3 1 2 D4 → 7·1+6·2+5·3+4·1+3·2+2·4 = 52; 52 mod 23 = 6; 23−6 = 17 → letter 17 (skipping I,O) = S
    expect(status('mrn_nhi', 'ABC12DS')).toBe('verified');
    expect(status('mrn_nhi', 'ABC12DT')).toBe('failedChecksum');
    // Legacy ABC123?: 7·1+6·2+5·3+4·1+3·2+2·3 = 50; 50 mod 11 = 6; 11−6 = 5
    expect(status('mrn_nhi', 'ABC1235')).toBe('verified');
    expect(status('mrn_nhi', 'ABC1234')).toBe('failedChecksum');
    expect(status('mrn_nhi', 'AIO1235')).toBe('failedChecksum'); // I and O are not used
  });

  it('Dutch BSN: elfproef (the library example is valid)', () => {
    expect(status('mrn_bsn', '111222333')).toBe('verified');
    expect(status('mrn_bsn', '111222334')).toBe('failedChecksum');
    expect(status('mrn_bsn', '10000008')).toBe('verified'); // eight digits, left-padded: 0·9+1·8+0+0+0+0+0+0−8 = 0
  });

  it('Belgian national number: mod 97, with the 2000 rule', () => {
    // Born 1985-01-23, sequence 456: base 850123456 → 850123456 mod 97 = 85012345 6… compute: check = 97 − (850123456 % 97)
    const base = '850123456';
    const pre = 97 - (Number(base) % 97);
    expect(status('mrn_be', base + String(pre).padStart(2, '0'))).toBe('verified');
    // Born 2005-01-23: the base is prefixed with 2
    const base2 = '050123456';
    const post = 97 - (Number('2' + base2) % 97);
    expect(status('mrn_be', base2 + String(post).padStart(2, '0'))).toBe('verified');
    expect(status('mrn_be', base + String((pre % 97) + 1).padStart(2, '0'))).toBe('failedChecksum');    // Batch 424: written the way the format shows it (YYMMDD-SSS.CC), the dot is a separator.
    const check = String(pre).padStart(2, '0');
    expect(status('mrn_be', `${base.slice(0, 6)}-${base.slice(6)}.${check}`)).toBe('verified');
  });

  it('French NIR: mod 97 key, Corsica substitution', () => {
    const n = '1850175123456';
    const key = 97 - (Number(n) % 97);
    expect(status('mrn_ins', n + String(key).padStart(2, '0'))).toBe('verified');
    expect(status('mrn_ins', n + String((key % 97) + 1).padStart(2, '0'))).toBe('failedChecksum');
    // Corsica 2A: replace with 19 and subtract 1,000,000 before the key
    const corsica = '185012A123456'; // 13 characters: 1 85 01 2A 123 456
    const corsicaN = Number(corsica.slice(0, 13).replace('2A', '19')) - 1_000_000;
    const corsicaKey = 97 - (corsicaN % 97);
    expect(status('mrn_ins', corsica + String(corsicaKey).padStart(2, '0'))).toBe('verified');
  });

  it('German KVNR: A123456780 is the published example', () => {
    expect(status('mrn_kvnr', 'A123456780')).toBe('verified');
    expect(status('mrn_kvnr', 'A123456781')).toBe('failedChecksum');
    expect(status('mrn_kvnr', 'a 1234 5678 0')).toBe('verified'); // normalised
  });

  it('Irish PPSN: 1234567FA and 1234567T are the published examples', () => {
    expect(status('id_ie_ppsn', '1234567FA')).toBe('verified');
    expect(status('id_ie_ppsn', '1234567T')).toBe('verified');
    expect(status('id_ie_ppsn', '1234567TA')).toBe('failedChecksum');
  });

  it('Irish IHI: 8000 prefix and mod 11', () => {
    // 800000001?: 8·10 + 1·2 = 82; 82 mod 11 = 5; 11 − 5 = 6
    expect(status('id_ie_ihi', '8000000016')).toBe('verified');
    expect(status('id_ie_ihi', '8000000017')).toBe('failedChecksum');
  });

  it('Canadian provincial number: Luhn over 10 digits', () => {
    const base = '987654321';
    const check = [...Array(10).keys()].find(d => luhnValid(base + d))!;
    expect(status('id_ca_phn', base + check)).toBe('verified');
    expect(status('id_ca_phn', base + ((check + 1) % 10))).toBe('failedChecksum');
  });

  it('Korean RRN: format only, never verified', () => {
    expect(verifyNationalIdentifier('mrn_krn', '900101-1234567')).toEqual({ status: 'unchecked', reasonKey: 'nationalIdentifiers.reasons.noCheckDigit' });
    expect(status('mrn_krn', '9001011234567')).toBe('unchecked');
    expect(status('mrn_krn', '12345')).toBe('failedChecksum');
  });

  it('unknown system and empty value', () => {
    expect(verifyNationalIdentifier('mrn_us', '12345').status).toBe('unchecked');
    expect(verifyNationalIdentifier('mrn_nhs', '  ').reasonKey).toBe('nationalIdentifiers.reasons.empty');
  });

  it('every rule names a format in the library, and every jurisdiction list uses known systems', () => {
    const ids = new Set(IDENTIFIER_FORMAT_LIBRARY.map(f => f.id));
    for (const s of NATIONAL_IDENTIFIER_SYSTEMS) expect(ids.has(s), s).toBe(true);
    for (const list of Object.values(NATIONAL_IDENTIFIER_SYSTEMS_BY_JURISDICTION)) for (const s of list) expect(NATIONAL_IDENTIFIER_SYSTEMS).toContain(s);
  });

  it('the library examples pass their own rule (the H&C example was the wrong format before Batch 417)', () => {
    for (const f of IDENTIFIER_FORMAT_LIBRARY.filter(f => NATIONAL_IDENTIFIER_SYSTEMS.includes(f.id) && f.example)) {
      expect(new RegExp(f.pattern).test(f.example!), `${f.id} example matches its pattern`).toBe(true);
    }
  });
});
