// Batch 762: the demonstration engine reads the drop folder: PDFs only, every page's barcode, grouped (§2.1, §2.2).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readDropFolder } from './demoRequisitionEngine';
import { DEFAULT_SEPARATOR_BARCODE } from './requisitionRules';

const dir = join(__dirname, '../../../public/demo-requisitions');
const fakeFetch = (async (u: string) => {
  const name = decodeURIComponent(u.replace('/demo-requisitions/', ''));
  try {
    const bytes = readFileSync(join(dir, name));
    return { ok: true, json: async () => JSON.parse(bytes.toString()), arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
  } catch { return { ok: false, json: async () => ({}) }; }
}) as unknown as typeof fetch;

describe('readDropFolder (Batch 762)', () => {
  it('reads each PDF page by page and refuses the TIFF', async () => {
    // Stands in for ZXing (canvas): the demo pages' barcodes, in order, by the page image's size.
    const pages: string[][] = [['S26-0001'], [], [DEFAULT_SEPARATOR_BARCODE], ['S26-4403'], ['S26-9999'], [DEFAULT_SEPARATOR_BARCODE], []];
    let i = 0;
    const report = await readDropFolder(
      { id: 'src', name: 'n', facilityId: null, kind: 'fileShare', location: 'l', scheduleMinutes: 15, separatorBarcode: DEFAULT_SEPARATOR_BARCODE, enabled: true, updatedAt: '', updatedBy: '' },
      { fetch: fakeFetch, readBarcodes: async () => pages[i++], folder: '/demo-requisitions/' },
    );
    expect(report.files).toEqual([
      { fileName: 'REQ-BATCH-0001.pdf', pointer: { kind: 'url', url: '/demo-requisitions/REQ-BATCH-0001.pdf' }, outcome: 'read', groups: [{ barcode: 'S26-0001', pages: { from: 1, to: 2 } }, { barcode: 'S26-4403', pages: { from: 4, to: 4 } }] },
      { fileName: 'REQ-BATCH-0002.pdf', pointer: { kind: 'url', url: '/demo-requisitions/REQ-BATCH-0002.pdf' }, outcome: 'read', groups: [{ barcode: 'S26-9999', pages: { from: 1, to: 1 } }, { pages: { from: 3, to: 3 } }] },
      { fileName: 'REQ-SCAN-0003.tif', outcome: 'rejected', reason: 'notPdf' },
    ]);
  });
});
