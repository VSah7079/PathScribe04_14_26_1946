// src/services/connectivity/latency.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 548 (PS-539 phase 2d, readiness review §8, §9 item 2): the shared
// waiting states, and the connection banner on every signed-in screen.
//   - Every screen's loading text is shown through LoadingState (nothing for
//     300 ms, then the text, "still working" at 3 s): the 42 that used the
//     plain .ps-conf-loading text (Batch 548) and the rest (Batch 549).
//   - Both route fallbacks use the shared PageLoader.
//   - The connection banner is mounted once, for the signed-in app.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const walk = (d: string): string[] => readdirSync(d).flatMap(n => {
  const f = resolve(d, n);
  return statSync(f).isDirectory() ? walk(f) : /\.tsx$/.test(n) && !/\.test\.tsx$/.test(n) ? [f] : [];
});
const files = walk(SRC).map(f => ({ rel: relative(SRC, f).split(sep).join('/'), text: readFileSync(f, 'utf8') }));
const read = (rel: string) => files.find(f => f.rel === rel)!.text;

describe('latency states (Batch 548)', () => {
  it('no screen shows the old plain loading text', () => {
    expect(files.filter(f => f.text.includes('className="ps-conf-loading"')).map(f => f.rel)).toEqual([]);
  });

  it('both route fallbacks use the shared PageLoader', () => {
    for (const f of ['App.tsx', 'SignedInApp.tsx']) {
      expect(read(f), f).toContain('<Suspense fallback={<PageLoader />}>');
      expect(read(f), f).not.toMatch(/const PageLoader\s*[:=]/);
    }
  });

  it('the connection banner is on every signed-in screen, once', () => {
    expect(read('SignedInApp.tsx').split('<ConnectionBanner />').length - 1).toBe(1);
    expect(files.filter(f => f.text.includes('<ConnectionBanner />')).map(f => f.rel)).toEqual(['SignedInApp.tsx']);
  });

  it('every loading text is shown through LoadingState (Batch 549)', () => {
    // t('…loading…') keys that aren't a wait for data: an upload, a download, the rack-loading page's own name.
    const notAWait = /ploading|ownloading|molecularRackLoadingPage/;
    const offenders = files.flatMap(f => f.text.split('\n').map((line, i) => ({ f: f.rel, i: i + 1, line })))
      .filter(({ line }) => /\bt\([^)]*[lL]oading[^)]*\)/.test(line) && !notAWait.test(line) && !line.includes('LoadingState') && !/^\s*\/\//.test(line))
      .filter(({ f }) => f !== 'components/Common/PageLoader.tsx' && f !== 'components/Common/LoadingState.tsx')
      .map(({ f, i }) => `${f}:${i}`);
    expect(offenders).toEqual([]);
  });
});
