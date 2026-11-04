// Batch 669h (footer): no screen prints a fixed compliance or status claim. A status is a check
// (services/healthStatus); a compliance claim is not made on a screen at all (reviewer ruling, Oct 24, 2026).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..');
const walk = (dir: string, out: string[] = []): string[] => {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};
const files = walk(SRC).filter(p => /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p));
const en = JSON.parse(readFileSync(join(SRC, 'i18n/locales/en.json'), 'utf8')) as Record<string, unknown>;
const get = (path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);

describe('no fixed compliance or status claims', () => {
  it('finds the source', () => { expect(files.length).toBeGreaterThan(500); });

  it('no component prints a fixed "HIPAA Compliant" or "SYSTEMS OPERATIONAL" string', () => {
    const bad = files.filter(p => /HIPAA[ -]Compliant|SYSTEMS? OPERATIONAL/i.test(readFileSync(p, 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')));
    expect(bad).toEqual([]);
  });

  it('the Home footer takes its status from the status component, not a fixed key', () => {
    const home = readFileSync(join(SRC, 'pages/Home.tsx'), 'utf8');
    expect(home).toContain('SystemStatusIndicator');
    expect(home).not.toMatch(/systemsOperational|status-dot/);
  });

  it('the English texts make none of the removed claims', () => {
    expect(get('home.systemsOperational')).toBeUndefined();
    expect(String(get('home.footerCopyright'))).not.toMatch(/HIPAA/i);
    expect(get('appShell.secureEmailModal.encryptedNotice')).toBeUndefined();
    expect(String(get('configSearchIndex.entries.protocols-library.description'))).not.toMatch(/compliant/i);
    expect(String(get('configSearchIndex.entries.tpl-builder.description'))).not.toMatch(/compliant/i);
  });
});
