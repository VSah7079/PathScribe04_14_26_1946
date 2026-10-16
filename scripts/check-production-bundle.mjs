#!/usr/bin/env node
// scripts/check-production-bundle.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Batch 527 (PS-486): checks a server build before it ships. Since Batch 547
// a server build is `vite build --mode server` (npm run build:server); the API
// address comes from config.json at start-up, not from the build.
//
//   1. No demo or developer screen is in it: the mock interface engine, the
//      mock EMR and WSI viewer, the demo reset. Fails if any is.
//   2. The mock services and their seed data. Today every service is still a
//      mock (the HTTP services come with the API server, PS-539), so these are
//      listed, not failed. With --require-no-mocks (Stage 2, once the HTTP
//      services exist) any mock module fails the check.
//
//   npm run build:server        (vite build --mode server: no demo tools; the API address comes from config.json)
//   npm run check:production [-- --dist <dir>] [-- --require-no-mocks]
//
// The first-load size is checked by measure-first-load.mjs (1 MB).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Source modules that must never be in a server build. */
export const DEMO_TOOL_MODULES = [
  'src/pages/MockInterfaceEnginePage/MockInterfaceEnginePage.tsx',
  'src/pages/MockEMRPage.tsx',
  'src/pages/MockWsiViewerPage.tsx',
  'src/components/Config/System/DemoResetTab.tsx',
  // Batch 547: the demo sign-in accounts (known passwords).
  'src/services/auth/demo/demoAccounts.ts',
];

/** What the build manifest says is in the bundle (pure). */
export function inspectManifest(manifest) {
  const sources = Object.values(manifest).map(c => c.src).filter(Boolean);
  return {
    demoTools: DEMO_TOOL_MODULES.filter(m => sources.includes(m)),
    mockModules: sources.filter(s => /(^|\/)mock[A-Z][^/]*\.(ts|tsx)$/.test(s)).sort(),
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const dist = resolve(ROOT, args.includes('--dist') ? args[args.indexOf('--dist') + 1] : 'dist');
  const manifestPath = resolve(dist, '.vite/manifest.json');
  if (!existsSync(manifestPath)) { console.error(`${manifestPath} not found — run npm run build:server first`); process.exit(2); }
  const { demoTools, mockModules } = inspectManifest(JSON.parse(readFileSync(manifestPath, 'utf8')));
  let failed = false;
  if (demoTools.length) {
    failed = true;
    console.error('Demo or developer screens are in this build (was it built with npm run build:server?):');
    for (const m of demoTools) console.error(`  ${m}`);
  } else console.log('No demo or developer screens in this build.');
  if (mockModules.length) {
    const msg = `${mockModules.length} mock service modules are chunks of their own in this build, and more are inside shared chunks (the HTTP services replace them, PS-539).`;
    if (args.includes('--require-no-mocks')) { failed = true; console.error(msg); for (const m of mockModules) console.error(`  ${m}`); }
    else console.log(`${msg} Listed, not failed, until --require-no-mocks.`);
  }
  process.exit(failed ? 1 : 0);
}
