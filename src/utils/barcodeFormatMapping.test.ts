// src/utils/barcodeFormatMapping.test.ts
import { describe, it, expect } from 'vitest';
import { BarcodeFormat } from '@zxing/library';
import {
  BARCODE_TYPE_TO_ZXING_FORMAT,
  getSupportedZxingFormats,
  zxingFormatToBarcodeType,
} from './barcodeFormatMapping';
import type { BarcodeType } from '@/types/systemConfig';

describe('BARCODE_TYPE_TO_ZXING_FORMAT — real mapping, verified against every BarcodeType this app actually models', () => {
  const allBarcodeTypes: BarcodeType[] = ['1d_code128', '1d_code39', '2d_datamatrix', '2d_qr', '2d_pdf417'];

  it('has a real, defined entry for every BarcodeType — none silently missing', () => {
    for (const type of allBarcodeTypes) {
      expect(BARCODE_TYPE_TO_ZXING_FORMAT[type]).toBeDefined();
    }
  });

  it('maps each type to the real, confirmed ZXing enum value', () => {
    expect(BARCODE_TYPE_TO_ZXING_FORMAT['1d_code128']).toBe(BarcodeFormat.CODE_128);
    expect(BARCODE_TYPE_TO_ZXING_FORMAT['1d_code39']).toBe(BarcodeFormat.CODE_39);
    expect(BARCODE_TYPE_TO_ZXING_FORMAT['2d_datamatrix']).toBe(BarcodeFormat.DATA_MATRIX);
    expect(BARCODE_TYPE_TO_ZXING_FORMAT['2d_qr']).toBe(BarcodeFormat.QR_CODE);
    expect(BARCODE_TYPE_TO_ZXING_FORMAT['2d_pdf417']).toBe(BarcodeFormat.PDF_417);
  });
});

describe('getSupportedZxingFormats — real, restricted format list the scanner actually uses', () => {
  it('returns exactly the five real formats this app models, no more, no fewer', () => {
    const formats = getSupportedZxingFormats();
    expect(formats).toHaveLength(5);
    expect(formats).toContain(BarcodeFormat.CODE_128);
    expect(formats).toContain(BarcodeFormat.CODE_39);
    expect(formats).toContain(BarcodeFormat.DATA_MATRIX);
    expect(formats).toContain(BarcodeFormat.QR_CODE);
    expect(formats).toContain(BarcodeFormat.PDF_417);
  });

  it('deliberately excludes formats this app does not model (e.g. EAN-13, UPC-A) — a real scanner precision concern, not an oversight', () => {
    const formats = getSupportedZxingFormats();
    expect(formats).not.toContain(BarcodeFormat.EAN_13);
    expect(formats).not.toContain(BarcodeFormat.UPC_A);
    expect(formats).not.toContain(BarcodeFormat.AZTEC);
  });
});

describe('zxingFormatToBarcodeType — real reverse lookup', () => {
  it('correctly reverses every forward mapping', () => {
    expect(zxingFormatToBarcodeType(BarcodeFormat.CODE_128)).toBe('1d_code128');
    expect(zxingFormatToBarcodeType(BarcodeFormat.CODE_39)).toBe('1d_code39');
    expect(zxingFormatToBarcodeType(BarcodeFormat.DATA_MATRIX)).toBe('2d_datamatrix');
    expect(zxingFormatToBarcodeType(BarcodeFormat.QR_CODE)).toBe('2d_qr');
    expect(zxingFormatToBarcodeType(BarcodeFormat.PDF_417)).toBe('2d_pdf417');
  });

  it('a real ZXing format this app does not model returns undefined honestly, not a wrong guess', () => {
    expect(zxingFormatToBarcodeType(BarcodeFormat.EAN_13)).toBeUndefined();
    expect(zxingFormatToBarcodeType(BarcodeFormat.AZTEC)).toBeUndefined();
  });
});
