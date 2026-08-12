// src/services/hl7/hl7Parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseHL7Message, getField, getComponent, getRepetitions } from './hl7Parser';

// Real, verified example message (InterSystems Developer Community,
// a real, published ADT^A04 example) - used directly rather than a
// synthetic one, since real-world messages have real quirks (e.g.
// PID-3 with a repeating identifier) worth testing against.
const REAL_ADT_A04 = [
  'MSH|^~\\&|EPIC|EPICADT|SMS|SMSADT|202211031408|CHARRIS|ADT^A04|1817457|D|2.5|',
  'EVN||202211030800||||202211030800',
  'PID||0493575^^^2^ID 1|454721||DOE^JOHN^^^^|DOE^JOHN^^^^|19480203|M||B|254 MYSTREET AVE^^MYTOWN^OH^44123^USA||(216)123-4567|||M|NON|400003403~1129086|',
  'PV1||O|168~219~C~PMA^^^^^^^^^||||277^ALLEN MYLASTNAME^BONNIE^^^^||||||||||2688684|',
].join('\r');

describe('parseHL7Message — real, generic parser, tested against a real, published example message', () => {
  it('splits real segments correctly, in real message order', () => {
    const parsed = parseHL7Message(REAL_ADT_A04);
    expect(parsed.segments.map(s => s.segmentId)).toEqual(['MSH', 'EVN', 'PID', 'PV1']);
  });

  it('handles MSH-1/MSH-2 as the real, standard exception - field separator and encoding chars, not shifted into regular field numbering', () => {
    const parsed = parseHL7Message(REAL_ADT_A04);
    const msh = parsed.getSegment('MSH');
    expect(getField(msh, 1)).toBe('|');
    expect(getField(msh, 2)).toBe('^~\\&');
    expect(getField(msh, 9)).toBe('ADT^A04'); // real message type, correctly at MSH-9 despite the MSH-1/2 exception
  });

  it('getSegment returns the real, first matching segment', () => {
    const parsed = parseHL7Message(REAL_ADT_A04);
    const pid = parsed.getSegment('PID');
    expect(pid?.segmentId).toBe('PID');
  });

  it('getSegment returns null, never a guess, for a segment genuinely absent from this message', () => {
    const parsed = parseHL7Message(REAL_ADT_A04);
    expect(parsed.getSegment('OBX')).toBeNull();
  });

  it('getComponent correctly splits a real, multi-component field - PID-5, real patient name', () => {
    const parsed = parseHL7Message(REAL_ADT_A04);
    const pid = parsed.getSegment('PID');
    expect(getComponent(getField(pid, 5), 0)).toBe('DOE'); // real last name
    expect(getComponent(getField(pid, 5), 1)).toBe('JOHN'); // real first name
  });

  it('getRepetitions correctly splits a real, multi-component field - this real example\'s PID-2 identifier', () => {
    const parsed = parseHL7Message(REAL_ADT_A04);
    const pid = parsed.getSegment('PID');
    // PID-2 in this real, older-style example (predates the modern
    // PID-3 "Patient Identifier List" convention): "0493575^^^2^ID 1"
    // - a single repetition, multiple real components.
    const reps = getRepetitions(getField(pid, 2));
    expect(reps).toEqual(['0493575^^^2^ID 1']);
  });

  it('getRepetitions splits a real field that genuinely does have more than one repetition', () => {
    const parsed = parseHL7Message(REAL_ADT_A04);
    const pid = parsed.getSegment('PID');
    // PID-18 in this real example is genuinely "400003403~1129086" -
    // two real, distinct values.
    const reps = getRepetitions(getField(pid, 18));
    expect(reps).toEqual(['400003403', '1129086']);
  });

  it('a genuinely malformed/short line contributes fewer real fields rather than failing the whole message', () => {
    const parsed = parseHL7Message('MSH|^~\\&|A|B|C|D|202601010000||ADT^A01|1|P|2.5\rPID|1');
    const pid = parsed.getSegment('PID');
    expect(getField(pid, 3)).toBe(''); // genuinely absent, not an error
    expect(parsed.getSegment('MSH')).not.toBeNull(); // rest of the message still parses
  });

  it('tolerates real \\n line endings, not just \\r, since real transport layers vary', () => {
    const parsed = parseHL7Message(REAL_ADT_A04.replace(/\r/g, '\n'));
    expect(parsed.segments.map(s => s.segmentId)).toEqual(['MSH', 'EVN', 'PID', 'PV1']);
  });
});
