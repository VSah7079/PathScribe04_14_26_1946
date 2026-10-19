// src/services/templates/protocolUploadValidation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 609 (#39): what "Upload Protocol" tells the person about the file they
// chose. The window used to accept any file and close. It now reads the file
// and gives a clear result, and the result always says the same plain thing:
// the file's FORMAT was checked; its CONTENT was not checked against the CAP
// or RCPath published protocol (we have neither body's licensed files, so the
// format is Unverified — Capability Inventory #39). Pure; nothing is stored.
//
//   JSON  a protocol exported from PathScribe (format "pathscribe-synoptic-
//         protocol") or a bare editor template: checked section by section,
//         and importable as a DRAFT (templateService.saveDraft), which then
//         goes through review like any other draft.
//   XML   well-formedness, then the CAP eCC / SDC shape (a FormDesign with
//         Section and Question elements): reported, not imported.
//   XLSX  a real spreadsheet package (a zip with a workbook and sheets):
//         reported, not imported.
//
// Findings carry a code and values; the window words them in the person's
// language (protocolShared.uploadModal.check.*).
// ─────────────────────────────────────────────────────────────────────────────

import type { EditorTemplate } from '@/components/Config/Protocols/SynopticEditor';
import { PROTOCOL_EXPORT_FORMAT, PROTOCOL_EXPORT_FORMAT_VERSION } from './protocolLifecycle';

export type UploadFormat = 'json' | 'xml' | 'xlsx' | 'unknown';
export type UploadFindingLevel = 'error' | 'warning' | 'info';

export const UPLOAD_FINDING_CODES = [
  'EMPTY_FILE',
  'FILE_TOO_LARGE',
  'UNSUPPORTED_FORMAT',
  'JSON_INVALID',
  'JSON_NOT_A_PROTOCOL',
  'JSON_NEWER_FORMAT',
  'JSON_NO_NAME',
  'JSON_NO_SECTIONS',
  'JSON_SECTION_NO_TITLE',
  'JSON_SECTION_NO_FIELDS',
  'JSON_FIELD_NO_LABEL',
  'JSON_FIELD_BAD_TYPE',
  'JSON_OK',
  'XML_NOT_WELL_FORMED',
  'XML_NOT_SDC',
  'XML_NO_QUESTIONS',
  'XML_SDC_OK',
  'XLSX_NOT_A_WORKBOOK',
  'XLSX_OK',
  'XLSX_NOT_MAPPED',
  'NOT_IMPORTABLE',
] as const;
export type UploadFindingCode = typeof UPLOAD_FINDING_CODES[number];

export interface UploadFinding {
  level: UploadFindingLevel;
  code: UploadFindingCode;
  /** Values for the sentence (counts, names). Names are template names, not patient data. */
  params?: Record<string, string | number>;
}

export interface ProtocolUploadResult {
  format: UploadFormat;
  /** No error was found. */
  ok: boolean;
  findings: UploadFinding[];
  /** What was found in the file, when it could be read. */
  summary?: { name?: string; sections: number; fields: number };
  /** A PathScribe protocol that can be saved as a draft; absent for XML, Excel and any file with errors. */
  importable?: EditorTemplate;
  /** Always false: the content is not verified against the governing body's published protocol. */
  verifiedAgainstGoverningBody: false;
}

/** Largest file read (a protocol export is well under 1 MB). */
export const MAX_PROTOCOL_UPLOAD_BYTES = 10 * 1024 * 1024;

const FIELD_TYPES = new Set(['dropdown', 'radio', 'checkboxes', 'numeric', 'text', 'longtext', 'partGrid', 'spatialStageCanvas']);
const SDC_ROOTS = new Set(['SDCPackage', 'FormDesign', 'SDCForm', 'XMLPackage']);

export function detectUploadFormat(fileName: string, bytes: Uint8Array): UploadFormat {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  const startsWithZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'json') return 'json';
  if (ext === 'xml') return 'xml';
  if (startsWithZip) return 'xlsx';
  return 'unknown';
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Checks parsed JSON as a protocol (pure). */
export function validateProtocolJson(text: string): ProtocolUploadResult {
  const findings: UploadFinding[] = [];
  const done = (extra: Partial<ProtocolUploadResult> = {}): ProtocolUploadResult =>
    ({ format: 'json', ok: !findings.some(f => f.level === 'error'), findings, verifiedAgainstGoverningBody: false, ...extra });
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { findings.push({ level: 'error', code: 'JSON_INVALID' }); return done(); }
  if (!isRecord(parsed)) { findings.push({ level: 'error', code: 'JSON_NOT_A_PROTOCOL' }); return done(); }

  let template: unknown = parsed;
  if (parsed.format === PROTOCOL_EXPORT_FORMAT) {
    if (typeof parsed.formatVersion === 'number' && parsed.formatVersion > PROTOCOL_EXPORT_FORMAT_VERSION) {
      findings.push({ level: 'error', code: 'JSON_NEWER_FORMAT', params: { version: parsed.formatVersion } });
      return done();
    }
    template = parsed.template;
  }
  if (!isRecord(template) || !Array.isArray(template.sections)) { findings.push({ level: 'error', code: 'JSON_NOT_A_PROTOCOL' }); return done(); }

  const name = str(template.name);
  if (!name) findings.push({ level: 'error', code: 'JSON_NO_NAME' });
  const sections = template.sections as unknown[];
  if (sections.length === 0) findings.push({ level: 'error', code: 'JSON_NO_SECTIONS' });
  let fields = 0;
  sections.forEach((s, i) => {
    const sec = isRecord(s) ? s : {};
    if (!str(sec.title)) findings.push({ level: 'error', code: 'JSON_SECTION_NO_TITLE', params: { section: i + 1 } });
    const list = Array.isArray(sec.fields) ? sec.fields as unknown[] : [];
    if (list.length === 0) findings.push({ level: 'warning', code: 'JSON_SECTION_NO_FIELDS', params: { section: i + 1 } });
    list.forEach((f, j) => {
      fields += 1;
      const fld = isRecord(f) ? f : {};
      if (!str(fld.label)) findings.push({ level: 'error', code: 'JSON_FIELD_NO_LABEL', params: { section: i + 1, field: j + 1 } });
      if (!FIELD_TYPES.has(String(fld.type))) findings.push({ level: 'error', code: 'JSON_FIELD_BAD_TYPE', params: { section: i + 1, field: j + 1 } });
    });
  });

  const summary = { name: name || undefined, sections: sections.length, fields };
  const errors = findings.some(f => f.level === 'error');
  if (!errors) findings.push({ level: 'info', code: 'JSON_OK', params: { sections: summary.sections, fields: summary.fields } });
  return done({ summary, ...(errors ? {} : { importable: template as unknown as EditorTemplate }) });
}

/** Checks an XML file as a CAP eCC / SDC form (pure given a parser; the browser's DOMParser by default). */
export function validateProtocolXml(text: string, parse: (xml: string) => Document = xml => new DOMParser().parseFromString(xml, 'application/xml')): ProtocolUploadResult {
  const findings: UploadFinding[] = [];
  const done = (extra: Partial<ProtocolUploadResult> = {}): ProtocolUploadResult =>
    ({ format: 'xml', ok: !findings.some(f => f.level === 'error'), findings, verifiedAgainstGoverningBody: false, ...extra });
  const doc = parse(text);
  if (doc.getElementsByTagName('parsererror').length > 0 || !doc.documentElement) { findings.push({ level: 'error', code: 'XML_NOT_WELL_FORMED' }); return done(); }
  const all = Array.from(doc.getElementsByTagName('*'));
  const count = (local: string) => all.filter(e => e.localName === local).length;
  const root = doc.documentElement.localName;
  const sections = count('Section');
  const questions = count('Question');
  if (!SDC_ROOTS.has(root) && count('FormDesign') === 0) findings.push({ level: 'warning', code: 'XML_NOT_SDC', params: { root } });
  if (questions === 0) findings.push({ level: 'error', code: 'XML_NO_QUESTIONS' });
  if (!findings.length) findings.push({ level: 'info', code: 'XML_SDC_OK', params: { sections, questions } });
  findings.push({ level: 'info', code: 'NOT_IMPORTABLE' });
  return done({ summary: { sections, fields: questions } });
}

/** Checks a spreadsheet package: a zip with a workbook and at least one sheet. */
export async function validateProtocolXlsx(bytes: Uint8Array): Promise<ProtocolUploadResult> {
  const findings: UploadFinding[] = [];
  const done = (extra: Partial<ProtocolUploadResult> = {}): ProtocolUploadResult =>
    ({ format: 'xlsx', ok: !findings.some(f => f.level === 'error'), findings, verifiedAgainstGoverningBody: false, ...extra });
  try {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(bytes);
    const workbook = zip.file('xl/workbook.xml');
    const sheets = Object.keys(zip.files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).length;
    if (!workbook || sheets === 0) { findings.push({ level: 'error', code: 'XLSX_NOT_A_WORKBOOK' }); return done(); }
    findings.push({ level: 'info', code: 'XLSX_OK', params: { sheets } });
    findings.push({ level: 'warning', code: 'XLSX_NOT_MAPPED' });
    findings.push({ level: 'info', code: 'NOT_IMPORTABLE' });
    return done({ summary: { sections: sheets, fields: 0 } });
  } catch {
    findings.push({ level: 'error', code: 'XLSX_NOT_A_WORKBOOK' });
    return done();
  }
}

/** The result for a chosen file (reads nothing itself: the caller passes the bytes). */
export async function validateProtocolUpload(file: { name: string; size: number }, bytes: Uint8Array): Promise<ProtocolUploadResult> {
  const fail = (code: UploadFindingCode, format: UploadFormat = 'unknown'): ProtocolUploadResult =>
    ({ format, ok: false, findings: [{ level: 'error', code }], verifiedAgainstGoverningBody: false });
  if (file.size === 0 || bytes.length === 0) return fail('EMPTY_FILE');
  if (file.size > MAX_PROTOCOL_UPLOAD_BYTES) return fail('FILE_TOO_LARGE');
  const format = detectUploadFormat(file.name, bytes);
  if (format === 'json') return validateProtocolJson(new TextDecoder('utf-8').decode(bytes));
  if (format === 'xml') return validateProtocolXml(new TextDecoder('utf-8').decode(bytes));
  if (format === 'xlsx') return validateProtocolXlsx(bytes);
  return fail('UNSUPPORTED_FORMAT');
}

/**
 * The draft an importable upload becomes (pure): a new id, never the file's
 * own (so it can't overwrite a protocol), the chosen governing body as its
 * source when it is one the library knows, otherwise Custom, and a draft
 * version marker kept as the file has it.
 */
export function draftFromUpload(
  importable: EditorTemplate,
  governingBody: 'CAP' | 'RCPath' | 'ICCR' | 'RCPA' | 'Other',
  newId: string,
): EditorTemplate {
  const source = governingBody === 'CAP' || governingBody === 'RCPath' || governingBody === 'ICCR' ? governingBody : 'Custom';
  return { ...structuredClone(importable), id: newId, source, supersedesId: undefined, copiedFromId: undefined };
}
