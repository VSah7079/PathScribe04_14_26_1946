// src/utils/labels/safeBarcodeSvg.test.ts
import { describe, it, expect } from 'vitest';
import { safeBarcodeSvg } from './safeBarcodeSvg';
import { generateBarcodeSvg } from './generateBarcodeSvg';

describe('safeBarcodeSvg (PS-256) — the Label Designer canvas barcode', () => {
  it('returns the real SVG generateBarcodeSvg draws for a valid payload, in the requested symbology', () => {
    const code128 = safeBarcodeSvg('PLT-HPV-20260906-012', 'code128', 'barcode render failed');
    const datamatrix = safeBarcodeSvg('PLT-HPV-20260906-012', 'datamatrix', 'barcode render failed');
    expect(code128).toBe(generateBarcodeSvg('PLT-HPV-20260906-012', 'code128'));
    expect(datamatrix).toBe(generateBarcodeSvg('PLT-HPV-20260906-012', 'datamatrix'));
    expect(code128.startsWith('<svg')).toBe(true);
    expect(datamatrix.startsWith('<svg')).toBe(true);
    expect(code128).not.toBe(datamatrix);
  });

  it('a payload the generator rejects never throws: it returns the visible placeholder carrying the caller\'s text', () => {
    expect(() => generateBarcodeSvg('', 'code128')).toThrow();
    for (const symbology of ['code128', 'datamatrix'] as const) {
      let out = '';
      expect(() => { out = safeBarcodeSvg('', symbology, 'barcode render failed'); }).not.toThrow();
      expect(out).toBe('<div class="ps-designer-barcode-error">barcode render failed</div>');
    }
  });
});

describe('safeBarcodeSvg escapes its placeholder text (Batch 451)', () => {
  it('a translated message with markup characters is shown as text, not HTML', () => {
    expect(safeBarcodeSvg('', 'code128', '<b>Barcode & "error"</b>')).toBe('<div class="ps-designer-barcode-error">&lt;b&gt;Barcode &amp; &quot;error&quot;&lt;/b&gt;</div>');
  });
});
