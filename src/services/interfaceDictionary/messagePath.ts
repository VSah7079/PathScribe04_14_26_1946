// src/services/interfaceDictionary/messagePath.ts
// ─────────────────────────────────────────────────
// Batch 612: how a mapping points at one value in a vendor message. Pure.
//
// HL7 v2 paths   SEG[n]-F(r).C.S
//     SEG  segment id: three characters. A Z-segment (ZAB, ZPA ...) is a vendor's own segment.
//     [n]  which occurrence of the segment, from 1 (default 1)
//     -F   field number, from 1 (MSH-1 is the field separator, as in the standard)
//     (r)  repetition of a repeating field, from 1 (default 1)
//     .C   component, from 1       .S   subcomponent, from 1
//     Examples: ZAB-3   OBX[2]-5.1   PID-3(2).1   ZLT-4.2.1
//   The standard delimiters are assumed: | ^ ~ \ &  (and the escapes \F\ \S\ \T\ \R\ \E\).
//
// JSON and FHIR paths   a.b[0].c   a.items[code=lot].value   Observation.component[0].valueString
//     [n]            array element, from 0
//     [key=value]    the first array element whose key (dotted, e.g. code.coding) equals value
//     An array reached without a selector means its first element.
//     FHIR: the first step is the resource type and must match the message's resourceType.
//
// A path that ends on an object or array is not a value and is reported as such.
// ─────────────────────────────────────────────────
import { parseHL7Message, type ParsedHL7Message } from '../hl7/hl7Parser';
import type { VendorMessageFormat } from './interfaceDictionaryTypes';

export interface Hl7Path {
  kind: 'hl7';
  segment: string;
  occurrence: number;
  field: number;
  repetition: number;
  component?: number;
  subcomponent?: number;
}

export type JsonSelector = { index: number } | { where: string; equals: string };
export interface JsonStep { key: string; selectors: JsonSelector[] }
export interface JsonPath { kind: 'json'; steps: JsonStep[]; resourceType?: string }

export type SourcePath = Hl7Path | JsonPath;
export type PathParseResult = { ok: true; path: SourcePath } | { ok: false; reason: 'EMPTY' | 'BAD_SYNTAX' };

const HL7_PATH = /^([A-Z][A-Z0-9]{2})(?:\[(\d+)\])?-(\d+)(?:\((\d+)\))?(?:\.(\d+)(?:\.(\d+))?)?$/;
const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Whether an HL7 segment id is a vendor's own (Z) segment. */
export function isZSegment(segment: string): boolean { return /^Z[A-Z0-9]{2}$/.test(segment); }

function parseHl7Path(text: string): PathParseResult {
  const m = HL7_PATH.exec(text);
  if (!m) return { ok: false, reason: 'BAD_SYNTAX' };
  const num = (s: string | undefined): number | undefined => (s === undefined ? undefined : Number(s));
  const occurrence = num(m[2]) ?? 1; const field = Number(m[3]); const repetition = num(m[4]) ?? 1;
  if (occurrence < 1 || field < 1 || repetition < 1) return { ok: false, reason: 'BAD_SYNTAX' };
  const component = num(m[5]); const subcomponent = num(m[6]);
  if ((component !== undefined && component < 1) || (subcomponent !== undefined && subcomponent < 1)) return { ok: false, reason: 'BAD_SYNTAX' };
  return { ok: true, path: { kind: 'hl7', segment: m[1], occurrence, field, repetition, component, subcomponent } };
}

/** Splits `a.b[0].c` on dots that are outside square brackets. */
function splitSteps(text: string): string[] | null {
  const parts: string[] = []; let depth = 0; let cur = '';
  for (const ch of text) {
    if (ch === '[') depth += 1;
    if (ch === ']') { depth -= 1; if (depth < 0) return null; }
    if (ch === '.' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (depth !== 0) return null;
  parts.push(cur);
  return parts;
}

function parseStep(text: string): JsonStep | null {
  const first = text.indexOf('[');
  const key = first < 0 ? text : text.slice(0, first);
  if (!KEY.test(key)) return null;
  const selectors: JsonSelector[] = [];
  let rest = first < 0 ? '' : text.slice(first);
  while (rest) {
    const m = /^\[([^\]]*)\]/.exec(rest);
    if (!m) return null;
    const body = m[1];
    if (/^\d+$/.test(body)) selectors.push({ index: Number(body) });
    else {
      const eq = body.indexOf('=');
      const where = eq < 0 ? '' : body.slice(0, eq);
      const equals = eq < 0 ? '' : body.slice(eq + 1).replace(/^"(.*)"$/, '$1');
      if (!where.split('.').every(k => KEY.test(k)) || !equals) return null;
      selectors.push({ where, equals });
    }
    rest = rest.slice(m[0].length);
  }
  return { key, selectors };
}

function parseJsonPath(format: 'json' | 'fhir', text: string): PathParseResult {
  const parts = splitSteps(text);
  if (!parts) return { ok: false, reason: 'BAD_SYNTAX' };
  const steps: JsonStep[] = [];
  for (const p of parts) { const s = parseStep(p); if (!s) return { ok: false, reason: 'BAD_SYNTAX' }; steps.push(s); }
  if (format === 'fhir') {
    const head = steps[0];
    if (!/^[A-Z][A-Za-z]+$/.test(head.key) || head.selectors.length) return { ok: false, reason: 'BAD_SYNTAX' };
    if (steps.length < 2) return { ok: false, reason: 'BAD_SYNTAX' };
    return { ok: true, path: { kind: 'json', steps: steps.slice(1), resourceType: head.key } };
  }
  return { ok: true, path: { kind: 'json', steps } };
}

/** Reads a path as written by staff. Never throws. */
export function parseSourcePath(format: VendorMessageFormat, raw: string): PathParseResult {
  const text = (raw ?? '').trim();
  if (!text) return { ok: false, reason: 'EMPTY' };
  return format === 'hl7v2' ? parseHl7Path(text) : parseJsonPath(format, text);
}

// ── Messages ────────────────────────────────────────────────────────────────

export type VendorMessage =
  | { format: 'hl7v2'; hl7: ParsedHL7Message }
  | { format: 'json' | 'fhir'; root: Record<string, unknown> };

export type MessageParseResult = { ok: true; message: VendorMessage } | { ok: false; reason: 'EMPTY' | 'BAD_MESSAGE' };

/** Reads a pasted or received message. Never throws. */
export function parseVendorMessage(format: VendorMessageFormat, raw: string): MessageParseResult {
  const text = (raw ?? '').trim();
  if (!text) return { ok: false, reason: 'EMPTY' };
  if (format === 'hl7v2') {
    if (!/^[A-Z][A-Z0-9]{2}\|/.test(text)) return { ok: false, reason: 'BAD_MESSAGE' };
    return { ok: true, message: { format, hl7: parseHL7Message(text) } };
  }
  let root: unknown;
  try { root = JSON.parse(text); } catch { return { ok: false, reason: 'BAD_MESSAGE' }; }
  if (!root || typeof root !== 'object' || Array.isArray(root)) return { ok: false, reason: 'BAD_MESSAGE' };
  if (format === 'fhir' && typeof (root as Record<string, unknown>).resourceType !== 'string') return { ok: false, reason: 'BAD_MESSAGE' };
  return { ok: true, message: { format, root: root as Record<string, unknown> } };
}

// ── Reading a value ─────────────────────────────────────────────────────────

export type ReadResult = { found: boolean; value: string; problem?: 'NOT_A_VALUE' | 'WRONG_RESOURCE' | 'WRONG_FORMAT' };
const NOT_FOUND: ReadResult = { found: false, value: '' };

function unescapeHl7(v: string): string {
  return v.replace(/\\([FSTRE])\\/g, (_m, c: string) => ({ F: '|', S: '^', T: '&', R: '~', E: '\\' } as Record<string, string>)[c]);
}

function readHl7(message: ParsedHL7Message, p: Hl7Path): ReadResult {
  const segment = message.getAllSegments(p.segment)[p.occurrence - 1];
  if (!segment) return NOT_FOUND;
  let value = segment.fields[p.field] ?? '';
  // MSH-1 is the field separator itself; the parser keeps it as one field and it has no parts.
  if (p.segment === 'MSH' && p.field === 1) return value ? { found: true, value } : NOT_FOUND;
  // MSH-2 is the encoding characters: not split.
  if (!(p.segment === 'MSH' && p.field === 2)) {
    value = value.split('~')[p.repetition - 1] ?? '';
    if (p.component !== undefined) value = value.split('^')[p.component - 1] ?? '';
    if (p.subcomponent !== undefined) value = value.split('&')[p.subcomponent - 1] ?? '';
  }
  return value === '' ? NOT_FOUND : { found: true, value: unescapeHl7(value) };
}

function walk(node: unknown, dotted: string): unknown {
  let cur = node;
  for (const k of dotted.split('.')) {
    if (cur && typeof cur === 'object' && !Array.isArray(cur)) cur = (cur as Record<string, unknown>)[k]; else return undefined;
  }
  return cur;
}

function readJson(root: Record<string, unknown>, p: JsonPath, format: 'json' | 'fhir'): ReadResult {
  if (format === 'fhir' && p.resourceType && root.resourceType !== p.resourceType) return { found: false, value: '', problem: 'WRONG_RESOURCE' };
  let cur: unknown = root;
  for (const step of p.steps) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return NOT_FOUND;
    cur = (cur as Record<string, unknown>)[step.key];
    for (const sel of step.selectors) {
      if (!Array.isArray(cur)) return NOT_FOUND;
      if ('index' in sel) cur = cur[sel.index];
      else cur = cur.find(el => { const v = walk(el, sel.where); return v !== undefined && v !== null && String(v) === sel.equals; });
    }
    if (Array.isArray(cur) && step.selectors.length === 0) cur = cur[0];
    if (cur === undefined || cur === null) return NOT_FOUND;
  }
  if (typeof cur === 'string') return cur === '' ? NOT_FOUND : { found: true, value: cur };
  if (typeof cur === 'number' || typeof cur === 'boolean') return { found: true, value: String(cur) };
  return { found: false, value: '', problem: 'NOT_A_VALUE' };
}

/** The value a path points at, or not found. Never throws. */
export function readSourceValue(message: VendorMessage, path: SourcePath): ReadResult {
  if (message.format === 'hl7v2') return path.kind === 'hl7' ? readHl7(message.hl7, path) : { found: false, value: '', problem: 'WRONG_FORMAT' };
  return path.kind === 'json' ? readJson(message.root, path, message.format) : { found: false, value: '', problem: 'WRONG_FORMAT' };
}
