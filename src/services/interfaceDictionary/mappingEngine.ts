// src/services/interfaceDictionary/mappingEngine.ts
// ─────────────────────────────────────────────────
// Batch 612: checks a profile's mappings and applies them to one message. Pure.
//
//   validateMappings   the definitions: path syntax, target scope (scopeGuard.ts), labels,
//                      duplicates, a transform that suits the type, a default that fits
//   applyMappings      one message in, extension values and a per-mapping outcome out
//   contentHash        a fingerprint of the mappings, so a test goes stale after any edit
//
// The outcome carries no patient data of its own: the values are returned to the
// caller (which stores them against the case), and the test result keeps counts only.
// ─────────────────────────────────────────────────
import type { FieldMapping, MappingDataType, VendorMessageFormat } from './interfaceDictionaryTypes';
import { parseSourcePath, readSourceValue, type VendorMessage } from './messagePath';
import { targetRefusal } from './scopeGuard';

export type MappingProblemCode =
  | 'SOURCE_EMPTY' | 'SOURCE_SYNTAX' | 'TARGET_EMPTY' | 'TARGET_CORE_STRUCTURE' | 'TARGET_NOT_AN_EXTENSION'
  | 'TARGET_BAD_NAME' | 'LABEL_REQUIRED' | 'TARGET_DUPLICATE' | 'TRANSFORM_TYPE' | 'DEFAULT_TYPE' | 'VALUEMAP_BAD';

export interface MappingProblem { mappingId: string; code: MappingProblemCode }

const NUMBER = /^-?\d+(\.\d+)?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const BOOLEAN_TRUE = new Set(['y', 'yes', 'true', '1']);
const BOOLEAN_FALSE = new Set(['n', 'no', 'false', '0']);

export type ValueCheck = { ok: true; value: string } | { ok: false; code: 'BAD_NUMBER' | 'BAD_BOOLEAN' | 'BAD_DATE' | 'BAD_DATETIME' };

/** Whether a stored value suits its type; booleans are normalised to true/false (pure). */
export function checkValueType(dataType: MappingDataType, value: string): ValueCheck {
  switch (dataType) {
    case 'number': return NUMBER.test(value) ? { ok: true, value } : { ok: false, code: 'BAD_NUMBER' };
    case 'boolean': {
      const v = value.toLowerCase();
      if (BOOLEAN_TRUE.has(v)) return { ok: true, value: 'true' };
      if (BOOLEAN_FALSE.has(v)) return { ok: true, value: 'false' };
      return { ok: false, code: 'BAD_BOOLEAN' };
    }
    case 'date': return ISO_DATE.test(value) ? { ok: true, value } : { ok: false, code: 'BAD_DATE' };
    case 'dateTime': return ISO_DATETIME.test(value) ? { ok: true, value } : { ok: false, code: 'BAD_DATETIME' };
    default: return { ok: true, value };
  }
}

/** HL7 YYYYMMDD[...] → YYYY-MM-DD, or null. */
export function hl7DateToIso(v: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(v);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** HL7 YYYYMMDDHHMM[SS][.s][+/-ZZZZ] → YYYY-MM-DDTHH:MM:SS[+HH:MM], or null. */
export function hl7DateTimeToIso(v: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?(?:\.\d+)?([+-]\d{4})?$/.exec(v);
  if (!m) return null;
  const zone = m[7] ? `${m[7].slice(0, 3)}:${m[7].slice(3)}` : '';
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? '00'}${zone}`;
}

function transformOf(mapping: FieldMapping, raw: string): string | null {
  switch (mapping.transform) {
    case 'trim': return raw.trim();
    case 'upper': return raw.toUpperCase();
    case 'lower': return raw.toLowerCase();
    case 'hl7Date': return hl7DateToIso(raw);
    case 'hl7DateTime': return hl7DateTimeToIso(raw);
    default: return raw;
  }
}

/** Checks the definitions of a profile's mappings (pure). */
export function validateMappings(format: VendorMessageFormat, mappings: readonly FieldMapping[]): MappingProblem[] {
  const problems: MappingProblem[] = [];
  const seen = new Set<string>();
  for (const m of mappings) {
    const add = (code: MappingProblemCode) => problems.push({ mappingId: m.id, code });
    const src = parseSourcePath(format, m.sourcePath);
    if (!src.ok) add(src.reason === 'EMPTY' ? 'SOURCE_EMPTY' : 'SOURCE_SYNTAX');
    const refusal = targetRefusal(m.target);
    if (refusal === 'EMPTY') add('TARGET_EMPTY');
    else if (refusal === 'CORE_STRUCTURE') add('TARGET_CORE_STRUCTURE');
    else if (refusal === 'NOT_AN_EXTENSION') add('TARGET_NOT_AN_EXTENSION');
    else if (refusal === 'BAD_NAME') add('TARGET_BAD_NAME');
    else if (seen.has(m.target)) add('TARGET_DUPLICATE');
    if (!refusal) seen.add(m.target);
    if (!m.label.trim()) add('LABEL_REQUIRED');
    if ((m.transform === 'hl7Date' && m.dataType !== 'date') || (m.transform === 'hl7DateTime' && m.dataType !== 'dateTime')) add('TRANSFORM_TYPE');
    if (m.defaultValue !== undefined && m.defaultValue !== '' && !checkValueType(m.dataType, m.defaultValue).ok) add('DEFAULT_TYPE');
    if (m.valueMap && (Object.keys(m.valueMap).some(k => !k) || Object.values(m.valueMap).some(v => v === ''))) add('VALUEMAP_BAD');
  }
  return problems;
}

export type MappingOutcomeStatus = 'mapped' | 'default' | 'missing' | 'missingRequired' | 'problem';
export interface MappingOutcome {
  mappingId: string;
  target: string;
  status: MappingOutcomeStatus;
  /** For a problem: BAD_NUMBER, BAD_DATE, UNMAPPED_CODE, NOT_A_VALUE ... */
  problem?: string;
  value?: string;
}

export interface MappedValue { target: string; label: string; dataType: MappingDataType; value: string }
export interface ApplyResult {
  outcomes: MappingOutcome[];
  values: MappedValue[];
  mapped: number;
  missingRequired: number;
  problems: number;
}

/** A test passes when something was mapped and nothing required is missing or wrong (pure). */
export function applyPassed(r: Pick<ApplyResult, 'mapped' | 'missingRequired' | 'problems'>): boolean {
  return r.mapped > 0 && r.missingRequired === 0 && r.problems === 0;
}

/** Applies mappings to one message (pure). Mappings that fail the scope guard are skipped and counted as problems. */
export function applyMappings(format: VendorMessageFormat, mappings: readonly FieldMapping[], message: VendorMessage): ApplyResult {
  const outcomes: MappingOutcome[] = []; const values: MappedValue[] = [];
  let mapped = 0; let missingRequired = 0; let problems = 0;
  for (const m of mappings) {
    const base = { mappingId: m.id, target: m.target };
    const src = parseSourcePath(format, m.sourcePath);
    if (!src.ok || targetRefusal(m.target)) { problems += 1; outcomes.push({ ...base, status: 'problem', problem: 'DEFINITION' }); continue; }
    const read = readSourceValue(message, src.path);
    if (read.problem && read.problem !== 'NOT_A_VALUE') { problems += 1; outcomes.push({ ...base, status: 'problem', problem: read.problem }); continue; }
    if (read.problem === 'NOT_A_VALUE') { problems += 1; outcomes.push({ ...base, status: 'problem', problem: 'NOT_A_VALUE' }); continue; }
    let raw = read.found ? read.value : '';
    let usedDefault = false;
    if (!read.found) {
      if (m.defaultValue) { raw = m.defaultValue; usedDefault = true; }
      else if (m.required) { missingRequired += 1; outcomes.push({ ...base, status: 'missingRequired' }); continue; }
      else { outcomes.push({ ...base, status: 'missing' }); continue; }
    }
    const moved = usedDefault ? raw : transformOf(m, raw);
    if (moved === null) { problems += 1; outcomes.push({ ...base, status: 'problem', problem: m.transform === 'hl7DateTime' ? 'BAD_DATETIME' : 'BAD_DATE' }); continue; }
    let value = moved;
    let unmapped = false;
    if (!usedDefault && m.valueMap && Object.keys(m.valueMap).length) {
      if (Object.prototype.hasOwnProperty.call(m.valueMap, value)) value = m.valueMap[value]; else unmapped = true;
    }
    if (unmapped) { problems += 1; outcomes.push({ ...base, status: 'problem', problem: 'UNMAPPED_CODE' }); continue; }
    const typed = checkValueType(m.dataType, value);
    if (!typed.ok) { problems += 1; outcomes.push({ ...base, status: 'problem', problem: typed.code }); continue; }
    mapped += 1;
    values.push({ target: m.target, label: m.label, dataType: m.dataType, value: typed.value });
    outcomes.push({ ...base, status: usedDefault ? 'default' : 'mapped', value: typed.value });
  }
  return { outcomes, values, mapped, missingRequired, problems };
}

/** FNV-1a fingerprint of the mappings in a fixed field order (pure). */
export function contentHash(mappings: readonly FieldMapping[]): string {
  const text = JSON.stringify(mappings.map(m => [
    m.id, m.sourcePath, m.target, m.label, m.dataType, m.transform,
    m.valueMap ? Object.entries(m.valueMap).sort(([a], [b]) => a.localeCompare(b)) : null, !!m.required, m.defaultValue ?? '',
  ]));
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
