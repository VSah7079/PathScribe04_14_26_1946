// Batch 388 (PS-359): the Microtomy workstation's comment drawer, slide grid and
// scan errors go through t(); reasons are stored as English values but shown
// through microtomyWorkstation.reasons.*. Source-level guard.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, rel), 'utf8')
  .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n');

describe('Microtomy workstation text (Batch 388)', () => {
  const grid = read('components/SlideGridPanel.tsx');
  const drawer = read('components/CommentDrawer.tsx');
  const page = read('MicrotomyWorkstationPage.tsx');
  const hook = read('hooks/useMicrotomyWorkstation.ts');

  it.each(['Special Stains', "label: 'IHC'", "label: 'Cytology'", "label: 'Molecular'", "label: 'Other'"])('the grid has no English category label %s', s => {
    expect(grid).not.toContain(s);
  });
  it('reasons are shown through t(), never as the stored English value', () => {
    expect(grid).not.toMatch(/<option key=\{r\} value=\{r\}>\{r\}<\/option>/);
    expect(page).not.toMatch(/<option key=\{r\} value=\{r\}>\{r\}<\/option>/);
  });
  it('dates follow the user\'s locale, never toLocaleString()', () => {
    for (const code of [grid, drawer, page]) expect(code).not.toMatch(/toLocale(Date)?String\(/);
  });
  it.each(['Empty scan', 'didn’t resolve', 'Specimen not found', 'Block not found on this case', 'Case not found', 'isn’t supported at the Microtomy'])('the hook has no English scan error "%s"', s => {
    expect(hook).not.toContain(s);
  });
  it('the hardware panel words label-fit warnings and the label size through t()', () => {
    const hw = read('components/HardwarePrintPanel.tsx');
    expect(hw).not.toContain('w.message');
    expect(hw).not.toMatch(/mm ×/);
  });
  it('the cytology panel joins its suggestions with formatList, not a hard-coded comma', () => {
    expect(read('components/CytologyPanel.tsx')).not.toContain(".join(', ')");
  });
  it('the page sets its own voice context', () => {
    expect(page).toContain('VOICE_CONTEXT.MICROTOMY');
  });
});
