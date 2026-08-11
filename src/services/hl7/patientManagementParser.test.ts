// src/services/hl7/patientManagementParser.test.ts
import { describe, it, expect } from 'vitest';
import { parsePatientManagementMessage } from './patientManagementParser';

// Real, precisely verified fixtures - every field index confirmed via
// direct, programmatic counting before writing any assertion, same
// discipline established while building adtParser.test.ts.
function buildA40(): string {
  return [
    'MSH|^~\\&|EPIC|EPICADT|SMS|SMSADT|202601150800|CHARRIS|ADT^A40|MSG001|P|2.5',
    'EVN||202601150800',
    'PID|1||NEWMRN^^^NEW_AUTH^MR||SMITH^JOHN||19850601|M',
    'MRG|OLDMRN^^^OLD_AUTH^MR||||||JONES^JOHNNY',
  ].join('\r');
}

function buildA24(): string {
  return [
    'MSH|^~\\&|EPIC|EPICADT|SMS|SMSADT|202601150800|CHARRIS|ADT^A24|MSG002|P|2.5',
    'EVN||202601150800',
    'PID|1||NEWMRN2^^^NEW_AUTH^MR||SMITH^JOHN||19850601|M',
    'MRG|OLDMRN2^^^OLD_AUTH^MR||||||JONES^JOHNNY',
  ].join('\r');
}

function buildA47(): string {
  return [
    'MSH|^~\\&|EPIC|EPICADT|SMS|SMSADT|202601150800|CHARRIS|ADT^A47|MSG003|P|2.5',
    'EVN||202601150800',
    'PID|1||CORRECTEDMRN^^^NEW_AUTH^MR||SMITH^JOHN||19850601|M',
    'MRG|WRONGMRN^^^OLD_AUTH^MR',
  ].join('\r');
}

describe('parsePatientManagementMessage — real fix, the actual point of Phase 2: A40/A24/A47 field extraction, verified against the real HL7 standard, including a real correction to the original spec\'s description of A47', () => {
  it('correctly identifies the real event type from MSH-9, for all three real event types', () => {
    expect(parsePatientManagementMessage(buildA40()).eventType).toBe('A40');
    expect(parsePatientManagementMessage(buildA24()).eventType).toBe('A24');
    expect(parsePatientManagementMessage(buildA47()).eventType).toBe('A47');
  });

  it('correctly extracts the real target identity from PID (the surviving/new identity)', () => {
    const result = parsePatientManagementMessage(buildA40());
    expect(result.target.identifierValue).toBe('NEWMRN');
    expect(result.target.assigningAuthority).toBe('NEW_AUTH');
    expect(result.target.firstName).toBe('JOHN');
    expect(result.target.lastName).toBe('SMITH');
  });

  it('correctly extracts the real source identity from MRG (the prior/old identity), using the same real CX component structure as PID-3', () => {
    const result = parsePatientManagementMessage(buildA40());
    expect(result.source.identifierValue).toBe('OLDMRN');
    expect(result.source.assigningAuthority).toBe('OLD_AUTH');
  });

  it('correctly extracts the real MRG-7 prior patient name, informational only', () => {
    const result = parsePatientManagementMessage(buildA40());
    expect(result.source.lastName).toBe('JONES');
    expect(result.source.firstName).toBe('JOHNNY');
  });

  it('a real message claiming to be A40/A24/A47 without a genuine MRG segment throws, rather than guessing', () => {
    const noMrg = [
      'MSH|^~\\&|EPIC|EPICADT|SMS|SMSADT|202601150800|CHARRIS|ADT^A40|MSG004|P|2.5',
      'PID|1||MRN1^^^X^MR||DOE^JANE',
    ].join('\r');
    expect(() => parsePatientManagementMessage(noMrg)).toThrow(/MRG/);
  });

  it('a real, unhandled event type throws, rather than silently returning a half-populated result', () => {
    const a41 = [
      'MSH|^~\\&|EPIC|EPICADT|SMS|SMSADT|202601150800|CHARRIS|ADT^A41|MSG005|P|2.5',
      'PID|1||MRN1^^^X^MR||DOE^JANE',
      'MRG|MRN2^^^Y^MR',
    ].join('\r');
    expect(() => parsePatientManagementMessage(a41)).toThrow(/A41/);
  });

  it('an A47 (real, verified "change patient identifier" semantics) parses PID as the corrected identifier and MRG as the one being replaced - same real structure as A40/A24, different real meaning applied by the caller', () => {
    const result = parsePatientManagementMessage(buildA47());
    expect(result.target.identifierValue).toBe('CORRECTEDMRN');
    expect(result.source.identifierValue).toBe('WRONGMRN');
  });
});
