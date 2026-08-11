// src/services/hl7/hl7Parser.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, generic HL7 v2 parser — the reverse of segmentBuilders.ts's
// existing buildX() functions. Everything built in this app before
// this file has been OUTBOUND (ormBuilder.ts, dftBuilder.ts): take
// real, structured PathScribe data and serialize it into HL7 text.
// This is the first real INBOUND direction — take real HL7 text
// received from an external system and parse it into structured data.
//
// Deliberately generic and message-type-agnostic at this layer - a
// segment/field/component/repetition tokenizer, not ADT-specific
// logic. Real ADT-specific field extraction (which fields matter for
// A01/A04/A08) lives in adtParser.ts, built on top of this.
//
// Uses the same real separator constants types.ts already established
// for outbound building (HL7_FIELD_SEP, HL7_ENCODING_CHARS) - a parser
// and its matching builder should never disagree about what the
// delimiters are.
// ─────────────────────────────────────────────────────────────────────────────

import { HL7_FIELD_SEP } from './types';

/** Real, standard HL7 encoding characters, per HL7_ENCODING_CHARS
 *  ('^~\\&') - component and repetition separators, the two this
 *  parser's actual scope (ADT field extraction) needs. Sub-component
 *  splitting isn't needed by anything built here yet - not declared
 *  speculatively. */
const COMPONENT_SEP = '^';
const REPETITION_SEP = '~';

export interface ParsedHL7Segment {
  /** The real segment id (e.g. 'MSH', 'PID', 'PV1') - always field
   *  index 0 by HL7 convention, pulled out here so callers don't have
   *  to remember that MSH is the one real exception (its own field
   *  separator is embedded as MSH-1, shifting every other field's
   *  index by one - handled in parseHL7Message below). */
  segmentId: string;
  /** Raw field values, 1-indexed to match real HL7 field numbering
   *  (fields[1] is field 1, not field 2) - fields[0] is always the
   *  segment id itself, kept for a caller that wants the raw row. */
  fields: string[];
}

export interface ParsedHL7Message {
  segments: ParsedHL7Segment[];
  /** Real, direct lookup - the first segment with this id, or null if
   *  none exists. Most segments appear once per message (MSH, EVN,
   *  PID); repeating segments (like multiple NK1s) need getAllSegments
   *  instead. */
  getSegment(segmentId: string): ParsedHL7Segment | null;
  getAllSegments(segmentId: string): ParsedHL7Segment[];
}

/** Real, honest field access - never throws on a missing/short field,
 *  returns an empty string instead (a genuinely absent optional field
 *  is extremely common in real HL7 traffic, not an error condition). */
export function getField(segment: ParsedHL7Segment | null, fieldIndex: number): string {
  return segment?.fields[fieldIndex] ?? '';
}

/** Splits a single field's real, raw text into its real components
 *  (the ^ separator) - e.g. PID-5 "GARCIA^MARIA^L" into
 *  ['GARCIA', 'MARIA', 'L']. componentIndex is 0-based here
 *  (component 1 is index 0), unlike field numbering, matching how
 *  most real HL7 references describe "the Nth component." */
export function getComponent(fieldValue: string, componentIndex: number): string {
  return fieldValue.split(COMPONENT_SEP)[componentIndex] ?? '';
}

/** Splits a real, repeating field into its real individual repetitions
 *  (the ~ separator) - e.g. a PID-3 with more than one real identifier
 *  for the same patient (different assigning authorities). Returns a
 *  single-element array for a genuinely non-repeating field, never an
 *  empty array for a real, present value. */
export function getRepetitions(fieldValue: string): string[] {
  if (!fieldValue) return [];
  return fieldValue.split(REPETITION_SEP);
}

/** Real, generic parse - splits raw HL7 text into real segments and
 *  fields. Never throws on malformed input; a genuinely unparseable
 *  segment just contributes fewer real fields, rather than failing
 *  the whole message over one bad line - real-world HL7 traffic has
 *  real, minor variance worth tolerating at this layer, with any
 *  message-level validation (e.g. "is MSH even present") left to the
 *  real, specific caller (adtParser.ts) that knows what it actually
 *  needs. */
export function parseHL7Message(raw: string): ParsedHL7Message {
  // Real HL7 uses \r as the real segment separator; tolerates \n and
  // \r\n too, since plenty of real-world transport/logging layers
  // normalize line endings before this ever reaches a parser.
  const lines = raw.split(/\r\n|\r|\n/).map(l => l.trim()).filter(l => l.length > 0);

  const segments: ParsedHL7Segment[] = lines.map(line => {
    const segmentId = line.slice(0, 3);
    if (segmentId === 'MSH') {
      // Real, standard HL7 exception: MSH-1 IS the field separator
      // character itself, and MSH-2 is the encoding characters string
      // - splitting naively on '|' would swallow MSH-1 into the
      // segment id and shift every subsequent field by one. Handled
      // explicitly here so callers never have to think about it.
      const rest = line.slice(4); // after "MSH|"
      const fieldSepEnd = rest.indexOf(HL7_FIELD_SEP);
      const encodingChars = fieldSepEnd === -1 ? rest : rest.slice(0, fieldSepEnd);
      const remainder = fieldSepEnd === -1 ? '' : rest.slice(fieldSepEnd + 1);
      const restFields = remainder.length > 0 ? remainder.split(HL7_FIELD_SEP) : [];
      return { segmentId, fields: ['MSH', HL7_FIELD_SEP, encodingChars, ...restFields] };
    }
    const fields = line.split(HL7_FIELD_SEP);
    return { segmentId, fields };
  });

  return {
    segments,
    getSegment(segmentId: string) {
      return segments.find(s => s.segmentId === segmentId) ?? null;
    },
    getAllSegments(segmentId: string) {
      return segments.filter(s => s.segmentId === segmentId);
    },
  };
}
