// src/services/patientIdentifiers/checkDigits.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 417 (Registry Engine SRS v2.1, §5.2 and FR-004). The check-digit rule
// for every national patient identifier PathScribe knows, keyed by its
// IDENTIFIER_FORMAT_LIBRARY id. Pure: no store, no clock, no i18n; the
// result carries a reason key under nationalIdentifiers.reasons.* for the
// screen to translate.
//
// Status of each rule (the SRS asks each JCP's sign-off lead to confirm its
// rule against the official specification before the JCP is 'verified'):
//
//   confirmed against a published example in this codebase or a known
//   test value:  NHS, CHI, H&C (utils/ukPatientIdValidation.ts), BSN
//   (111222333), KVNR (A123456780), PPSN (1234567FA, 1234567T), AU IHI
//   (Luhn), BE (mod 97, with the "2" prefix for births from 2000).
//   from memory of the specification, no example to hand: NZ NHI (new
//   mod 23 and legacy mod 11), FR NIR (mod 97 with the Corsica rule),
//   IE IHI (mod 11), CA provincial (Luhn, Ontario only).
//   no check digit PathScribe may run: KR RRN (format only; digits issued
//   after October 2020 are random and PIPA restricts processing).
//
// Spaces and hyphens are stripped before checking; letters are uppercased.
// ─────────────────────────────────────────────────────────────────────────────

import type { Jurisdiction } from '@/types/systemConfig';
import type { NationalIdentifierVerification } from '@/types/patient/NationalPatientIdentifier';
import { validateNhsNumber, validateChiNumber, validateHcNumber } from '@/utils/ukPatientIdValidation';

export interface CheckDigitResult {
  status: NationalIdentifierVerification;
  /** Locale key under nationalIdentifiers.reasons (failedChecksum and unchecked only). */
  reasonKey?: string;
}

const ok = (): CheckDigitResult => ({ status: 'verified' });
const fail = (reason: string): CheckDigitResult => ({ status: 'failedChecksum', reasonKey: `nationalIdentifiers.reasons.${reason}` });
const unchecked = (reason: string): CheckDigitResult => ({ status: 'unchecked', reasonKey: `nationalIdentifiers.reasons.${reason}` });

/** Batch 424: dots are separators too. The Belgian register number is written YYMMDD-SSS.CC
 *  (its format's pattern and example); before this its dot made every correctly written one fail. */
export function normalizeNationalIdentifier(raw: string): string {
  return raw.replace(/[\s.-]/g, '').toUpperCase();
}

// ── Primitives ───────────────────────────────────────────────────────────────

/** Standard Luhn (ISO/IEC 7812): true when the whole digit string, check digit included, passes. */
export function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Letter value with I and O skipped (A=1 … H=8, J=9 … N=13, P=14 … Z=24), as the NZ NHI uses. */
function nhiLetterValue(ch: string): number {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return alphabet.indexOf(ch) + 1; // 0 when the letter is I or O
}

// ── Rules ────────────────────────────────────────────────────────────────────

function nhsLike(validator: (raw: string) => { valid: boolean; reasonKey?: string }, v: string): CheckDigitResult {
  const r = validator(v);
  if (r.valid) return ok();
  const k = r.reasonKey ?? '';
  return fail(k.includes('WrongLength') || k.includes('OutOfRange') || k.includes('InvalidDob') ? 'wrongFormat' : 'checksumMismatch');
}

/** Australia IHI: 16 digits starting 800360, Luhn over all 16. */
function auIhi(v: string): CheckDigitResult {
  if (!/^800360\d{10}$/.test(v)) return fail('wrongFormat');
  return luhnValid(v) ? ok() : fail('checksumMismatch');
}

/** New Zealand NHI. New format AAANNAX: mod 23 over characters 1–6, weights 7..2.
 *  Legacy AAANNNN: mod 11 over the same six, check digit the seventh. */
function nzNhi(v: string): CheckDigitResult {
  if (/^[A-HJ-NP-Z]{3}\d{2}[A-HJ-NP-Z]{2}$/.test(v)) {
    const sum = [7, 6, 5, 4, 3, 2].reduce((acc, w, i) => {
      const ch = v[i];
      return acc + w * (/\d/.test(ch) ? Number(ch) : nhiLetterValue(ch));
    }, 0);
    const rem = sum % 23;
    if (rem === 0) return fail('checksumMismatch'); // no letter has value 23 − 0
    const expected = 'ABCDEFGHJKLMNPQRSTUVWXYZ'[23 - rem - 1];
    return v[6] === expected ? ok() : fail('checksumMismatch');
  }
  if (/^[A-HJ-NP-Z]{3}\d{4}$/.test(v)) {
    const sum = [7, 6, 5, 4, 3, 2].reduce((acc, w, i) => {
      const ch = v[i];
      return acc + w * (/\d/.test(ch) ? Number(ch) : nhiLetterValue(ch));
    }, 0);
    const rem = sum % 11;
    if (rem === 0) return fail('checksumMismatch'); // check digit would be 11
    const check = 11 - rem;
    const expected = check === 10 ? 0 : check;
    return Number(v[6]) === expected ? ok() : fail('checksumMismatch');
  }
  return fail('wrongFormat');
}

/** Netherlands BSN: nine digits (eight left-padded), elfproef with weights 9..2 and −1. */
function nlBsn(v: string): CheckDigitResult {
  if (!/^\d{8,9}$/.test(v)) return fail('wrongFormat');
  const d = v.padStart(9, '0');
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(d[i]) * (9 - i);
  sum -= Number(d[8]);
  return sum % 11 === 0 ? ok() : fail('checksumMismatch');
}

/** Belgium national register number: YYMMDD SSS CC. CC = 97 − (YYMMDDSSS mod 97);
 *  for someone born in 2000 or later the base is prefixed with 2 first. Without the
 *  century, both rules are tried. */
function beNationalNumber(v: string): CheckDigitResult {
  if (!/^\d{11}$/.test(v)) return fail('wrongFormat');
  const base = v.slice(0, 9);
  const check = Number(v.slice(9));
  const pre2000 = 97 - (Number(base) % 97);
  const from2000 = 97 - (Number('2' + base) % 97);
  return check === pre2000 || check === from2000 ? ok() : fail('checksumMismatch');
}

/** France NIR / INS: 13 characters + 2-digit key; key = 97 − (N mod 97). Corsica:
 *  department 2A → 19 and subtract 1,000,000; 2B → 18 and subtract 2,000,000. */
function frNir(v: string): CheckDigitResult {
  if (!/^[12]\d{4}(\d{2}|2A|2B)\d{6}\d{2}$/.test(v)) return fail('wrongFormat');
  const key = Number(v.slice(13));
  let n: bigint;
  if (v.includes('2A')) n = BigInt(v.slice(0, 13).replace('2A', '19')) - 1_000_000n;
  else if (v.includes('2B')) n = BigInt(v.slice(0, 13).replace('2B', '18')) - 2_000_000n;
  else n = BigInt(v.slice(0, 13));
  const expected = 97n - (n % 97n);
  return BigInt(key) === expected ? ok() : fail('checksumMismatch');
}

/** Germany KVNR: a letter and nine digits. The letter becomes its two-digit position
 *  (A=01), giving ten digits; weights alternate 1,2 from the left, products over 9
 *  reduce to their digit sum; the total mod 10 is the check digit (the ninth digit). */
function deKvnr(v: string): CheckDigitResult {
  if (!/^[A-Z]\d{9}$/.test(v)) return fail('wrongFormat');
  const letterPos = (v.charCodeAt(0) - 64).toString().padStart(2, '0');
  const digits = letterPos + v.slice(1, 9); // 10 digits, check digit excluded
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let p = Number(digits[i]) * (i % 2 === 0 ? 1 : 2);
    if (p > 9) p = Math.floor(p / 10) + (p % 10);
    sum += p;
  }
  return sum % 10 === Number(v[9]) ? ok() : fail('checksumMismatch');
}

/** Ireland PPSN: seven digits, a check letter, an optional second letter. Weights 8..2 on
 *  the digits, 9 on the second letter's value (A=1); the total mod 23 maps to the check
 *  letter (0 = W, 1 = A … 22 = V). */
function iePpsn(v: string): CheckDigitResult {
  if (!/^\d{7}[A-Z]{1,2}$/.test(v)) return fail('wrongFormat');
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += Number(v[i]) * (8 - i);
  if (v.length === 9) sum += 9 * (v.charCodeAt(8) - 64);
  const expected = 'WABCDEFGHIJKLMNOPQRSTUV'[sum % 23];
  return v[7] === expected ? ok() : fail('checksumMismatch');
}

/** Ireland IHI: ten digits starting 8000, NHS-style mod 11 (weights 10..2). Unconfirmed. */
function ieIhi(v: string): CheckDigitResult {
  if (!/^8000\d{6}$/.test(v)) return fail('wrongFormat');
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(v[i]) * (10 - i);
  const check = 11 - (sum % 11);
  if (check === 10) return fail('checksumMismatch');
  return Number(v[9]) === (check === 11 ? 0 : check) ? ok() : fail('checksumMismatch');
}

/** Canada: Ontario's 10-digit health number is Luhn-checked. Other provinces differ
 *  and are passed as unchecked until their rule is added. */
function caPhn(v: string): CheckDigitResult {
  if (!/^\d{10}$/.test(v)) return fail('wrongFormat');
  return luhnValid(v) ? ok() : fail('checksumMismatch');
}

/** South Korea RRN: format only (YYMMDD + 7 digits). */
function krRrn(v: string): CheckDigitResult {
  if (!/^\d{6}[1-8]\d{6}$/.test(v)) return fail('wrongFormat');
  return unchecked('noCheckDigit');
}

const RULES: Record<string, (v: string) => CheckDigitResult> = {
  mrn_nhs: v => nhsLike(validateNhsNumber, v),
  mrn_chi: v => nhsLike(validateChiNumber, v),
  mrn_hc: v => nhsLike(validateHcNumber, v),
  mrn_ihi: auIhi,
  mrn_nhi: nzNhi,
  mrn_bsn: nlBsn,
  mrn_be: beNationalNumber,
  mrn_ins: frNir,
  mrn_kvnr: deKvnr,
  id_ie_ppsn: iePpsn,
  id_ie_ihi: ieIhi,
  id_ca_phn: caPhn,
  mrn_krn: krRrn,
};

/** The systems PathScribe has a rule for (format or check digit). */
export const NATIONAL_IDENTIFIER_SYSTEMS: readonly string[] = Object.keys(RULES);

/** The national identifier systems a jurisdiction's patients carry, the registry's first. */
export const NATIONAL_IDENTIFIER_SYSTEMS_BY_JURISDICTION: Readonly<Record<Jurisdiction, readonly string[]>> = {
  US: [], CA: ['id_ca_phn'],
  GB_EW: ['mrn_nhs'], GB_SCT: ['mrn_chi'], GB_NIR: ['mrn_hc'],
  IE: ['id_ie_ihi', 'id_ie_ppsn'],
  AU: ['mrn_ihi'], NZ: ['mrn_nhi'], KR: ['mrn_krn'],
  BE: ['mrn_be'], NL: ['mrn_bsn'], DE: ['mrn_kvnr'], FR: ['mrn_ins'],
  // Spain's DNI/NIE has a mod-23 letter, but no rule is wired for it yet.
  ES: [],
};

/** Run the system's rule on a raw value. An unknown system is 'unchecked'. */
export function verifyNationalIdentifier(system: string, raw: string): CheckDigitResult {
  const rule = RULES[system];
  if (!rule) return unchecked('noRule');
  const v = normalizeNationalIdentifier(raw);
  if (!v) return fail('empty');
  return rule(v);
}
