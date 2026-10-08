// src/services/security/envExposure.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 444: no key or password reaches the browser bundle.
//
// Anything Vite exposes as `import.meta.env.VITE_…` is copied into the
// JavaScript every visitor downloads. Two ways that went wrong:
//
//   1. The top bar's System Info check called api.anthropic.com from the
//      browser with VITE_AI_API_KEY, and the AI settings screen and providers
//      had a "dev mode" that did the same, so a key had to be in the bundle.
//   2. A handful of files read `import.meta.env` as a whole object
//      (`(import.meta as any).env?.X`, `import.meta.env[name]`, or passing
//      `import.meta.env` to a function). Vite can't know which variable is
//      meant, so it copied EVERY VITE_ variable in .env into the bundle —
//      a production build was found carrying the demo passwords.
//
// The rules, on code (comments stripped), outside test files:
//   • every `import.meta.env` read names its variable: `import.meta.env.X`;
//   • no VITE_ variable whose name says key, secret, password or token,
//     except the ones listed below with the reason;
//   • no request straight to an AI vendor's host; the proxy routes are used;
//   • no key header set in the browser (x-api-key, api-key, x-goog-api-key).
// Keys live server-side: vite.config.ts in development, the PathScribe API
// server in production (docs/architecture/AI_PROXY.md).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
const isSource = (name: string) => /\.(tsx?|jsx?)$/.test(name) && !/\.test\.(tsx?|jsx?)$/.test(name) && !/\.auditTest\.ts$/.test(name);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) return name === 'node_modules' ? [] : walk(full);
    return isSource(name) ? [full] : [];
  });
}

const FILES = walk(SRC).map(f => ({ rel: relative(SRC, f).split(sep).join('/'), text: code(readFileSync(f, 'utf8')) }));

/** VITE_ variables that look secret but are judged safe to ship, with why. */
const ALLOWED_SECRET_NAMES: Record<string, string> = {
  VITE_NCBI_API_KEY: 'raises the public PubMed rate limit only; no billing, no data access (services/research/README.md)',
};

/** Whole name segments only, so VITE_AI_MAX_TOKENS (a number) isn't a token. */
const SECRET_SEGMENTS = new Set(['KEY', 'SECRET', 'PASS', 'PASSWORD', 'TOKEN', 'APIKEY']);
const looksSecret = (name: string) => name.split('_').some(seg => SECRET_SEGMENTS.has(seg));

const offenders = (test: (text: string) => boolean) => FILES.filter(f => test(f.text)).map(f => f.rel).sort();

describe('no key or password in the browser bundle', () => {
  it('finds source files (guards the guard)', () => {
    expect(FILES.length).toBeGreaterThan(500);
    expect(FILES.some(f => f.rel === 'services/auth/authSessionInstance.ts')).toBe(true);
  });

  it('every import.meta.env read names its variable', () => {
    const whole = /import\.meta\.env(?!\.[A-Za-z_])|\(\s*import\.meta\s+as\b/;
    expect(offenders(t => whole.test(t))).toEqual([]);
  });

  it('no VITE_ variable named like a key, secret, password or token', () => {
    const found = new Set<string>();
    for (const f of FILES) {
      for (const m of f.text.matchAll(/\bVITE_[A-Z0-9_]+\b/g)) {
        if (looksSecret(m[0]) && !ALLOWED_SECRET_NAMES[m[0]]) found.add(`${f.rel}: ${m[0]}`);
      }
    }
    expect([...found].sort()).toEqual([]);
  });

  it('the env typings declare no such variable either', () => {
    const typings = readFileSync(resolve(SRC, 'vite-env.d.ts'), 'utf8');
    const declared = [...typings.matchAll(/readonly\s+(VITE_[A-Z0-9_]+)/g)].map(m => m[1]);
    expect(declared.filter(n => looksSecret(n) && !ALLOWED_SECRET_NAMES[n])).toEqual([]);
  });

  it('no request straight to an AI vendor', () => {
    const vendor = /['"`]https?:\/\/(?:api\.anthropic\.com|generativelanguage\.googleapis\.com|api\.openai\.com)/;
    expect(offenders(t => vendor.test(t))).toEqual([]);
  });

  it('no key header set in the browser', () => {
    const header = /['"](?:x-api-key|api-key|x-goog-api-key)['"]\s*\]?\s*[:=,]/i;
    expect(offenders(t => header.test(t))).toEqual([]);
  });

  it('the stored AI settings carry no key', () => {
    const config = FILES.find(f => f.rel === 'components/Config/AI/aiProviderConfig.ts');
    expect(config?.text).not.toMatch(/^\s*apiKey\??:/m);
  });
});
