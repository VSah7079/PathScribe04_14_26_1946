// e2e/review/ps-470.lint-cleanup.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-470 — "Lint clean-up: ESLint to zero errors and warnings". The review test
// plan. Batch 587. These are checks of files and commands, not of a screen.
//
//   1. `npm run lint` reports 0 problems.   CLI, not part of this spec (it takes
//      minutes); run by hand at the batch and recorded in the evidence file.
//   2. .eslintrc.cjs: the two rules switched off each have a written reason.   automated
//   3. `npx vitest run src/services/typeSafety/explicitAny.guard.test.ts` passes.   automated
//   4. Spot-check two fixed bugs in the app (QA trend charts by the facility's time
//      zone; a patient born 1 Jan 2001 is 25 on 31 Dec 2026 on the printed report).
//                                  needs a person: a printed report and a seeded patient
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5331 npx playwright test --project=chromium \
//        e2e/review/ps-470.lint-cleanup.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

test.describe('PS-470: lint clean-up', () => {
  test('Step 2: the two rules switched off each have a written reason', () => {
    const cfg = readFileSync('.eslintrc.cjs', 'utf8');
    const block = cfg.slice(cfg.indexOf('Rules switched off, and why'));
    // Each switched-off rule is named in the explanation above the rules, with a reason after it.
    expect(block, 'no-explicit-any is explained').toMatch(/@typescript-eslint\/no-explicit-any:[^\n]*\n(\/\/[^\n]*\n)*/);
    expect(block, 'the ratchet that replaces it is named').toContain('explicitAny.guard.test.ts');
    expect(block, 'react-refresh/only-export-components is explained').toMatch(/react-refresh\/only-export-components:[^\n]*\n\s*\/\/[^\n]+/);
    expect(block, 'and both are really off').toMatch(/'@typescript-eslint\/no-explicit-any': 'off'/);
    expect(block).toMatch(/'react-refresh\/only-export-components': 'off'/);
  });

  test('Step 3: the explicit-any ratchet passes', () => {
    test.setTimeout(240_000);
    const out = execFileSync('npx', ['vitest', 'run', 'src/services/typeSafety/explicitAny.guard.test.ts'], { encoding: 'utf8', stdio: 'pipe' });
    expect(out).toMatch(/Test Files\s+1 passed/);
  });
});
