// e2e/review/ps-327.signing-authority-overrides.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-327 — "Wire per-lab signing-authority overrides (authorityOverrides) into
// real finalize/countersign enforcement". The review test plan. Batch 587.
//
//   7. `npx vitest run` on the three named test files: all pass.        automated
//   1–6. Override a type for one lab, resident sign-out released for countersign,
//        consultant refused / primary allowed on a cytology case, the PAD refused
//        without a medicolegal appointment and signed with one, labs with no
//        override unchanged.   needs a person (several users, signing passwords)
//        — carried forward to Batch 588.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5331 npx playwright test --project=chromium \
//        e2e/review/ps-327.signing-authority-overrides.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const FILES = [
  'src/services/cases/resolveResidentCountersignRequired.test.ts',
  'src/services/auth/caseAccessControl.test.ts',
  'src/pages/SynopticReportPage/hooks/__tests__/useSignOutWorkflow.test.ts',
];

test.describe('PS-327: per-lab signing-authority overrides', () => {
  test('Step 7: the three named test files exist and all their tests pass', () => {
    test.setTimeout(240_000);
    for (const f of FILES) expect(existsSync(f), `${f} exists`).toBe(true);
    const out = execFileSync('npx', ['vitest', 'run', ...FILES], { encoding: 'utf8', timeout: 220_000 });
    expect(out, 'three files passed').toMatch(/Test Files\s+3 passed/);
    expect(out, 'no failures').not.toMatch(/failed/i);
  });
});
