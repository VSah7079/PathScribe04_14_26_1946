// Batch 436 (PS-294): pathscribe.css had 377 identical copies of rules
// (Governing Bodies, Identifier Formats, body modals and others, up to four
// times), so an edit could land on a copy the browser ignored. The earlier
// copies were removed, keeping the last (the one in effect). This keeps a
// top-level rule from appearing twice word for word.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function topLevelRules(css: string): string[] {
  const s = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: string[] = [];
  let depth = 0; let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { out.push(s.slice(start, i + 1).replace(/\s+/g, ' ').trim()); start = i + 1; } }
    else if (c === ';' && depth === 0) start = i + 1;
  }
  return out.filter(r => !r.startsWith('@'));
}

describe('pathscribe.css has no word-for-word duplicate rules', () => {
  it('each top-level rule appears once', () => {
    const rules = topLevelRules(readFileSync(resolve(__dirname, '../../pathscribe.css'), 'utf8'));
    const seen = new Set<string>();
    const dups = rules.filter(r => (seen.has(r) ? true : (seen.add(r), false)));
    expect(dups.map(d => d.slice(0, 80))).toEqual([]);
  });
});
