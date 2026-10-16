// Batch 550 (PS-539 phase 2d, D7; ASYNC_EXPORT_API.md §7): every export button goes
// through the one export service, so with the API server every export is built there.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { EXPORT_KINDS } from './asyncExportContract';

const ROOT = join(__dirname, '..', '..');
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}
const files = walk(ROOT).map(p => ({ path: p.slice(ROOT.length + 1).replace(/\\/g, '/'), text: readFileSync(p, 'utf8') }));

describe('exports go through the export service (Batch 550)', () => {
  it('every export kind is requested from a screen through runExport, exportQaReportRows or runQaExport (per call site)', () => {
    const callers = files.filter(f => /^(pages|components|services|hooks)\//.test(f.path) && !f.path.endsWith('capabilityCatalog.ts') && !f.path.endsWith('asyncExportContract.ts'));
    const all = callers.map(f => f.text).join('\n');
    const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const missing = (Object.keys(EXPORT_KINDS) as (keyof typeof EXPORT_KINDS)[]).filter(kind => {
      const cap = esc(EXPORT_KINDS[kind].capability);
      const re = new RegExp(`runExport\\(\\s*'${esc(kind)}'|exportQaReportRows\\(\\s*'${cap}'|exportQaReport\\(\\s*'${cap}'`);
      return !re.test(all);
    });
    expect(missing).toEqual([]);
  });

  it('every browser export a screen starts (beginExport, exportDisposalReport, exportChangeLog) is inside a runExport', () => {
    const offenders: string[] = [];
    for (const f of files.filter(x => /^(pages|components)\//.test(x.path))) {
      for (const m of f.text.matchAll(/\b(beginExport|exportDisposalReport|exportChangeLog)\(/g)) {
        // The nearest runExport( before this call must still be open (its closure not yet closed).
        const before = f.text.slice(0, m.index);
        const at = before.lastIndexOf('runExport(');
        const between = at < 0 ? '' : before.slice(at);
        const open = at >= 0 && (between.match(/\(/g) ?? []).length > (between.match(/\)/g) ?? []).length;
        if (!open) offenders.push(`${f.path}: ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('QA exports from the screens go through exportQaReportRows, which runs them through the service', () => {
    const direct = files.filter(f => /^(pages|components)\//.test(f.path) && /\bexportQaReport\(/.test(f.text) && !f.path.endsWith('qaReportUtils.ts')).map(f => f.path);
    expect(direct).toEqual([]);
    const utils = files.find(f => f.path === 'components/QualityAssurance/qaReportUtils.ts')!;
    expect(utils.text).toContain('runQaExport(');
  });
});
