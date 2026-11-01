// src/services/documentRendering/imagePdf.test.ts — Batch 751: a one-page PDF around a JPEG.
import { describe, expect, it } from 'vitest';
import { jpegPdfBase64, jpegSize } from './imagePdf';

// The smallest useful JPEG header: SOI, an APP0 segment, and a baseline SOF0 for 1200 x 600 pixels.
const bytes = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x58, 0x04, 0xb0, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9];
const jpeg = String.fromCharCode(...bytes);

describe('jpegPdfBase64', () => {
  it('reads the picture size from the JPEG', () => {
    expect(jpegSize(jpeg)).toEqual({ width: 1200, height: 600 });
    expect(jpegSize('not a jpeg')).toBeUndefined();
  });
  it('makes a one-page PDF the picture’s size at 300 dpi, with the JPEG as it is, and a cross-reference table that points at each object', () => {
    const pdf = atob(jpegPdfBase64(btoa(jpeg))!);
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('/MediaBox [0 0 288 144]');
    expect(pdf).toContain('/Filter /DCTDecode');
    expect(pdf).toContain(jpeg);
    const xref = Number(/startxref\n(\d+)/.exec(pdf)![1]);
    expect(pdf.slice(xref, xref + 4)).toBe('xref');
    const offsets = [...pdf.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map(m => Number(m[1]));
    expect(offsets).toHaveLength(5);
    offsets.forEach((o, i) => expect(pdf.slice(o, o + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
  });
  it('refuses something that isn’t a JPEG', () => { expect(jpegPdfBase64(btoa('nope'))).toBeUndefined(); });
});
