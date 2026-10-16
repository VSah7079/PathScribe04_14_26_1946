// src/services/runtimeConfig/runtimeConfig.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 547 (PS-539 phase 2d): one build serves every deployment, so its
// settings must come through appEnv() (config.json over the build's value).
//   - No code reads a VITE_ variable straight from import.meta.env except
//     runtimeEnv.ts (the one place) and main.tsx (to start).
//   - runtimeEnv.ts names every typed VITE_ variable, and the settings list
//     is the same set less the two that stay with the build.
//   - main.tsx loads config.json before any other part of the app.
//   - The example config.json is a valid server configuration.
//   - Every address config.json can set is one the security headers generator
//     can add to the Content-Security-Policy, and only those.
//   - runtimeConfig/ imports nothing that reads settings when it loads.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUNTIME_SETTINGS, parseRuntimeConfig } from './runtimeSettings';
import { RUNTIME_CONFIG_ORIGIN_KEYS, contentSecurityPolicy, originsWithRuntimeConfig } from '../../../deploy/security-headers/securityHeaders.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ROOT = resolve(SRC, '..');
const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
const walk = (d: string): string[] => readdirSync(d).flatMap(n => {
  const f = resolve(d, n);
  return statSync(f).isDirectory() ? walk(f) : /\.(tsx?)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [f] : [];
});
const files = walk(SRC).map(f => ({ rel: relative(SRC, f).split(sep).join('/'), text: code(readFileSync(f, 'utf8')) }));
const declared = [...readFileSync(resolve(SRC, 'vite-env.d.ts'), 'utf8').matchAll(/readonly\s+(VITE_[A-Z0-9_]+)\?/g)].map(m => m[1]).sort();
const BUILD_ONLY = ['VITE_APP_VERSION', 'VITE_BABAKHANI_EMAIL'];

describe('runtime configuration (Batch 547)', () => {
  it('every deployment setting is read through appEnv(), never straight from the build', () => {
    const allowed = new Set(['services/runtimeConfig/runtimeEnv.ts', 'main.tsx']);
    const offenders = files.filter(f => !allowed.has(f.rel) && /import\.meta\.env\.VITE_/.test(f.text)).map(f => f.rel);
    expect(offenders).toEqual([]);
  });

  it('runtimeEnv.ts names every typed VITE_ variable', () => {
    const env = files.find(f => f.rel === 'services/runtimeConfig/runtimeEnv.ts')!.text;
    const named = [...env.matchAll(/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g)].map(m => m[1]);
    expect([...new Set(named)].sort()).toEqual(declared);
  });

  it('config.json may set every typed variable except the build\'s own version and the demo account', () => {
    expect(Object.keys(RUNTIME_SETTINGS).sort()).toEqual(declared.filter(k => !BUILD_ONLY.includes(k)));
  });

  it('main.tsx reads config.json before loading the app (no other part of the app is imported up front)', () => {
    const main = files.find(f => f.rel === 'main.tsx')!.text;
    const staticImports = [...main.matchAll(/^import\s.*?from\s+'([^']+)'/gm)].map(m => m[1]);
    expect(staticImports.every(p => p.startsWith('./services/runtimeConfig/'))).toBe(true);
    expect(main).toMatch(/await import\('\.\/startApp'\)/);
    expect(main.indexOf('loadRuntimeConfig(')).toBeLessThan(main.indexOf("import('./startApp')"));
  });

  it('the example config.json is a valid server configuration', () => {
    const example = JSON.parse(readFileSync(resolve(ROOT, 'deploy/runtime-config/config.example.json'), 'utf8'));
    expect(parseRuntimeConfig(example, { demoBuild: false }).problems).toEqual([]);
  });

  it('every address config.json can set is added to the CSP by the generator, and nothing else is', () => {
    const addressKeys = Object.entries(RUNTIME_SETTINGS).filter(([, v]) => v.kind !== 'text').map(([k]) => k).sort();
    expect([...new Set([...RUNTIME_CONFIG_ORIGIN_KEYS.connect, ...RUNTIME_CONFIG_ORIGIN_KEYS.hub])].sort()).toEqual(addressKeys);
    const csp: string = contentSecurityPolicy(originsWithRuntimeConfig({}, {
      VITE_API_BASE_URL: 'https://ps.example/api', VITE_LIVE_UPDATES_HUB_URL: 'https://hub.example/hubs/live',
      VITE_AUTH_MICROSOFT_AUTHORITY: 'https://login.microsoftonline.com/t', VITE_AI_PROXY_URL: '/api/ai',
    }));
    expect(csp).toContain('https://ps.example');
    expect(csp).toContain('wss://hub.example');
    expect(csp).toMatch(/form-action [^;]*https:\/\/login\.microsoftonline\.com/);
    expect(csp).not.toContain('/api/ai');
  });

  it('runtimeConfig/ imports only its own files at run time, so the start-up loads nothing else', () => {
    for (const f of files.filter(x => x.rel.startsWith('services/runtimeConfig/'))) {
      const imports = [...f.text.matchAll(/^import\s+(?!type\b)[^'"]*from\s+'([^']+)'/gm)].map(m => m[1]);
      expect(imports.filter(p => !p.startsWith('./')), f.rel).toEqual([]);
    }
  });
});
