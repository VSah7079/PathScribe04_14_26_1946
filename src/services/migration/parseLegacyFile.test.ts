// src/services/migration/parseLegacyFile.test.ts — Batch 611 (#132, #166)
import { describe, it, expect } from 'vitest';
import { parseLegacyFile, splitCsv, legacyFormatOf, LEGACY_IMPORT_MAX_RECORDS } from './parseLegacyFile';

describe('legacyFormatOf', () => {
  it('chooses a format from the file name', () => {
    expect(legacyFormatOf('export.CSV')).toBe('csv');
    expect(legacyFormatOf('export.json')).toBe('json');
    expect(legacyFormatOf('export.xlsx')).toBeUndefined();
  });
});

describe('splitCsv', () => {
  it('keeps separators, doubled quotes and line breaks inside quoted cells', () => {
    expect(splitCsv('a,b\n"x,1","he said ""hi"""\n"two\nlines",z', ',')).toEqual([
      ['a', 'b'], ['x,1', 'he said "hi"'], ['two\nlines', 'z'],
    ]);
  });
  it('handles CRLF and drops blank lines', () => {
    expect(splitCsv('a,b\r\n1,2\r\n\r\n', ',')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('parseLegacyFile (CSV)', () => {
  it('reads a header row and trims cells', () => {
    const r = parseLegacyFile('pt_fname, pt_lname ,accn\nAnna,Lee, S1 \n', 'csv');
    expect(r).toMatchObject({ ok: true, format: 'csv', fields: ['pt_fname', 'pt_lname', 'accn'] });
    if (r.ok) expect(r.records).toEqual([{ pt_fname: 'Anna', pt_lname: 'Lee', accn: 'S1' }]);
  });
  it('detects semicolons and tabs from the header', () => {
    const semi = parseLegacyFile('a;b\n1;2', 'csv');
    const tab = parseLegacyFile('a\tb\n1\t2', 'csv');
    for (const r of [semi, tab]) { expect(r.ok).toBe(true); if (r.ok) expect(r.records).toEqual([{ a: '1', b: '2' }]); }
  });
  it('ignores a byte-order mark', () => {
    const r = parseLegacyFile('﻿a,b\n1,2', 'csv');
    expect(r.ok && r.fields).toEqual(['a', 'b']);
  });
  it('refuses empty text, a header with no rows, and too many rows', () => {
    expect(parseLegacyFile('  \n', 'csv')).toEqual({ ok: false, error: 'empty' });
    expect(parseLegacyFile('a,b\n', 'csv')).toEqual({ ok: false, error: 'noRecords' });
    const big = 'a\n' + Array.from({ length: LEGACY_IMPORT_MAX_RECORDS + 1 }, (_, i) => String(i)).join('\n');
    expect(parseLegacyFile(big, 'csv')).toEqual({ ok: false, error: 'tooMany', max: LEGACY_IMPORT_MAX_RECORDS });
  });
});

describe('parseLegacyFile (JSON)', () => {
  it('reads an array of objects, turning numbers and lists into text', () => {
    const r = parseLegacyFile(JSON.stringify([{ accn: 'S1', age: 40, ok: true, codes: ['A', 'B'], note: null }]), 'json');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.records).toEqual([{ accn: 'S1', age: '40', ok: 'true', codes: 'A; B', note: '' }]);
  });
  it('reads {records: [...]} and counts nested values it leaves out', () => {
    const r = parseLegacyFile(JSON.stringify({ records: [{ accn: 'S1', detail: { a: 1 } }] }), 'json');
    expect(r.ok && r.skippedNested).toBe(1);
    expect(r.ok && r.records).toEqual([{ accn: 'S1' }]);
  });
  it('refuses bad JSON, a non-list, and an empty list', () => {
    expect(parseLegacyFile('{oops', 'json')).toEqual({ ok: false, error: 'badJson' });
    expect(parseLegacyFile('{"a":1}', 'json')).toEqual({ ok: false, error: 'notRecords' });
    expect(parseLegacyFile('[1,2]', 'json')).toEqual({ ok: false, error: 'notRecords' });
    expect(parseLegacyFile('[]', 'json')).toEqual({ ok: false, error: 'noRecords' });
  });
});
