// src/services/apiServer/httpRoutes.guard.test.ts
// Batch 617: ONE route style for every server (HTTP) version of a service
// (docs/architecture/HTTP_SERVICES_PATTERN.md §7). A server version built from the kit:
//   - names its base once:  const BASE = '/api/<area-kebab>/<service-kebab>';
//   - reaches each method through methodPath(BASE, 'methodName')  ->  <BASE>/<method-kebab>
//   - reads (every argument a plain value) are GET with a query string; everything else is POST.
//     PUT, PATCH and DELETE are not used, and no id is placed in the path.
// This guard fails on a path literal, a template-literal path or a verb outside that convention.
// The three files that carry job polling or binary downloads keep their own contracts (EXCEPTIONS).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { kebabCase, methodPath } from './httpServiceKit';

const ROOT = join(__dirname, '..');
/** Documented exceptions: own contract (job polling, binary download). Each needs a reason. */
const EXCEPTIONS: Record<string, string> = {
  'exports/httpExportApi.ts': 'export jobs are polled and downloaded as files (EXPORTS_API.md)',
  'reportDocuments/httpReportDocumentService.ts': 'binary report documents (REPORTS_API.md)',
  'reports/httpReportVersionService.ts': 'binary report versions (REPORTS_API.md)',
};
/** Kit and test support files are not services. */
const SUPPORT = new Set(['apiServer/httpServiceKit.ts', 'apiServer/httpServiceExtras.ts', 'apiServer/httpTestHelpers.ts']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const serverFiles = walk(ROOT)
  .map(p => relative(ROOT, p).split('\\').join('/'))
  .filter(p => (/\/http[A-Z][A-Za-z0-9]*\.ts$/.test(p) || p === 'apiServer/outboundQueueRoutes.ts') && !SUPPORT.has(p));

const checked = serverFiles.filter(p => !(p in EXCEPTIONS));
const strip = (src: string): string => src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

describe('server routes follow the one convention (HTTP_SERVICES_PATTERN.md §7)', () => {
  it('finds the server versions', () => {
    expect(serverFiles.length).toBeGreaterThan(100);
    expect(Object.keys(EXCEPTIONS).every(p => serverFiles.includes(p))).toBe(true);
  });

  it('the method-route helpers make /api/<area>/<service>/<method-kebab>', () => {
    expect(kebabCase('getByCaseId')).toBe('get-by-case-id');
    expect(kebabCase('findOrCreateByPV1')).toBe('find-or-create-by-pv1');
    expect(kebabCase('recordPdfSha256')).toBe('record-pdf-sha256');
    expect(methodPath('/api/cases/case', 'listCasesForUser')).toBe('/api/cases/case/list-cases-for-user');
  });

  it('uses no PUT, PATCH or DELETE', () => {
    const bad = checked.filter(p => /\(\s*'(PUT|PATCH|DELETE)'/.test(strip(readFileSync(join(ROOT, p), 'utf8'))));
    expect(bad).toEqual([]);
  });

  it('every /api/ literal is a two-part base: /api/<area>/<service>', () => {
    const bad: string[] = [];
    for (const p of checked) {
      for (const m of strip(readFileSync(join(ROOT, p), 'utf8')).matchAll(/(['"`])(\/api\/[^'"`]*)\1/g)) {
        if (!/^\/api\/[a-z0-9]+(-[a-z0-9]+)*\/[a-z0-9]+(-[a-z0-9]+)*$/.test(m[2])) bad.push(`${p}: ${m[2]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('puts no id or text into a path: no ${...} segment after /api/, a method name is added only by methodPath', () => {
    const bad = checked.filter(p => /`\/api\//.test(strip(readFileSync(join(ROOT, p), 'utf8'))));
    expect(bad).toEqual([]);
  });

  it('every file that has routes builds each path from its base: methodPath(BASE, \'method\') or `${BASE}/method-kebab`', () => {
    const bad = checked.filter(p => {
      const src = strip(readFileSync(join(ROOT, p), 'utf8'));
      return /\/api\//.test(src) && !/methodPath\(/.test(src) && !/`\$\{\w*BASE\w*\}\/[a-z0-9-]+/.test(src);
    });
    expect(bad).toEqual([]);
  });

  it('a method segment written out by hand is already kebab-case', () => {
    const bad: string[] = [];
    for (const p of checked) {
      for (const m of strip(readFileSync(join(ROOT, p), 'utf8')).matchAll(/`\$\{\w*BASE\w*\}\/([^`$]*)/g)) {
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m[1])) bad.push(`${p}: ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('keeps the exception list honest: each one still exists and has a reason', () => {
    for (const [p, why] of Object.entries(EXCEPTIONS)) {
      expect(serverFiles).toContain(p);
      expect(why.length).toBeGreaterThan(10);
    }
  });
});
