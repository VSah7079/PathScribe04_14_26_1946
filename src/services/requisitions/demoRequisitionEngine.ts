// src/services/requisitions/demoRequisitionEngine.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 762 (Pete, Nov 2, 2026: "Real PDFs, read in browser"): the demonstration's stand-in for the server's ingestion
// job. It reads the demo drop folder (public/demo-requisitions/, listed by its manifest.json, since a browser cannot
// list a folder), refuses anything that is not a PDF (§2.1), takes each page's scanned image out of the PDF
// (requisitionPages.ts), reads the barcode on it with ZXing, groups the pages (requisitionRules.groupPages: §2.2) and
// hands the result to the requisition service, which matches, links and quarantines (§2.3) and writes the audit trail.
//
// In production this runs on the server as a scheduled function per source (RECURRING_JOBS 'requisitionIngestion'),
// with OCR as well as barcodes; the browser never reads a hospital file share.
// ─────────────────────────────────────────────────────────────────────────────
import { BinaryBitmap, Code128Reader, Code39Reader, DecodeHintType, HybridBinarizer, RGBLuminanceSource, type Reader } from '@zxing/library';
import { groupPages, isIngestiblePdf } from './requisitionRules';
import { pageJpegs } from './requisitionPages';
import type { IngestedFile, IngestionReport, RequisitionSource } from './requisitionTypes';

interface ManifestFile { fileName: string; mimeType?: string }

/** Grey levels (0–255) of RGBA pixels, as ZXing reads them. Pure. */
export function luminanceOf(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length / 4);
  for (let i = 0, j = 0; j < out.length; i += 4, j++) out[j] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
  return out;
}

/** The barcodes on one page image (none when nothing can be read). Browser only (canvas). Accession labels and the
 *  separator sheet are Code 128 (Code 39 is read too, for older labels). */
export async function barcodesOnImage(jpeg: Uint8Array): Promise<string[]> {
  const bitmap = await createImageBitmap(new Blob([jpeg as BlobPart], { type: 'image/jpeg' }));
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const image = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminanceOf(pixels), canvas.width, canvas.height)));
  const hints = new Map<DecodeHintType, unknown>([[DecodeHintType.TRY_HARDER, true]]);
  const readers: Reader[] = [new Code128Reader(), new Code39Reader()];
  for (const reader of readers) {
    try { return [reader.decode(image, hints).getText()]; } catch { /* not this symbology, or no barcode on the page */ }
  }
  return [];
}

export interface DemoEngineDeps {
  fetch: typeof fetch;
  /** Reads a page image's barcodes (barcodesOnImage in the browser; replaced in tests). */
  readBarcodes: (jpeg: Uint8Array) => Promise<string[]>;
  folder: string;
}

/** Reads every file in the drop folder and reports what each holds. Never throws for one bad file. */
export async function readDropFolder(source: RequisitionSource, deps: DemoEngineDeps): Promise<IngestionReport> {
  const listing = await deps.fetch(`${deps.folder}manifest.json`).then(r => (r.ok ? r.json() : { files: [] })) as { files?: ManifestFile[] };
  const files: IngestedFile[] = [];
  for (const f of listing.files ?? []) {
    if (!isIngestiblePdf(f.fileName, f.mimeType)) { files.push({ fileName: f.fileName, outcome: 'rejected', reason: 'notPdf' }); continue; }
    const url = `${deps.folder}${encodeURIComponent(f.fileName)}`;
    try {
      const res = await deps.fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const images = await pageJpegs(new Uint8Array(await res.arrayBuffer()));
      const perPage: string[][] = [];
      for (const img of images) perPage.push(img ? await deps.readBarcodes(img) : []);
      files.push({ fileName: f.fileName, pointer: { kind: 'url', url }, outcome: 'read', groups: groupPages(perPage, source.separatorBarcode) });
    } catch {
      files.push({ fileName: f.fileName, outcome: 'rejected', reason: 'unreadable' });
    }
  }
  return { sourceId: source.id, files };
}
