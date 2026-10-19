// src/services/migration/parseLegacyFile.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#132, #166): reads the text of a legacy export file (CSV or JSON)
// into the flat records processLegacyRecordImport takes. Runs in the browser;
// the file's text is never kept, only the per-record results of the job.
//
//   CSV   first row is the header; comma, semicolon or tab separated (chosen
//         from the header row); quoted fields may hold separators, doubled
//         quotes and line breaks. A byte-order mark is ignored.
//   JSON  an array of objects, or an object with a "records" array. Numbers and
//         booleans become text; a list becomes its items joined with "; ";
//         anything nested deeper is left out and counted.
// ─────────────────────────────────────────────────────────────────────────────

/** More records than this in one file are refused (a browser import, not a bulk loader). */
export const LEGACY_IMPORT_MAX_RECORDS = 2000;

export type LegacyFileFormat = 'csv' | 'json';

export type LegacyParseError =
  | 'empty' | 'tooMany' | 'noHeader' | 'badJson' | 'notRecords' | 'noRecords';

export type LegacyParseResult =
  | { ok: true; format: LegacyFileFormat; records: Record<string, string>[]; fields: string[]; skippedNested: number }
  | { ok: false; error: LegacyParseError; max?: number };

/** The format a file name suggests (undefined when it is neither). */
export function legacyFormatOf(fileName: string): LegacyFileFormat | undefined {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) return 'csv';
  if (lower.endsWith('.json')) return 'json';
  return undefined;
}

function detectDelimiter(headerLine: string): string {
  const counts = [',', ';', '\t'].map(d => ({ d, n: headerLine.split(d).length - 1 }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].d : ',';
}

/** Splits CSV text into rows of cells (pure). */
export function splitCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"' && cell === '') {
      quoted = true;
    } else if (c === delimiter) {
      row.push(cell); cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}

function parseCsv(text: string): LegacyParseResult {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const rows = splitCsv(clean, detectDelimiter(firstLine));
  if (rows.length === 0) return { ok: false, error: 'empty' };
  const header = rows[0].map(h => h.trim());
  if (header.every(h => h === '')) return { ok: false, error: 'noHeader' };
  const body = rows.slice(1);
  if (body.length === 0) return { ok: false, error: 'noRecords' };
  if (body.length > LEGACY_IMPORT_MAX_RECORDS) return { ok: false, error: 'tooMany', max: LEGACY_IMPORT_MAX_RECORDS };
  const records = body.map(r => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => { if (h) rec[h] = (r[i] ?? '').trim(); });
    return rec;
  });
  return { ok: true, format: 'csv', records, fields: header.filter(Boolean), skippedNested: 0 };
}

function flatten(value: unknown): { text: string | null; nested: boolean } {
  if (value === null || value === undefined) return { text: '', nested: false };
  if (typeof value === 'string') return { text: value.trim(), nested: false };
  if (typeof value === 'number' || typeof value === 'boolean') return { text: String(value), nested: false };
  if (Array.isArray(value)) {
    if (value.every(v => ['string', 'number', 'boolean'].includes(typeof v))) return { text: value.map(String).join('; '), nested: false };
    return { text: null, nested: true };
  }
  return { text: null, nested: true };
}

function parseJson(text: string): LegacyParseResult {
  let data: unknown;
  try { data = JSON.parse(text.replace(/^﻿/, '')); } catch { return { ok: false, error: 'badJson' }; }
  const list = Array.isArray(data) ? data
    : (data && typeof data === 'object' && Array.isArray((data as { records?: unknown }).records)) ? (data as { records: unknown[] }).records
    : null;
  if (!list) return { ok: false, error: 'notRecords' };
  if (list.length === 0) return { ok: false, error: 'noRecords' };
  if (list.length > LEGACY_IMPORT_MAX_RECORDS) return { ok: false, error: 'tooMany', max: LEGACY_IMPORT_MAX_RECORDS };
  if (!list.every(x => x && typeof x === 'object' && !Array.isArray(x))) return { ok: false, error: 'notRecords' };
  let skippedNested = 0;
  const fields = new Set<string>();
  const records = (list as Record<string, unknown>[]).map(item => {
    const rec: Record<string, string> = {};
    for (const [k, v] of Object.entries(item)) {
      const f = flatten(v);
      if (f.nested || f.text === null) { skippedNested++; continue; }
      rec[k] = f.text; fields.add(k);
    }
    return rec;
  });
  return { ok: true, format: 'json', records, fields: [...fields], skippedNested };
}

export function parseLegacyFile(text: string, format: LegacyFileFormat): LegacyParseResult {
  if (text.trim() === '') return { ok: false, error: 'empty' };
  return format === 'json' ? parseJson(text) : parseCsv(text);
}
