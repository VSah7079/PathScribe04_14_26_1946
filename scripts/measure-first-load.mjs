#!/usr/bin/env node
// scripts/measure-first-load.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Batch 505 (PS-475): how much a browser downloads before PathScribe can show
// anything — the entry script, every module it preloads, and the stylesheets
// index.html links — gzipped, from the built dist/. Fails (exit 1) when it is
// over the target, so CI can stop a change that makes the first load grow.
//
//   node scripts/measure-first-load.mjs [--target-mb 3] [--json]
//
// Stage 1 target: 3 MB gzipped (PS-475). Batch 527 (PS-486): the target is
// 1 MB, the default. It also counts the sign-in page itself (the lazily loaded
// LoginPage chunk and everything it imports), since nothing shows until it
// arrives; before Batch 527 that chunk wasn't counted.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const args = process.argv.slice(2);
const targetMb = Number(args[args.indexOf('--target-mb') + 1]) || 1;

export function firstLoadAssets(html) {
  const out = new Set();
  for (const m of html.matchAll(/<script[^>]*\bsrc="(\/assets\/[^"]+)"/g)) out.add(m[1]);
  for (const m of html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="(\/assets\/[^"]+)"/g)) out.add(m[1]);
  for (const m of html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/assets\/[^"]+)"/g)) out.add(m[1]);
  return [...out];
}

/** The sign-in page's own chunk and everything it imports statically (from the build manifest). */
export function signInPageAssets(manifestPath, page = 'src/pages/LoginPage.tsx') {
  if (!existsSync(manifestPath)) return [];
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const out = new Set();
  const walk = key => {
    const chunk = manifest[key];
    if (!chunk || out.has(`/${chunk.file}`)) return;
    out.add(`/${chunk.file}`);
    for (const css of chunk.css ?? []) out.add(`/${css}`);
    for (const dep of chunk.imports ?? []) walk(dep);
  };
  walk(page);
  return [...out];
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (!existsSync(resolve(DIST, 'index.html'))) { console.error('dist/index.html not found — run npm run build first'); process.exit(2); }
  const html = readFileSync(resolve(DIST, 'index.html'), 'utf8');
  // The start-up language is fetched before the app renders (i18n/config.ts):
  // count English, the default and the fallback every language loads too.
  const manifestPath = resolve(DIST, '.vite/manifest.json');
  const startupLocale = existsSync(manifestPath)
    ? Object.entries(JSON.parse(readFileSync(manifestPath, 'utf8'))).find(([src]) => src.endsWith('src/i18n/locales/en.json'))?.[1]?.file
    : undefined;
  // Batch 547: main.tsx loads startApp.tsx (the app) once config.json is read, so it is part of the first load too.
  const assets = [...new Set([...firstLoadAssets(html), ...(startupLocale ? [`/${startupLocale}`] : []), ...signInPageAssets(manifestPath, 'src/startApp.tsx'), ...signInPageAssets(manifestPath)])];
  if (!startupLocale) console.warn('No build manifest: the start-up language chunk is not counted.');
  const rows = assets.map(p => {
    const buf = readFileSync(resolve(DIST, `.${p}`));
    return { path: p, raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length };
  }).sort((a, b) => b.gzip - a.gzip);
  const total = rows.reduce((s, r) => s + r.gzip, 0);
  const mb = n => (n / 1024 / 1024).toFixed(2);
  if (args.includes('--json')) console.log(JSON.stringify({ totalGzipBytes: total, targetMb, files: rows }, null, 2));
  else {
    console.log(`First load: ${mb(total)} MB gzipped across ${rows.length} files (target ${targetMb} MB)`);
    for (const r of rows.slice(0, 12)) console.log(`  ${mb(r.gzip).padStart(6)} MB  ${r.path}`);
  }
  if (total > targetMb * 1024 * 1024) { console.error(`Over the ${targetMb} MB first-load target.`); process.exit(1); }
}
