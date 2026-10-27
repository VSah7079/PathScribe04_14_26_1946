// src/services/batchRegistryFeed/batchFileWriters.ts
// Batch 620 part S (PS-800): the CSV and XML writers of the batch file feed. Pure functions of a profile and records.
import type { BatchColumn, BatchProgramProfile, BatchRecord } from './batchRegistryFeed';

const CSV_NEEDS_QUOTES = /["\r\n]/;
const FORMULA_START = /^[=+\-@\t\r]/;

/** One CSV cell: a leading apostrophe on anything a spreadsheet would run, then quoted when it holds the delimiter, a quote, a line break or edge spaces. */
export function csvCell(value: string, delimiter: string, neutralise: boolean): string {
  const v = neutralise && FORMULA_START.test(value) ? `'${value}` : value;
  return CSV_NEEDS_QUOTES.test(v) || v.includes(delimiter) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v;
}

/** RFC 4180 lines (CRLF), one record per line, the header row when the profile asks for it. */
export function writeCsv(profile: BatchProgramProfile, records: readonly BatchRecord[]): string {
  const d = profile.delimiter;
  const cell = (s: string) => csvCell(s, d, profile.neutraliseFormulas);
  const lines: string[] = [];
  if (profile.includeHeaderRow) lines.push(profile.columns.map(c => cell(c.header)).join(d));
  for (const r of records) lines.push(profile.columns.map(c => cell(r[c.field] ?? '')).join(d));
  return lines.join('\r\n') + '\r\n';
}

// Characters XML 1.0 cannot carry at all (most control characters, the surrogate halves, U+FFFE and U+FFFF) are dropped.
// eslint-disable-next-line no-control-regex
const XML_ILLEGAL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF￾￿]/g;

export function xmlEscape(value: string): string {
  return value.replace(XML_ILLEGAL, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

const element = (c: BatchColumn, r: BatchRecord) => `    <${c.header}>${xmlEscape(r[c.field] ?? '')}</${c.header}>`;

/** UTF-8 XML: a root element carrying the count and the time, one record element per record, one child per column named by its header. */
export function writeXml(profile: BatchProgramProfile, records: readonly BatchRecord[], generatedAt: string): string {
  const { xmlRootElement: root, xmlRecordElement: rec } = profile;
  const body = records.map(r => `  <${rec}>\n${profile.columns.map(c => element(c, r)).join('\n')}\n  </${rec}>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${root} generatedAt="${xmlEscape(generatedAt)}" recordCount="${records.length}">\n${body}\n</${root}>\n`;
}
