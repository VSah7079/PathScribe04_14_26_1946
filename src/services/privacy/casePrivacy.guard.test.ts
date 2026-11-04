// Batch 396: Pete's privacy model, rules 2 to 4, at source level.
// See docs/architecture/CASE_PRIVACY_MODEL.md.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(SRC, p), 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe('case privacy model (Batch 396)', () => {
  it('message links come only from cases the reader can open', () => {
    const shell = read('components/AppShell/AppShell.tsx');
    expect(shell).toMatch(/caseRouter\.listLinkableAccessions\(\)/);
    expect(shell).not.toMatch(/caseService\.getAll\(/);
  });

  it('both case-view routes decide through openCaseForView', () => {
    expect(read('pages/FullReportPage.tsx')).toMatch(/openCaseForViewDefault\(/);
    expect(read('loaders/synopticLoader.ts')).toMatch(/openCaseForViewDefault\(/);
  });

  it('no screen tells a reader why a case is unavailable', () => {
    const offenders = walk(SRC).filter(f => /accessDenied=/.test(readFileSync(f, 'utf8'))).map(f => f.slice(SRC.length + 1));
    expect(offenders).toEqual([]);
  });

  it('the not-found and no-access screens share one message', () => {
    expect(read('pages/FullReportPage.tsx')).toMatch(/<CaseUnavailable /);
    expect(read('pages/SynopticReportPage/SynopticReportPage.tsx')).toMatch(/<CaseUnavailable /);
  });

  it('signing out clears the inbox, so the next person never sees it', () => {
    const ctx = read('contexts/MessagingContext.tsx');
    expect(ctx).toMatch(/useEffect\(\(\) => \{ setMessages\(\[\]\); \}, \[userId\]\);/);
    expect(read('components/AppShell/AppShell.tsx')).not.toMatch(/user\?\.id \?\? 'u1'/);
  });
});
