// src/services/requisitions/requisitionPages.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 762: the page images of a scanned PDF. A document scanner saves each page as one image (almost always a
// JPEG, DCTDecode) inside the PDF; this takes that image out of each page, in page order, with pdf-lib, so its
// barcode can be read. A page whose image is not a JPEG (or has none) gives null: no barcode can be read from it here,
// and it is treated as a page with no barcode. Used by the demonstration's in-browser engine; the server job reads the
// pages with its own PDF library and OCR (docs/architecture/REQUISITION_INGESTION_API.md).
// ─────────────────────────────────────────────────────────────────────────────
import type { PDFDict, PDFRawStream } from 'pdf-lib';

/** The largest JPEG on each page (a scanner's page image), or null. Throws when the bytes are not a readable PDF. */
export async function pageJpegs(pdfBytes: ArrayBuffer | Uint8Array): Promise<(Uint8Array | null)[]> {
  const { PDFDocument, PDFName, PDFRawStream: RawStream, PDFDict: Dict } = await import('pdf-lib');
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: false, updateMetadata: false });
  return doc.getPages().map(page => {
    const resources = page.node.Resources();
    const xobjects = resources?.lookupMaybe(PDFName.of('XObject'), Dict) as PDFDict | undefined;
    if (!xobjects) return null;
    let best: Uint8Array | null = null;
    for (const key of xobjects.keys()) {
      const obj = xobjects.lookup(key);
      if (!(obj instanceof RawStream)) continue;
      const stream = obj as PDFRawStream;
      if (stream.dict.get(PDFName.of('Subtype'))?.toString() !== '/Image') continue;
      const filter = stream.dict.get(PDFName.of('Filter'))?.toString() ?? '';
      if (!filter.includes('DCTDecode')) continue;
      if (!best || stream.contents.length > best.length) best = stream.contents;
    }
    return best;
  });
}
