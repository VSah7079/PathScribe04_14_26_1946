// Batch 725: the in-app User Guide must scroll. The app never scrolls the whole document (index.css) and the outlet clips
// anything a page does not scroll itself, so the contents list and the article each need their own scroll area.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const css = readFileSync('src/pages/Help/userGuide.css', 'utf-8');
const rule = (selector: string) => {
  const m = css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`));
  return m ? m[1] : '';
};

describe('User Guide page scrolling', () => {
  it('the article scrolls on its own', () => {
    expect(rule('.ps-ug-main')).toMatch(/overflow-y:\s*auto/);
    expect(rule('.ps-ug-main')).toMatch(/min-block-size:\s*0/);
  });
  it('the contents list scrolls on its own', () => {
    expect(rule('.ps-ug-side')).toMatch(/overflow-y:\s*auto/);
  });
  it('the page fills the space it is given and does not grow past it', () => {
    expect(rule('.ps-ug')).toMatch(/block-size:\s*100%/);
    expect(rule('.ps-ug')).toMatch(/overflow:\s*hidden/);
  });
  it('on a narrow window the whole page scrolls instead', () => {
    expect(css).toMatch(/max-width:\s*800px\)\s*\{[^}]*\.ps-ug \{[^}]*overflow-y:\s*auto/);
  });
});
