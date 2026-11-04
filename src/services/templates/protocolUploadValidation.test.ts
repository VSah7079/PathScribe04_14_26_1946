// @vitest-environment happy-dom
// Batch 609 (#39): the Upload Protocol file check.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import {
  detectUploadFormat, validateProtocolJson, validateProtocolXml, validateProtocolXlsx, validateProtocolUpload, draftFromUpload,
  UPLOAD_FINDING_CODES, MAX_PROTOCOL_UPLOAD_BYTES,
} from './protocolUploadValidation';
import { buildProtocolExport } from './protocolLifecycle';
import type { EditorTemplate } from '@/components/Config/Protocols/SynopticEditor';

const template = (over: Partial<EditorTemplate> = {}): EditorTemplate => ({
  id: 'orig', name: 'Breast invasive', source: 'CAP', version: '1.0.0', category: 'BREAST',
  sections: [{ id: 's1', title: 'Tumour', collapsed: false, fields: [
    { id: 'f1', label: 'Grade', type: 'dropdown', required: true, snomed: '', icd: '', options: [] },
    { id: 'f2', label: 'Size', type: 'numeric', required: false, snomed: '', icd: '', options: [] },
  ] }],
  ...over,
});
const bytes = (s: string) => new TextEncoder().encode(s);
const codes = (r: { findings: { code: string }[] }) => r.findings.map(f => f.code);

describe('format detection', () => {
  it('goes by extension, then by the zip signature', () => {
    expect(detectUploadFormat('a.JSON', bytes('{}'))).toBe('json');
    expect(detectUploadFormat('a.xml', bytes('<a/>'))).toBe('xml');
    expect(detectUploadFormat('a.xlsx', bytes('x'))).toBe('xlsx');
    expect(detectUploadFormat('noext', new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe('xlsx');
    expect(detectUploadFormat('a.docx', bytes('hello'))).toBe('unknown');
  });
});

describe('JSON', () => {
  it('a PathScribe export is recognised, summarised and importable; it is never marked verified', () => {
    const { data } = buildProtocolExport({ id: 'orig', name: 'Breast invasive', source: 'CAP', version: '1.0.0', category: 'BREAST', status: 'published' }, template(), '2026-10-18T00:00:00Z');
    const r = validateProtocolJson(JSON.stringify(data));
    expect(r.ok).toBe(true);
    expect(r.summary).toEqual({ name: 'Breast invasive', sections: 1, fields: 2 });
    expect(r.importable?.name).toBe('Breast invasive');
    expect(r.verifiedAgainstGoverningBody).toBe(false);
    expect(r.findings.find(f => f.code === 'JSON_OK')?.params).toEqual({ sections: 1, fields: 2 });
  });
  it('a bare editor template is accepted too', () => {
    expect(validateProtocolJson(JSON.stringify(template())).importable).toBeDefined();
  });
  it('says what is wrong: bad JSON, not a protocol, a newer format, a nameless protocol, no sections', () => {
    expect(codes(validateProtocolJson('{nope'))).toEqual(['JSON_INVALID']);
    expect(codes(validateProtocolJson('[1,2]'))).toEqual(['JSON_NOT_A_PROTOCOL']);
    expect(codes(validateProtocolJson('{"a":1}'))).toEqual(['JSON_NOT_A_PROTOCOL']);
    expect(codes(validateProtocolJson('{"format":"pathscribe-synoptic-protocol","formatVersion":99,"template":{}}'))).toEqual(['JSON_NEWER_FORMAT']);
    const noName = validateProtocolJson(JSON.stringify(template({ name: ' ' })));
    expect(codes(noName)).toContain('JSON_NO_NAME');
    expect(noName.ok).toBe(false);
    expect(noName.importable).toBeUndefined();
    expect(codes(validateProtocolJson(JSON.stringify(template({ sections: [] }))))).toContain('JSON_NO_SECTIONS');
  });
  it('points at the section and question: no section title, an empty section (a warning), a question with no label or an unknown type', () => {
    const t = template({ sections: [
      { id: 's1', title: '', collapsed: false, fields: [] },
      { id: 's2', title: 'B', collapsed: false, fields: [{ id: 'f', label: '', type: 'wizard' as never, required: false, snomed: '', icd: '', options: [] }] },
    ] });
    const r = validateProtocolJson(JSON.stringify(t));
    expect(r.ok).toBe(false);
    expect(r.findings).toEqual(expect.arrayContaining([
      { level: 'error', code: 'JSON_SECTION_NO_TITLE', params: { section: 1 } },
      { level: 'warning', code: 'JSON_SECTION_NO_FIELDS', params: { section: 1 } },
      { level: 'error', code: 'JSON_FIELD_NO_LABEL', params: { section: 2, field: 1 } },
      { level: 'error', code: 'JSON_FIELD_BAD_TYPE', params: { section: 2, field: 1 } },
    ]));
  });
  it('an empty section alone is only a warning; the file is still ok', () => {
    const r = validateProtocolJson(JSON.stringify(template({ sections: [{ id: 's', title: 'Empty', collapsed: false, fields: [] }] })));
    expect(r.ok).toBe(true);
    expect(codes(r)).toContain('JSON_SECTION_NO_FIELDS');
  });
});

describe('XML', () => {
  const sdc = '<SDCPackage><XMLPackage><FormDesign><Body><ChildItems><Section><ChildItems><Question/><Question/></ChildItems></Section></ChildItems></Body></FormDesign></XMLPackage></SDCPackage>';
  it('a CAP eCC (SDC) shaped form is recognised and counted, and is reported as not importable', () => {
    const r = validateProtocolXml(sdc);
    expect(r.ok).toBe(true);
    expect(r.findings).toEqual([
      { level: 'info', code: 'XML_SDC_OK', params: { sections: 1, questions: 2 } },
      { level: 'info', code: 'NOT_IMPORTABLE' },
    ]);
    expect(r.importable).toBeUndefined();
    expect(r.verifiedAgainstGoverningBody).toBe(false);
  });
  it('malformed XML, other XML (a warning), and a form with no questions are told apart', () => {
    expect(codes(validateProtocolXml('<a><b></a>'))).toEqual(['XML_NOT_WELL_FORMED']);
    const other = validateProtocolXml('<orders><Question/></orders>');
    expect(other.ok).toBe(true);
    expect(other.findings[0]).toEqual({ level: 'warning', code: 'XML_NOT_SDC', params: { root: 'orders' } });
    const empty = validateProtocolXml('<SDCPackage><FormDesign/></SDCPackage>');
    expect(empty.ok).toBe(false);
    expect(codes(empty)).toContain('XML_NO_QUESTIONS');
  });
});

describe('XLSX', () => {
  it('a workbook package is recognised; its sheets are not read, and it is not importable', async () => {
    const zip = new JSZip();
    zip.file('xl/workbook.xml', '<workbook/>');
    zip.file('xl/worksheets/sheet1.xml', '<worksheet/>');
    zip.file('xl/worksheets/sheet2.xml', '<worksheet/>');
    const r = await validateProtocolXlsx(await zip.generateAsync({ type: 'uint8array' }));
    expect(r.ok).toBe(true);
    expect(r.findings).toEqual([
      { level: 'info', code: 'XLSX_OK', params: { sheets: 2 } },
      { level: 'warning', code: 'XLSX_NOT_MAPPED' },
      { level: 'info', code: 'NOT_IMPORTABLE' },
    ]);
  });
  it('a zip that is not a workbook, or a file that is not a zip, is refused', async () => {
    const zip = new JSZip(); zip.file('hello.txt', 'hi');
    expect(codes(await validateProtocolXlsx(await zip.generateAsync({ type: 'uint8array' })))).toEqual(['XLSX_NOT_A_WORKBOOK']);
    expect(codes(await validateProtocolXlsx(bytes('plain text')))).toEqual(['XLSX_NOT_A_WORKBOOK']);
  });
});

describe('validateProtocolUpload', () => {
  it('refuses an empty file, an oversized one and an unsupported type; routes the rest by format', async () => {
    expect(codes(await validateProtocolUpload({ name: 'a.json', size: 0 }, new Uint8Array()))).toEqual(['EMPTY_FILE']);
    expect(codes(await validateProtocolUpload({ name: 'a.json', size: MAX_PROTOCOL_UPLOAD_BYTES + 1 }, bytes('{}')))).toEqual(['FILE_TOO_LARGE']);
    expect(codes(await validateProtocolUpload({ name: 'a.docx', size: 5 }, bytes('hello')))).toEqual(['UNSUPPORTED_FORMAT']);
    expect((await validateProtocolUpload({ name: 'p.json', size: 100 }, bytes(JSON.stringify(template())))).format).toBe('json');
    expect((await validateProtocolUpload({ name: 'p.xml', size: 10 }, bytes('<SDCPackage><Question/></SDCPackage>'))).format).toBe('xml');
  });
});

describe('draftFromUpload', () => {
  it('gets a new id (never the file\'s own), the chosen body as source or Custom, and no lineage', () => {
    const importable = template({ supersedesId: 'x', copiedFromId: 'y' });
    const cap = draftFromUpload(importable, 'CAP', 'tmpl-upload-1');
    expect(cap).toMatchObject({ id: 'tmpl-upload-1', source: 'CAP', supersedesId: undefined, copiedFromId: undefined, name: 'Breast invasive' });
    expect(draftFromUpload(importable, 'RCPA', 'n').source).toBe('Custom');
    expect(draftFromUpload(importable, 'Other', 'n').source).toBe('Custom');
    expect(importable.id).toBe('orig');
  });
});

describe('words for every finding, in all five languages', () => {
  it('each code has text in en, fr, de, nl and ko', () => {
    for (const lang of ['en', 'fr', 'de', 'nl', 'ko']) {
      const json = JSON.parse(readFileSync(resolve(__dirname, `../../i18n/locales/${lang}.json`), 'utf8'));
      const check = json.protocolShared.uploadModal.check;
      for (const code of UPLOAD_FINDING_CODES) expect(check.codes[code], `${lang}:${code}`).toBeTruthy();
      for (const k of ['checking', 'formatOk', 'formatProblems', 'unverified', 'imported']) expect(check[k], `${lang}:${k}`).toBeTruthy();
    }
  });
});
