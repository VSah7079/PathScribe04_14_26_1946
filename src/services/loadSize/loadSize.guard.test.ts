// src/services/loadSize/loadSize.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 505 (PS-475): keeps the big things out of the first page load.
// The real measure runs at the end of `npm run build` (fails over
// 1 MB gzipped since Batch 527, PS-486); these checks catch the known
// regressions at source level, where a plain test run sees them.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (name !== 'node_modules') sourceFiles(full, out); continue; }
    if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name)) out.push(full);
  }
  return out;
}
const FILES = sourceFiles(SRC).map(f => ({ path: relative(ROOT, f).replace(/\\/g, '/'), text: readFileSync(f, 'utf8') }));

/** Static (value) imports of a module: `import x from 'm'` / `import { x } from 'm'`, not `import type`. */
function staticImporters(module: RegExp): string[] {
  return FILES.filter(f => [...f.text.matchAll(/^import\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/gm)].some(m => module.test(m[1]))).map(f => f.path);
}

describe('first-load size guards (PS-475)', () => {
  it('locale files are not imported statically (each language loads on demand)', () => {
    expect(staticImporters(/(^|\/)locales\/[a-zA-Z-]+\.json$/)).toEqual([]);
  });

  it('pdf-lib (about 170 KB gzipped) is not imported statically', () => {
    expect(staticImporters(/^pdf-lib$/)).toEqual([]);
  });

  it('seed template JSON is not imported statically by the template service', () => {
    expect(staticImporters(/data\/templates\/.*\.json$/).filter(p => p.endsWith('templateService.ts'))).toEqual([]);
  });

  it('the measurement counts the entry script, its preloads and stylesheets', async () => {
    const { firstLoadAssets } = await import('../../../scripts/measure-first-load.mjs');
    const html = `<script type="module" crossorigin src="/assets/index-a.js"></script>
      <link rel="modulepreload" crossorigin href="/assets/vendor-b.js">
      <link rel="stylesheet" crossorigin href="/assets/app-c.css">
      <link rel="icon" href="/favicon.svg">`;
    expect(firstLoadAssets(html)).toEqual(['/assets/index-a.js', '/assets/vendor-b.js', '/assets/app-c.css']);
  });

  it('the measurement also counts the sign-in page and everything it imports (Batch 527)', async () => {
    const { signInPageAssets } = await import('../../../scripts/measure-first-load.mjs');
    const { mkdtempSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const dir = mkdtempSync(join(tmpdir(), 'ps-manifest-'));
    const manifest = join(dir, 'manifest.json');
    writeFileSync(manifest, JSON.stringify({
      'src/pages/LoginPage.tsx': { file: 'assets/LoginPage-a.js', imports: ['_shared-b.js'], css: ['assets/login-c.css'] },
      '_shared-b.js': { file: 'assets/shared-b.js', imports: [] },
      'src/SignedInApp.tsx': { file: 'assets/SignedInApp-d.js', imports: [] },
    }));
    expect(signInPageAssets(manifest).sort()).toEqual(['/assets/LoginPage-a.js', '/assets/login-c.css', '/assets/shared-b.js']);
  });
});

// Batch 527 (PS-486): what the first screen loads, followed through static
// imports from main.tsx (dynamic import() is where loading on demand starts).
const ALIASES: [RegExp, string][] = [[/^@\//, 'src/'], [/^@components\//, 'src/components/'], [/^@pages\//, 'src/pages/'], [/^@hooks\//, 'src/hooks/'], [/^@contexts\//, 'src/contexts/']];
const BY_PATH = new Map(FILES.map(f => [f.path, f.text]));
function resolveImport(from: string, spec: string): string | null {
  let base: string | null = null;
  for (const [re, to] of ALIASES) if (re.test(spec)) { base = spec.replace(re, to); break; }
  if (!base && spec.startsWith('.')) {
    const parts = from.split('/').slice(0, -1);
    for (const seg of spec.split('/')) { if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg); }
    base = parts.join('/');
  }
  if (!base) return spec; // a package
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) if (BY_PATH.has(c)) return c;
  return null;
}
function firstScreenGraph(): Set<string> {
  const seen = new Set<string>();
  // Batch 547: main.tsx reads config.json, then imports startApp.tsx (the app's start, which was main.tsx's), so both are the first screen.
  const queue = ['src/main.tsx', 'src/startApp.tsx'];
  while (queue.length) {
    const f = queue.shift()!;
    if (seen.has(f)) continue;
    seen.add(f);
    const text = BY_PATH.get(f);
    if (!text) continue;
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of code.matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/gm)) {
      const r = resolveImport(f, m[1]);
      if (r) queue.push(r);
    }
  }
  return seen;
}

describe('the first screen (PS-486, Batch 527)', () => {
  const graph = firstScreenGraph();

  it('is a small part of the app, not all of it', () => {
    expect(graph.size).toBeGreaterThan(10);
    expect(graph.has('src/App.tsx')).toBe(true);
    expect(graph.has('src/SignedInApp.tsx')).toBe(false);
  });

  it('does not load the services barrel, the PDF engine, the embedded fonts or the barcode library', () => {
    const heavy = [...graph].filter(p => p === 'src/services/index.ts' || p === 'jspdf' || p === 'bwip-js' || p.includes('/embeddedFonts/'));
    expect(heavy).toEqual([]);
  });

  it('demo and developer screens are only built into the demo build', () => {
    const app = BY_PATH.get('src/SignedInApp.tsx')!;
    for (const page of ['MockInterfaceEnginePage', 'MockEMRPage', 'MockWsiViewerPage']) {
      expect(app, page).toMatch(new RegExp(`const ${page} = __DEMO_TOOLS__ \\? lazy\\(`));
    }
    expect(BY_PATH.get('src/pages/ConfigurationPage.tsx')).toMatch(/const DemoResetTab = __DEMO_TOOLS__ \? React\.lazy\(/);
  });

  it('the production check finds demo screens and mock services in a build manifest', async () => {
    const { inspectManifest } = await import('../../../scripts/check-production-bundle.mjs');
    expect(inspectManifest({
      a: { src: 'src/pages/MockEMRPage.tsx' }, b: { src: 'src/services/cases/mockCaseService.ts' }, c: { src: 'src/pages/LoginPage.tsx' },
    })).toEqual({ demoTools: ['src/pages/MockEMRPage.tsx'], mockModules: ['src/services/cases/mockCaseService.ts'] });
  });
});
