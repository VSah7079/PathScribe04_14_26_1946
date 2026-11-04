import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// PS-245: the canvas is drawn at exactly the label's size, so its border must sit outside it.
describe('Label Designer canvas sizing (PS-245)', () => {
  const css = readFileSync(resolve(__dirname, '../../pathscribe.css'), 'utf8');

  it('draws the canvas border outside the label width and height', () => {
    const rule = css.match(/\.ps-designer-canvas\s*\{[^}]*\}/);
    expect(rule, 'the canvas rule exists').not.toBeNull();
    expect(rule![0]).toMatch(/box-sizing:\s*content-box/);
  });

  it('sizes the canvas from the label width and height', () => {
    expect(css).toMatch(/\.ps-designer-canvas\s*\{\s*width:\s*var\(--canvas-w\);\s*height:\s*var\(--canvas-h\);\s*\}/);
  });
});
