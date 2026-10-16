// src/services/printing/buildReportDocumentReference.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 495 (PS-283 §4.2.3): "machine-readable barcode or unique document
// UUID in the footer, for rapid scan-and-correlate back to the electronic
// master record in PathScribe."
//
// The barcode is a Code 128 of the case's accession — the identifier
// ScannerProvider already resolves: scanning a printed page opens that case
// (/case/{accession}/synoptic), with no new lookup to build or keep in sync.
// The human-readable line adds the case record version, so two printouts of
// the same case can be told apart.
//
// Scope: this reaches every report PathScribe renders itself — the report
// page's HTML print (the preview window was retired in Batch 497), and (already, in its header since
// PS-276) the cytology PDF. The surgical/orchestration PDF comes from
// render_report in functions/main.py (in this repo); since Batch 498 it draws
// the same footer — a Code 128 of the accession plus the record version — on
// every page. (Batch 495 called that service external and unchangeable —
// corrected in Batch 496.)
//
// Never throws: an accession the barcode can't encode leaves the barcode out
// (the readable reference still prints), rather than failing the print.
// ─────────────────────────────────────────────────────────────────────────────

import { generateBarcodeSvg } from '@/utils/labels/generateBarcodeSvg';

export interface ReportDocumentReference {
  accession: string;
  version: number | null;
  /** Code 128 SVG markup of the accession; null when it couldn't be encoded. */
  barcodeSvg: string | null;
}

export function buildReportDocumentReference(
  caseRecord: { version?: number | null; accession?: { fullAccession?: string | null; accessionNumber?: string | null } | null } | null | undefined,
  encode: (value: string) => string = value => generateBarcodeSvg(value, 'code128', { includeText: false }),
): ReportDocumentReference | null {
  const accession = (caseRecord?.accession?.fullAccession ?? caseRecord?.accession?.accessionNumber ?? '').trim();
  if (!accession) return null;
  let barcodeSvg: string | null = null;
  try { barcodeSvg = encode(accession); } catch { barcodeSvg = null; }
  return { accession, version: typeof caseRecord?.version === 'number' ? caseRecord.version : null, barcodeSvg };
}
