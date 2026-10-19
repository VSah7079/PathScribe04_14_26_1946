// src/utils/labels/vialRackZplTemplates.test.ts — Batch 615 (PS-360)
import { describe, it, expect } from 'vitest';
import {
  buildVialZplTemplate, buildRackZplTemplate, code128Modules, VIAL_DEFAULT_SIZE, RACK_DEFAULT_SIZE,
} from './vialRackZplTemplates';

describe('vial label template', () => {
  it('builds a Code 128 label for a 1 x 0.5 in vial at 300 dpi, with the text lines under it', () => {
    const r = buildVialZplTemplate({ vialId: 'V-26-0001', lines: ['S26-4403', 'DNA extract', '50 µL'] }, 300);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.zpl.startsWith('^XA')).toBe(true);
    expect(r.zpl.trim().endsWith('^XZ')).toBe(true);
    expect(r.zpl).toContain('^PW300');
    expect(r.zpl).toContain('^LL150');
    expect(r.zpl).toContain('^BCN,');
    expect(r.zpl).toContain('^FDV-26-0001^FS');
    expect(r.zpl).toContain('^FDS26-4403^FS');
    expect(r.zpl).toContain('^FDDNA extract^FS');
    // 9 characters: (11 * 11 + 13) + 20 quiet = 154 modules: 1 dot fits in 300, 2 dots (308) does not.
    expect(code128Modules(9)).toBe(134);
    expect(r.moduleDots).toBe(1);
  });

  it('uses a wider bar when the id is short enough', () => {
    const r = buildVialZplTemplate({ vialId: 'V1', lines: [] }, 300);
    expect(r.ok && r.moduleDots).toBe(3);
  });

  it('strips ZPL command characters from the id and the text', () => {
    const r = buildVialZplTemplate({ vialId: 'V^1~2', lines: ['A^FO9,9^FS'] }, 300);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.zpl).toContain('^FDV12^FS');
    expect(r.zpl).not.toContain('^FO9,9');
  });

  it('refuses an empty id, an id a barcode cannot carry, and an id too long for the label', () => {
    expect(buildVialZplTemplate({ vialId: '  ', lines: [] }, 300)).toEqual({ ok: false, error: 'barcodeEmpty' });
    expect(buildVialZplTemplate({ vialId: 'Vé1', lines: [] }, 300)).toEqual({ ok: false, error: 'barcodeInvalid' });
    expect(buildVialZplTemplate({ vialId: 'V'.repeat(40), lines: [] }, 300)).toEqual({ ok: false, error: 'barcodeTooLong' });
  });

  it('a bigger label stock takes the same id at a wider bar', () => {
    const small = buildVialZplTemplate({ vialId: 'V-26-0001', lines: [] }, 300);
    const big = buildVialZplTemplate({ vialId: 'V-26-0001', lines: [] }, 300, { widthMm: 50.8, heightMm: 25.4 });
    expect(small.ok && big.ok && big.moduleDots > small.moduleDots).toBe(true);
  });

  it('drops the lowest-priority lines when the label is too short, and says how many', () => {
    const r = buildVialZplTemplate({ vialId: 'V1', lines: ['one', 'two', 'three', 'four', 'five'] }, 203, { widthMm: 25.4, heightMm: 9.5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.droppedLines).toBeGreaterThan(0);
    expect(r.zpl).toContain('^FDone^FS');
    expect(r.zpl).not.toContain('^FDfive^FS');
  });

  it('prints the barcode alone when no text line fits', () => {
    const r = buildVialZplTemplate({ vialId: 'V1', lines: ['one'] }, 203, { widthMm: 25.4, heightMm: 5 });
    expect(r.ok && r.droppedLines).toBe(1);
  });

  it('works at 203 dpi', () => {
    const r = buildVialZplTemplate({ vialId: 'V-26-0001', lines: ['S26-4403'] }, 203);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.zpl).toContain('^PW203');
  });
});

describe('rack and batch label template', () => {
  it('each kind has a default stock from the Label Designer sizes', () => {
    expect(RACK_DEFAULT_SIZE.molecular_plate).toEqual({ widthMm: 50.8, heightMm: 19.05 });
    expect(RACK_DEFAULT_SIZE.staining_rack).toEqual({ widthMm: 38.1, heightMm: 12.7 });
    expect(VIAL_DEFAULT_SIZE).toEqual({ widthMm: 25.4, heightMm: 12.7 });
  });

  it.each(['staining_rack', 'molecular_plate', 'molecular_rack', 'wsi_batch'] as const)('builds a %s label', kind => {
    const r = buildRackZplTemplate({ kind, rackId: 'RACK-MOLE-0007', lines: ['Rack', '12 items'] }, 300);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.zpl).toContain('^FDRACK-MOLE-0007^FS');
    expect(r.zpl).toContain('^BCN,');
  });

  it('refuses an id that does not fit the default stock', () => {
    expect(buildRackZplTemplate({ kind: 'molecular_rack', rackId: 'R'.repeat(60), lines: [] }, 300)).toEqual({ ok: false, error: 'barcodeTooLong' });
  });
});
