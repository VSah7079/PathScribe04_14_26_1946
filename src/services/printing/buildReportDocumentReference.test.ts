// Batch 495 (PS-283 §4.2.3): the scan-and-correlate footer reference.
import { describe, it, expect } from 'vitest';
import { buildReportDocumentReference } from './buildReportDocumentReference';

describe('buildReportDocumentReference', () => {
  it('encodes the accession (what the scanner already opens) and carries the record version', () => {
    const ref = buildReportDocumentReference({ version: 7, accession: { fullAccession: 'S26-1234' } }, v => `<svg data-v="${v}"/>`);
    expect(ref).toEqual({ accession: 'S26-1234', version: 7, barcodeSvg: '<svg data-v="S26-1234"/>' });
  });

  it('falls back to accessionNumber and has no version when the record has none', () => {
    const ref = buildReportDocumentReference({ accession: { accessionNumber: 'S26-99' } }, () => '<svg/>');
    expect(ref?.accession).toBe('S26-99');
    expect(ref?.version).toBeNull();
  });

  it('is null without an accession', () => {
    expect(buildReportDocumentReference(null)).toBeNull();
    expect(buildReportDocumentReference({ accession: { fullAccession: '  ' } })).toBeNull();
  });

  it('keeps the readable reference but drops the barcode when the accession cannot be encoded', () => {
    const ref = buildReportDocumentReference({ version: 1, accession: { fullAccession: 'S26-1' } }, () => { throw new Error('bad'); });
    expect(ref).toEqual({ accession: 'S26-1', version: 1, barcodeSvg: null });
  });

  it('produces a real Code 128 SVG with the default encoder', () => {
    const ref = buildReportDocumentReference({ version: 1, accession: { fullAccession: 'S26-1234' } });
    expect(ref?.barcodeSvg).toContain('<svg');
  });
});
