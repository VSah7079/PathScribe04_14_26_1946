// src/services/supportAccess/supportAuditPdf.ts
// ─────────────────────────────────────────────────
// Batch 604 (PS-358): the support audit stream as a PDF (compliance export),
// built in the browser with pdf-lib. Same rows as the CSV, plus the chain check.
// ─────────────────────────────────────────────────
import type { ChainCheck, SupportAuditEntry } from './supportAccessRules';

export interface SupportAuditPdfInput {
  organisationName: string;
  exportedBy: string;
  exportedAt: string;
  chain: ChainCheck;
  entries: readonly SupportAuditEntry[];
}

/** pdf-lib's standard fonts take WinAnsi only: anything else becomes '?'. */
const ascii = (s: string) => s.replace(/[^\x20-\x7e -ÿ]/g, '?');

function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of ascii(text).split(/\s+/)) {
    if ((line + ' ' + word).trim().length > max) { if (line) out.push(line); line = word; } else line = (line + ' ' + word).trim();
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}

export async function buildSupportAuditPdf(input: SupportAuditPdfInput): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 612, H = 792, M = 40, LH = 11;
  let page = pdf.addPage([W, H]);
  let y = H - M;
  const line = (text: string, o: { bold?: boolean; size?: number } = {}) => {
    if (y < M + LH) { page = pdf.addPage([W, H]); y = H - M; }
    page.drawText(text, { x: M, y, size: o.size ?? 8, font: o.bold ? bold : font, color: rgb(0, 0, 0) });
    y -= (o.size ?? 8) + 3;
  };
  line('Support audit stream', { bold: true, size: 14 });
  line(`Organisation: ${ascii(input.organisationName)}`);
  line(`Exported by ${ascii(input.exportedBy)} at ${input.exportedAt}`);
  line(`Record check: ${input.chain.intact ? `intact (${input.chain.entries} entries)` : `BROKEN at entry ${input.chain.brokenAt}`}`, { bold: true });
  y -= 6;
  for (const e of [...input.entries].sort((a, b) => a.seq - b.seq)) {
    line(`#${e.seq}  ${e.at}  ${e.action}  ${ascii(e.actorName)}${e.ticketId ? `  ticket ${ascii(e.ticketId)}` : ''}`, { bold: true });
    for (const l of wrap(e.detail, 120)) line(`    ${l}`);
    if (e.caseIds.length) line(`    cases: ${e.caseIds.join(', ')}`);
    line(`    origin: ${e.originIp ?? 'not recorded (server only)'} ${e.originCountry ?? ''}   hash ${e.hash.slice(0, 16)}`);
  }
  return pdf.save();
}
