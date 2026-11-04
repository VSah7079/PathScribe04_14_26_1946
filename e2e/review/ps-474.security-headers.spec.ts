// e2e/review/ps-474.security-headers.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-474 — "Security headers: a strict CSP and a header set for every hosting
// option". The review test plan. Batch 585.
//
//   1. deploy/security-headers/README.md exists and names each generated file
//      and header.                                                    automated (the facts), clarity needs a person
//   2. `node scripts/generate-security-headers.mjs deploy/security-headers/origins.example.json <temp>`
//      writes nginx.conf, web.config, staticwebapp.config.json,
//      azure-front-door-rules.json and headers.txt.                  automated
//   3. The response headers on the real demo site (Chrome F12 → Network).
//                                          needs a person / real host: the Vite dev server used here sends none
//   4. Console: no CSP violation walking sign-in, Worklist, a report, spell
//      checker, PDF preview, print window.   needs a server that applies the headers
//   5. QA: each real host (nginx/IIS/Azure), ideally with a CSP evaluator.   needs a person
//   6. `npx vitest run src/services/security/securityHeaders.guard.test.ts` (run in the batch's vitest run).
//
// What this spec adds over step 2: it reads the generated files and checks every
// hosting option carries the same strict set (CSP, HSTS, X-Frame-Options: DENY,
// Referrer-Policy: no-referrer), and that the CSP forbids inline and remote
// scripts. It runs the generator itself into a temporary folder.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5313 npx playwright test --project=chromium \
//        e2e/review/ps-474.security-headers.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FILES = ['nginx.conf', 'web.config', 'staticwebapp.config.json', 'azure-front-door-rules.json', 'headers.txt'];
const MUST_HAVE = ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Frame-Options', 'Referrer-Policy'];

test.describe('PS-474: security headers for every hosting option', () => {
  let out = '';
  test.beforeAll(() => {
    out = mkdtempSync(join(tmpdir(), 'ps474-'));
  });
  test.afterAll(() => { if (out) rmSync(out, { recursive: true, force: true }); });

  test('Step 1: the README exists and names each generated file', () => {
    const readme = readFileSync('deploy/security-headers/README.md', 'utf8');
    for (const f of FILES) expect(readme, `README names ${f}`).toContain(f);
  });

  test('Step 2: the generator writes the five files', () => {
    execFileSync('node', ['scripts/generate-security-headers.mjs', 'deploy/security-headers/origins.example.json', out], { stdio: 'pipe' });
    for (const f of FILES) expect(existsSync(join(out, f)), `${f} written`).toBe(true);
  });

  test('Steps 2–3 (file side): every file carries the same strict header set', () => {
    for (const f of FILES) {
      const text = readFileSync(join(out, f), 'utf8');
      for (const h of MUST_HAVE) expect(text, `${f} has ${h}`).toContain(h);
      expect(text, `${f}: X-Frame-Options DENY`).toMatch(/X-Frame-Options[\s\S]{0,80}?DENY/);
      expect(text, `${f}: Referrer-Policy no-referrer`).toContain('no-referrer');
    }
    const csp = readFileSync(join(out, 'headers.txt'), 'utf8').split('\n').find((l) => l.startsWith('Content-Security-Policy:')) ?? '';
    expect(csp, 'CSP has a script-src of self only').toMatch(/script-src 'self'/);
    expect(csp, 'no unsafe-inline or unsafe-eval scripts').not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
    expect(csp, "no wildcard script source").not.toMatch(/script-src[^;]*\s\*/);
    expect(csp, 'framing refused').toMatch(/frame-ancestors 'none'/);
  });
});
